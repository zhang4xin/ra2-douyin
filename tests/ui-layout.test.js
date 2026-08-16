'use strict';

// 布局与命中测试：红警风格界面（顶部条 + 底部面板）的几何与页签过滤。

const test = require('node:test');
const assert = require('node:assert');
const UI = require('../game/ui');

test('布局：竖屏底部面板含页签/格子/雷达', () => {
  const l = UI.layout(393, 852);
  assert.ok(l.topH > 0 && l.panelH > 0);
  assert.strictEqual(l.tabs.length, 2);
  assert.strictEqual(l.cells.length, 6);
  assert.ok(l.radar.w > 0 && l.radar.h > 0);
  for (const c of l.cells) {
    assert.ok(c.rect.y + c.rect.h <= l.ch, '格子需在面板内');
    assert.ok(c.rect.x + c.rect.w <= l.cw, '格子需在画布内');
  }
});

test('布局：hitCell 按当前页签过滤', () => {
  const l = UI.layout(393, 852);
  const build = l.cells.find((c) => c.id === 'build:barracks');
  const unit = l.cells.find((c) => c.id === 'unit:infantry');
  const cx = build.rect.x + build.rect.w / 2;
  const cy = build.rect.y + build.rect.h / 2;
  assert.strictEqual(UI.hitCell(l, cx, cy, 'build').id, 'build:barracks');
  assert.strictEqual(UI.hitCell(l, cx, cy, 'unit'), null);
  const ux = unit.rect.x + unit.rect.w / 2;
  const uy = unit.rect.y + unit.rect.h / 2;
  assert.strictEqual(UI.hitCell(l, ux, uy, 'unit').id, 'unit:infantry');
});

test('布局：横屏同样可用', () => {
  const l = UI.layout(852, 393);
  assert.strictEqual(l.tabs.length, 2);
  assert.strictEqual(l.cells.length, 6);
  assert.ok(l.mapX >= -0.01 && l.mapY >= l.topH - 0.01);
});
