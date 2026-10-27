// The pass-through's request shape and the per-call price, for every model a round can use (27 Oct 2026: Haiku 5.5 refused
// Sonnet's thinking setting and Stagehand's run ended in 1 s; a long Haiku call costs 5x).
import test from 'node:test'; import assert from 'node:assert/strict';
import {shapeRequest} from '../lib/anthropic-proxy.mjs'; import {callUsd} from '../lib/models.mjs';

const turn = {role: 'assistant', content: [{type: 'thinking', thinking: 'x'}, {type: 'text', text: 'hi'}]};
for (const [model, thinking] of [['claude-sonnet-5-5', {type: 'between_tools'}], ['claude-haiku-5-5', undefined]]) {
  test(`${model}: thinking ${thinking ? thinking.type : 'not sent'}, old thinking blocks dropped`, () => {
    const j = shapeRequest({model, thinking: {type: 'adaptive'}, output_config: {effort: 'low'}, messages: [structuredClone(turn)]});
    assert.deepEqual(j.thinking, thinking); assert.equal(j.output_config, undefined); assert.deepEqual(j.messages[0].content, [{type: 'text', text: 'hi'}]);
  });
}

test('a Haiku call above 100k input tokens costs 5x, a Sonnet one does not', () => {
  assert.equal(callUsd('claude-haiku-5-5', {input_tokens: 1e6, output_tokens: 0}), 0.5);
  assert.equal(callUsd('claude-haiku-5-5', {input_tokens: 50_000, output_tokens: 1e6}), 0.505);
  assert.equal(callUsd('claude-sonnet-5-5', {input_tokens: 1e6, output_tokens: 0}), 2);
});
