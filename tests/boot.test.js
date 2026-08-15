'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { createMockTT } = require('./mock-tt');

test('game.js 在 mock tt 下可无异常加载（骨架冒烟）', () => {
  global.tt = createMockTT({ width: 1280, height: 720 });
  global.__RA2WEB_CONFIG__ = undefined;

  const entry = path.resolve(__dirname, '../game.js');
  delete require.cache[entry];
  assert.doesNotThrow(() => require(entry));
});

test('adapter 模块可独立装配', () => {
  const { createAdapter } = require('../adapter/index');
  const tt = createMockTT({ width: 1280, height: 720 });
  const adapter = createAdapter(tt);
  assert.ok(adapter.config);
  assert.ok(adapter.viewport);
  assert.ok(adapter.synthesizer);
  assert.ok(adapter.eventTarget);
  assert.strictEqual(adapter.config.mode.singlePlayer, true);
});

test('GlobalScope 聚合 window/document 语义', () => {
  const { createGlobalScope } = require('../adapter/core/GlobalScope');
  const scope = createGlobalScope(createMockTT({ width: 800, height: 600 }));
  assert.strictEqual(scope.GameGlobal, scope);
  assert.strictEqual(scope.globalThis, scope);
  assert.strictEqual(scope.screen.width, 800);
  assert.ok(typeof scope.requestAnimationFrame === 'function');
});
