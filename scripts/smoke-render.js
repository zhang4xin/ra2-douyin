'use strict';

// 无头冒烟测试：用 mock-tt 跑通「渲染 + 输入 + 主循环」全链路。
// 目的是在真机/开发者工具前兜住渲染与输入层的低级错误。
// 用法：node scripts/smoke-render.js

const { createMockTT } = require('../tests/mock-tt');
const { createAdapter } = require('../adapter/index');
const C = require('../game/config');
const S = require('../game/state');
const AI = require('../game/ai');
const UI = require('../game/ui');
const R = require('../game/render');
const { createInputController } = require('../game/input');

const tt = createMockTT({ width: 852, height: 393 });
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');
const adapter = createAdapter(tt);

let state = S.createGame({ seed: 7 });
state.toast = { msg: '', t: 0, dur: 1600 };
const toast = (msg) => (state.toast = { msg, t: 0, dur: 1600 });
const log = () => {};
const restart = () => {
  state = S.createGame({ seed: Date.now() & 0xffff });
  state.toast = { msg: '', t: 0, dur: 1600 };
};
const getState = () => state;
const getLayout = () => UI.layout(canvas.width, canvas.height);
const ctrl = createInputController({ getState, getLayout, toast, log, restart });

const ev = (type, clientX, clientY) => ({
  type,
  clientX,
  clientY,
  button: 0,
  preventDefault() {},
  stopPropagation() {},
});

function frame(dt) {
  S.update(state, dt);
  AI.updateAI(state, dt);
  if (state.toast) state.toast.t += dt;
  R.draw(state, ctx, getLayout());
}

function run(ms) {
  let t = 0;
  while (t < ms) {
    frame(16);
    t += 16;
  }
}

function freeSpot(w, h) {
  for (let gy = 0; gy <= C.MAP_ROWS - h; gy++) {
    for (let gx = 0; gx <= C.MAP_COLS - w; gx++) {
      if (S.rectFits(state, gx, gy, w, h, C.TEAM.P)) return { gx, gy };
    }
  }
  return null;
}

function screenOf(gx, gy) {
  const l = getLayout();
  return UI.toScreen(l, (gx + 0.5) * C.TILE, (gy + 0.5) * C.TILE);
}

function tapButton(id) {
  const l = getLayout();
  const b = l.btns.find((x) => x.id === id);
  if (!b) throw new Error('找不到按钮 ' + id);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  ctrl.onMouseDown(ev('mousedown', cx, cy));
  ctrl.onMouseUp(ev('mouseup', cx, cy));
  ctrl.onClick(ev('click', cx, cy));
}

frame(16);
console.log('[smoke] 初始渲染 OK');

// 建造兵营
tapButton('build:barracks');
const sp = freeSpot(2, 2);
const spPos = screenOf(sp.gx, sp.gy);
ctrl.onMouseMove(ev('mousemove', spPos.x, spPos.y));
ctrl.onMouseUp(ev('mouseup', spPos.x, spPos.y));
ctrl.onClick(ev('click', spPos.x, spPos.y));
if (!state.ents.some((e) => e.type === 'barracks' && e.team === C.TEAM.P)) throw new Error('兵营建造失败');
console.log('[smoke] 建造兵营 OK');

// 生产步兵
tapButton('unit:infantry');
run(4000);
const units = state.ents.filter((e) => e.kind === 'unit' && e.team === C.TEAM.P);
if (!units.length) throw new Error('步兵未产出');
console.log('[smoke] 生产步兵 OK');

// 框选己方单位
const u = units[0];
const us = screenOf(Math.floor(u.x / C.TILE), Math.floor(u.y / C.TILE));
ctrl.onMouseDown(ev('mousedown', us.x - 40, us.y - 40));
ctrl.onMouseMove(ev('mousemove', us.x + 40, us.y + 40));
ctrl.onMouseUp(ev('mouseup', us.x + 40, us.y + 40));
if (state.selection.length !== 1) throw new Error('框选失败, selection=' + state.selection.length);
console.log('[smoke] 框选 OK');

// 右键攻击敌方基地
const eBase = state.ents.find((e) => e.kind === 'building' && e.team === C.TEAM.E && e.type === 'base');
const ePos = screenOf(eBase.gx + 1, eBase.gy + 1);
ctrl.onContextMenu(ev('contextmenu', ePos.x, ePos.y));
run(10000);
console.log('[smoke] 攻击指令 OK');

// 渲染更多帧（覆盖敌方出兵/死亡/胜负路径）
run(60000);
console.log('[smoke] 长时间渲染 OK');

// 重开
state.over = { winner: C.TEAM.P };
frame(16);
ctrl.onClick(ev('click', 10, 10));
if (state.over) throw new Error('重开失败');
console.log('[smoke] 重开 OK');

console.log('[smoke] 全部通过');
