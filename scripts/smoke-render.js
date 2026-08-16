'use strict';

// 无头冒烟测试：用 mock-tt 跑通「渲染 + 输入 + 主循环」全链路（横屏 + 竖屏两种布局）。
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

const ev = (type, clientX, clientY) => ({
  type,
  clientX,
  clientY,
  button: 0,
  preventDefault() {},
  stopPropagation() {},
});

function smokeOnce(w, h, label) {
  const tt = createMockTT({ width: w, height: h });
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
  const l = getLayout();

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

  function freeSpot(ww, hh) {
    for (let gy = 0; gy <= C.MAP_ROWS - hh; gy++) {
      for (let gx = 0; gx <= C.MAP_COLS - ww; gx++) {
        if (S.rectFits(state, gx, gy, ww, hh, C.TEAM.P)) return { gx, gy };
      }
    }
    return null;
  }

  function screenOf(gx, gy) {
    const l = getLayout();
    return UI.toScreen(l, (gx + 0.5) * C.TILE, (gy + 0.5) * C.TILE);
  }

  function tapCenter(rect) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctrl.onMouseDown(ev('mousedown', cx, cy));
    ctrl.onMouseUp(ev('mouseup', cx, cy));
    ctrl.onClick(ev('click', cx, cy));
  }

  function tapTab(id) {
    const t = l.tabs.find((x) => x.id === id);
    if (!t) throw new Error(label + ' 找不到页签 ' + id);
    tapCenter(t.rect);
  }

  function tapCell(id) {
    const c = l.cells.find((x) => x.id === id);
    if (!c) throw new Error(label + ' 找不到格子 ' + id);
    tapCenter(c.rect);
  }

  frame(16);
  console.log(`[smoke] ${label} 初始渲染 OK`);

  // 建造兵营（默认「建筑」页签）
  tapCell('build:barracks');
  const sp = freeSpot(2, 2);
  const spPos = screenOf(sp.gx, sp.gy);
  ctrl.onMouseMove(ev('mousemove', spPos.x, spPos.y));
  ctrl.onMouseUp(ev('mouseup', spPos.x, spPos.y));
  ctrl.onClick(ev('click', spPos.x, spPos.y));
  if (!state.ents.some((e) => e.type === 'barracks' && e.team === C.TEAM.P)) throw new Error(label + ' 兵营建造失败');
  console.log(`[smoke] ${label} 建造兵营 OK`);

  // 切到「兵种」页签并生产步兵
  tapTab('tab:unit');
  if (state.panelTab !== 'unit') throw new Error(label + ' 页签切换失败');
  tapCell('unit:infantry');
  run(4000);
  const units = state.ents.filter((e) => e.kind === 'unit' && e.team === C.TEAM.P);
  if (!units.length) throw new Error(label + ' 步兵未产出');
  console.log(`[smoke] ${label} 生产步兵 OK`);

  // 框选己方单位
  const u = units[0];
  const us = screenOf(Math.floor(u.x / C.TILE), Math.floor(u.y / C.TILE));
  ctrl.onMouseDown(ev('mousedown', us.x - 40, us.y - 40));
  ctrl.onMouseMove(ev('mousemove', us.x + 40, us.y + 40));
  ctrl.onMouseUp(ev('mouseup', us.x + 40, us.y + 40));
  if (state.selection.length !== 1) throw new Error(label + ' 框选失败, selection=' + state.selection.length);
  console.log(`[smoke] ${label} 框选 OK`);

  // 右键攻击敌方基地
  const eBase = state.ents.find((e) => e.kind === 'building' && e.team === C.TEAM.E && e.type === 'base');
  const ePos = screenOf(eBase.gx + 1, eBase.gy + 1);
  ctrl.onContextMenu(ev('contextmenu', ePos.x, ePos.y));
  run(10000);
  console.log(`[smoke] ${label} 攻击指令 OK`);

  // 渲染更多帧（覆盖敌方出兵/死亡/胜负路径）
  run(60000);
  console.log(`[smoke] ${label} 长时间渲染 OK`);

  // 重开
  state.over = { winner: C.TEAM.P };
  frame(16);
  ctrl.onClick(ev('click', 10, 10));
  if (state.over) throw new Error(label + ' 重开失败');
  console.log(`[smoke] ${label} 重开 OK`);
}

smokeOnce(852, 393, '横屏');
smokeOnce(393, 852, '竖屏');
console.log('[smoke] 全部通过');
