'use strict';

// 适配层统一出口。game.js 通过 require('./adapter') 组装运行环境。
//
// 当前为 Phase 0 基础骨架，已就绪：
//   - config 单点配置
//   - GlobalScope 全局面
//   - ViewportTransform 视口变换（1024x768 letterbox + 坐标换算）
//   - EventSynthesizer 触控 -> 鼠标/wheel 事件合成
//   - EventTarget 最小事件系统
// 未实现（见 PORTING.md 路线图 Phase 1/2）：
//   - 迷你 DOM 树 / React 挂载面
//   - Image/Audio/网络/文件系统桥
//   - 引擎脚本注册表与打包链（scripts/build.js）

const config = require('./config');
const { createGlobalScope } = require('./core/GlobalScope');
const ViewportTransform = require('./core/ViewportTransform');
const EventSynthesizer = require('./input/EventSynthesizer');
const { EventTarget, makeEventConstructor } = require('./dom/EventTarget');

function createAdapter(ttApi) {
  const globalScope = createGlobalScope(ttApi);
  const viewport = new ViewportTransform(
    config.viewport.width,
    config.viewport.height,
    globalScope.screen.width,
    globalScope.screen.height,
  );
  const synthesizer = new EventSynthesizer(null);
  const eventTarget = new EventTarget();

  return {
    config,
    global: globalScope,
    viewport,
    synthesizer,
    eventTarget,
    // 触控接入：把 tt 的触控事件灌入合成器，并派发到 eventTarget。
    bindTouch(dispatch) {
      synthesizer.dispatch = dispatch || ((ev) => eventTarget.dispatchEvent(ev));
      const tt = globalScope.tt;
      if (!tt) return;
      if (tt.onTouchStart) tt.onTouchStart((ev) => synthesizer.onTouchStart(ev));
      if (tt.onTouchMove) tt.onTouchMove((ev) => synthesizer.onTouchMove(ev));
      if (tt.onTouchEnd) tt.onTouchEnd((ev) => synthesizer.onTouchEnd(ev));
      if (tt.onTouchCancel) tt.onTouchCancel((ev) => synthesizer.onTouchCancel(ev));
    },
  };
}

module.exports = { createAdapter, config };
