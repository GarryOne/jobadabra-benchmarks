// Nanobrowser (open-source Chrome extension agent, Apache-2.0, pinned release v0.2.0 unpacked in NANOBROWSER_DIR) in the bake-off's own guarded browser.
// Same shape as lib/browser.mjs: fresh profile, 1200x818, the Submit guard on the context. Glue, all here: (1) a copy of the release whose Anthropic client points at our metering pass-through
// (lib/anthropic-proxy.mjs, passThrough: the extension's own requests are untouched; the real key never enters the extension), (2) its settings seeded into chrome.storage.local
// (provider, Sonnet 5.5 for planner and navigator, max 40 steps), (3) the task started the way its side panel does, over the 'side-panel-connection' port.
import {chromium} from 'playwright';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {installGuard} from './guard.mjs'; import {startAnthropicProxy} from './anthropic-proxy.mjs'; import {VIEWPORT} from './browser.mjs';

export const NB_DIR = process.env.NANOBROWSER_DIR || path.join(process.env.HOME, 'bakeoff-tools', 'nb-0.2.0');
const MODEL = 'claude-sonnet-5-5', MARK = 'headers:{"anthropic-dangerous-direct-browser-access":`true`}';

// -> {context, page, proxy, guard, run(task, {maxMs}), close}
export async function startNanobrowser({key, guardLog, navAllow = null, maxSteps = 40} = {}) {
  const proxy = await startAnthropicProxy(key, {passThrough: true});
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeoff-nb-')); fs.cpSync(NB_DIR, copy, {recursive: true});
  const bg = path.join(copy, 'background.js'), code = fs.readFileSync(bg, 'utf8');
  if (!code.includes(MARK)) throw new Error('Nanobrowser bundle changed: the Anthropic client marker is gone (pin: v0.2.0)');
  fs.writeFileSync(bg, code.replace(MARK, `baseURL:${JSON.stringify(proxy.url)},${MARK}`));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeoff-nbprofile-'));
  const context = await chromium.launchPersistentContext(profile, {headless: false, viewport: VIEWPORT, locale: 'en-US', ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--headless=new', `--disable-extensions-except=${copy}`, `--load-extension=${copy}`, '--no-first-run', '--no-default-browser-check']});
  const guard = await installGuard(context, {log: guardLog, localPorts: [Number(new URL(proxy.url).port)], navAllow});
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', {timeout: 30000});
  const id = new URL(worker.url()).host;
  await worker.evaluate(async ({model, maxSteps}) => chrome.storage.local.set({
    'llm-api-keys': {providers: {anthropic: {apiKey: 'held-by-the-pass-through', name: 'Anthropic', type: 'anthropic', modelNames: [model], createdAt: Date.now()}}},
    'agent-models': {agents: {planner: {provider: 'anthropic', modelName: model}, navigator: {provider: 'anthropic', modelName: model}}},
    'general-settings': {maxSteps, maxActionsPerStep: 5, maxFailures: 3, useVision: false, useVisionForPlanner: false, planningInterval: 3, displayHighlights: false, minWaitPageLoad: 250, replayHistoricalTasks: false},
  }), {model: MODEL, maxSteps});
  const page = context.pages()[0] || await context.newPage();
  // Runs one task on the form tab, as the side panel does; resolves with the executor's events (the last one is task.ok / task.fail / task.cancel) or a timeout.
  const run = async (task, {maxMs = 8 * 60 * 1000} = {}) => {
    const panel = await context.newPage(); await panel.goto(`chrome-extension://${id}/sidepanel.html`); await page.bringToFront();
    const tabId = await panel.evaluate(async () => (await chrome.tabs.query({})).find(t => /^https?:/.test(t.url || ''))?.id);
    await panel.evaluate(({task, tabId}) => { window.__events = []; const port = chrome.runtime.connect({name: 'side-panel-connection'}); window.__port = port; port.onMessage.addListener(m => window.__events.push(m)); setInterval(() => port.postMessage({type: 'heartbeat'}), 5000); port.postMessage({type: 'new_task', task, taskId: 'bakeoff-1', tabId}); }, {task, tabId});
    const started = Date.now(); let events = [];
    while (Date.now() - started < maxMs) {
      events = await panel.evaluate(() => window.__events).catch(() => events);
      if (events.some(e => ['task.ok', 'task.fail', 'task.cancel'].includes(e.state)) || events.some(e => e.type === 'error')) break;
      await new Promise(r => setTimeout(r, 1500));
    }
    return {events, timedOut: Date.now() - started >= maxMs, tabId};
  };
  return {context, page, proxy, guard, run, close: async () => { await context.close().catch(() => {}); proxy.close(); fs.rmSync(profile, {recursive: true, force: true}); fs.rmSync(copy, {recursive: true, force: true}); }};
}
