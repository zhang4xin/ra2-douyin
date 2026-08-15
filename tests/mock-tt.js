'use strict';

// 抖音运行时 mock（Node 无头冒烟测试用）。
// 提供 getGameCanvas / getSystemInfoSync / 触控事件发射器 / 存储等最小面。

function makeContext() {
  const calls = [];
  const noop = () => {};
  return {
    calls,
    fillRect: noop,
    fillText: noop,
    clearRect: noop,
    save: noop,
    restore: noop,
    scale: noop,
    translate: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    set fillStyle(v) {},
    get fillStyle() {
      return '#000';
    },
    set font(v) {},
    get font() {
      return '12px sans-serif';
    },
    set textAlign(v) {},
    get textAlign() {
      return 'left';
    },
  };
}

function createMockTT(options) {
  const opts = options || {};
  const listeners = {
    touchStart: [],
    touchMove: [],
    touchEnd: [],
    touchCancel: [],
  };

  const tt = {
    _listeners: listeners,

    getGameCanvas() {
      return {
        width: opts.width || 1280,
        height: opts.height || 720,
        style: {},
        getContext() {
          return makeContext();
        },
        on() {},
        addEventListener() {},
      };
    },

    getSystemInfoSync() {
      return {
        windowWidth: opts.width || 1280,
        windowHeight: opts.height || 720,
        screenWidth: opts.width || 1280,
        screenHeight: opts.height || 720,
        pixelRatio: opts.pixelRatio || 2,
        language: 'zh-CN',
      };
    },

    requestAnimationFrame(cb) {
      return setTimeout(() => cb(Date.now()), 16);
    },
    cancelAnimationFrame(id) {
      clearTimeout(id);
    },

    vibrateShort() {},
    createImage() {
      return {};
    },
    createInnerAudioContext() {
      return { play() {}, pause() {}, destroy() {} };
    },

    onTouchStart(fn) {
      listeners.touchStart.push(fn);
    },
    onTouchMove(fn) {
      listeners.touchMove.push(fn);
    },
    onTouchEnd(fn) {
      listeners.touchEnd.push(fn);
    },
    onTouchCancel(fn) {
      listeners.touchCancel.push(fn);
    },

    // 测试辅助：模拟一次"按下-移动-抬起"
    simulateTouch(events) {
      const evs = Array.isArray(events) ? events : [events];
      for (const ev of evs) {
        const kind = ev.kind || 'touchstart';
        const payload = {
          touches: ev.touches || [],
          changedTouches: ev.changedTouches || ev.touches || [],
        };
        const target =
          listeners[
            {
              touchstart: 'touchStart',
              touchmove: 'touchMove',
              touchend: 'touchEnd',
              touchcancel: 'touchCancel',
            }[kind]
          ];
        if (target) for (const fn of target) fn(payload);
      }
    },
  };

  return tt;
}

module.exports = { createMockTT, makeContext };
