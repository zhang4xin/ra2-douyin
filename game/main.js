'use strict';

// 游戏主循环：装配状态/输入/AI/渲染，驱动 rAF 循环。

const C = require('./config');
const S = require('./state');
const AI = require('./ai');
const UI = require('./ui');
const R = require('./render');
const { createInputController } = require('./input');

function createMain(adapter, canvas, ctx) {
  let state = freshState();

  function freshState() {
    const s = S.createGame({});
    s.toast = { msg: '', t: 0, dur: 1600 };
    return s;
  }

  function toast(msg) {
    state.toast = { msg, t: 0, dur: 1600 };
  }

  function log(msg) {
    console.log('[game]', msg);
  }

  function restart() {
    state = freshState();
    state.toast = { msg: '新战局开始', t: 0, dur: 1400 };
    log('新战局开始');
  }

  function getState() {
    return state;
  }

  function getLayout() {
    return UI.layout(canvas.width, canvas.height);
  }

  const ctrl = createInputController({ getState, getLayout, toast, log, restart });

  function onEvent(ev) {
    const fn = {
      mousedown: ctrl.onMouseDown.bind(ctrl),
      mousemove: ctrl.onMouseMove.bind(ctrl),
      mouseup: ctrl.onMouseUp.bind(ctrl),
      click: ctrl.onClick.bind(ctrl),
      contextmenu: ctrl.onContextMenu.bind(ctrl),
      wheel: ctrl.onWheel.bind(ctrl),
    }[ev.type];
    if (fn) fn(ev);
  }

  adapter.bindTouch(onEvent);

  let last = 0;

  function frame(t) {
    const dt = last ? Math.min(50, t - last) : 16;
    last = t;
    S.update(state, dt);
    AI.updateAI(state, dt);
    if (state.toast) state.toast.t += dt;
    const l = UI.layout(canvas.width, canvas.height);
    R.draw(state, ctx, l);
    if (adapter.global.requestAnimationFrame) {
      adapter.global.requestAnimationFrame(frame);
    }
  }

  function start() {
    const l = UI.layout(canvas.width, canvas.height);
    R.draw(state, ctx, l);
    console.log(`[game] ${C.GAME_NAME} v${C.GAME_VERSION} 启动 canvas=${canvas.width}x${canvas.height}`);
    adapter.global.requestAnimationFrame(frame);
  }

  return { start, restart };
}

module.exports = { createMain };
