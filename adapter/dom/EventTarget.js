'use strict';

// 最小事件目标：提供 addEventListener/removeEventListener/dispatchEvent。
// 引擎与 React 依赖捕获/冒泡与 preventDefault/stopPropagation 语义，
// 这是整个 DOM 适配层事件系统的基础。

class EventTarget {
  constructor() {
    this._listeners = Object.create(null);
  }

  addEventListener(type, listener, options) {
    if (typeof listener !== 'function') return;
    const capture = !!(options && options.capture);
    const key = capture ? type + ':capture' : type + ':bubble';
    if (!this._listeners[key]) this._listeners[key] = [];
    if (!this._listeners[key].includes(listener)) this._listeners[key].push(listener);
  }

  removeEventListener(type, listener, options) {
    if (typeof listener !== 'function') return;
    const capture = !!(options && options.capture);
    const key = capture ? type + ':capture' : type + ':bubble';
    const list = this._listeners[key];
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    if (!event) return true;
    if (!event.target) event.target = this;
    if (!event.currentTarget) event.currentTarget = this;
    if (event.defaultPrevented == null) event.defaultPrevented = false;

    // 捕获阶段
    const cap = this._listeners[event.type + ':capture'] || [];
    for (const fn of cap.slice()) {
      if (event._stopped) break;
      fn.call(this, event);
    }
    // 目标阶段 + 冒泡阶段
    const bubble = this._listeners[event.type + ':bubble'] || [];
    for (const fn of bubble.slice()) {
      if (event._stopped) break;
      fn.call(this, event);
    }
    return !event.defaultPrevented;
  }
}

// 合成事件的公共构造器。引擎大量直接 new MouseEvent/KeyboardEvent 等，
// 统一走该工厂，保证字段齐备。
function makeEventConstructor(type, base) {
  return function (init) {
    init = init || {};
    const ev = {
      type,
      target: null,
      currentTarget: null,
      bubbles: !!init.bubbles,
      cancelable: !!init.cancelable,
      defaultPrevented: false,
      _stopped: false,
      stopPropagation() {
        this._stopped = true;
      },
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    Object.assign(ev, init);
    return ev;
  };
}

module.exports = { EventTarget, makeEventConstructor };
