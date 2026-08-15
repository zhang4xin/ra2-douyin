'use strict';

const test = require('node:test');
const assert = require('node:assert');

const ViewportTransform = require('../adapter/core/ViewportTransform');
const EventSynthesizer = require('../adapter/input/EventSynthesizer');

test('ViewportTransform: 等比 letterbox 换算', () => {
  // 逻辑 1024x768，物理 2560x1080（21:9 更宽屏），等比缩放应左右留黑边。
  const vt = new ViewportTransform(1024, 768, 2560, 1080);
  const scale = 1080 / 768; // = 1.40625
  assert.ok(Math.abs(vt.scale - scale) < 1e-6);
  // offsetX = (2560 - 1024*scale)/2 = 560，offsetY = 0
  assert.ok(Math.abs(vt.offsetX - 560) < 1e-3);
  assert.ok(Math.abs(vt.offsetY - 0) < 1e-3);

  // 物理中点 -> 逻辑中点
  const center = vt.toLogical(1280, 540);
  assert.ok(Math.abs(center.x - 512) < 1e-3);
  assert.ok(Math.abs(center.y - 384) < 1e-3);

  // 物理左侧黑边区域 -> null（超出逻辑画布）
  const inBar = vt.toLogical(100, 540);
  assert.strictEqual(inBar, null);
});

test('EventSynthesizer: 单击合成 mousedown/mouseup/click', () => {
  const events = [];
  const es = new EventSynthesizer((ev) => events.push(ev), { vibrate: false });

  const touch = { identifier: 0, clientX: 512, clientY: 384 };
  es.onTouchStart({ touches: [touch], changedTouches: [touch] });
  es.onTouchEnd({ touches: [], changedTouches: [touch] });

  const types = events.map((e) => e.type);
  assert.deepStrictEqual(types, ['mousedown', 'mouseup', 'click']);
  assert.strictEqual(events[0].button, 0);
});

test('EventSynthesizer: 长按合成 contextmenu(button=2)', async () => {
  const events = [];
  const es = new EventSynthesizer((ev) => events.push(ev), {
    vibrate: false,
    longPressMs: 20,
    tapMaxMs: 2000,
  });

  const touch = { identifier: 0, clientX: 100, clientY: 100 };
  es.onTouchStart({ touches: [touch], changedTouches: [touch] });
  await new Promise((r) => setTimeout(r, 40));
  es.onTouchEnd({ touches: [], changedTouches: [touch] });

  assert.ok(events.some((e) => e.type === 'contextmenu' && e.button === 2));
});

test('EventSynthesizer: 拖动合成 mousemove 流 + mouseup', () => {
  const events = [];
  const es = new EventSynthesizer((ev) => events.push(ev), { vibrate: false });

  const touch = { identifier: 0, clientX: 200, clientY: 200 };
  es.onTouchStart({ touches: [touch], changedTouches: [touch] });
  es.onTouchMove({
    touches: [{ identifier: 0, clientX: 240, clientY: 230 }],
    changedTouches: [],
  });
  assert.ok(events.some((e) => e.type === 'mousemove'));
  es.onTouchEnd({ touches: [], changedTouches: [{ identifier: 0, clientX: 240, clientY: 230 }] });
  assert.strictEqual(events[events.length - 1].type, 'mouseup');
});

test('EventSynthesizer: 双击合成 dblclick', () => {
  const events = [];
  const es = new EventSynthesizer((ev) => events.push(ev), { vibrate: false });

  const t1 = { identifier: 1, clientX: 50, clientY: 50 };
  es.onTouchStart({ touches: [t1], changedTouches: [t1] });
  es.onTouchEnd({ touches: [], changedTouches: [t1] });

  const t2 = { identifier: 2, clientX: 52, clientY: 51 };
  es.onTouchStart({ touches: [t2], changedTouches: [t2] });
  es.onTouchEnd({ touches: [], changedTouches: [t2] });

  assert.ok(events.some((e) => e.type === 'dblclick'));
});
