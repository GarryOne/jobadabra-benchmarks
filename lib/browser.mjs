// The one browser every agent drives: Playwright's Chromium, fresh temp profile, 1200x818 window, en-US, remote-debugging port for the agent to attach, the Submit guard on its context.
import {chromium} from 'playwright';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {installGuard} from './guard.mjs';

export const VIEWPORT = {width: 1200, height: 818};
// -> {context, page, cdpUrl, guard, profile, close}. guarded:false is for the proof's positive control only.
export async function startAgentBrowser({guardLog, guarded = true, headless = true, cdpPort = 0, navAllow = null} = {}) {
  const port = cdpPort || 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeoff-profile-'));
  const context = await chromium.launchPersistentContext(profile, {headless, viewport: VIEWPORT, locale: 'en-US', args: [`--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check']});
  const guard = guarded ? await installGuard(context, {log: guardLog, navAllow}) : null;
  const page = context.pages()[0] || await context.newPage();
  return {context, page, cdpUrl: `http://127.0.0.1:${port}`, guard, profile, close: async () => { await context.close().catch(() => {}); fs.rmSync(profile, {recursive: true, force: true}); }};
}
