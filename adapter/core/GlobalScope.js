'use strict';

// 全局作用域聚合：抖音小游戏运行时没有 window/document/self。
// 官方约定 GameGlobal.GameGlobal === GameGlobal 即为此设计。
// 本模块把运行环境（tt.*）挂到 window 化对象上，供上层引擎无差别引用。
//
// 注意：这里只做"最小全局面"。避免实现 innerHTML 等富 DOM 能力，
// 既是工作量约束，也是安全约束（减少动态执行面，见 docs/security.md）。

function createGlobalScope(ttApi) {
  const tt = ttApi || (typeof tt !== 'undefined' ? tt : null);
  const scope = {};

  scope.GameGlobal = scope; // 抖音惯例：GameGlobal.GameGlobal === GameGlobal
  scope.global = scope;
  scope.self = scope;
  scope.globalThis = scope;

  if (tt) {
    scope.tt = tt;
    scope.getGameCanvas = tt.getGameCanvas ? tt.getGameCanvas.bind(tt) : null;
    scope.createImage = tt.createImage ? tt.createImage.bind(tt) : null;
    scope.createInnerAudioContext = tt.createInnerAudioContext ? tt.createInnerAudioContext.bind(tt) : null;
    scope.createCanvas = tt.createCanvas ? tt.createCanvas.bind(tt) : null;
    scope.requestAnimationFrame = tt.requestAnimationFrame
      ? tt.requestAnimationFrame.bind(tt)
      : function (cb) {
          return setTimeout(cb, 16);
        };
    scope.cancelAnimationFrame = tt.cancelAnimationFrame ? tt.cancelAnimationFrame.bind(tt) : clearTimeout;
    scope.getFileSystemManager = tt.getFileSystemManager ? tt.getFileSystemManager.bind(tt) : null;
    scope.getSystemInfoSync = tt.getSystemInfoSync
      ? tt.getSystemInfoSync.bind(tt)
      : function () {
          return {};
        };
  }

  // 性能与设备基础信息（浏览器兜底值）
  const sysInfo = scope.getSystemInfoSync ? scope.getSystemInfoSync() : {};
  scope.performance =
    typeof performance !== 'undefined'
      ? performance
      : {
          now: function () {
            return Date.now();
          },
        };
  scope.devicePixelRatio = sysInfo.pixelRatio || 1;
  scope.screen = {
    width: sysInfo.screenWidth || 1024,
    height: sysInfo.screenHeight || 768,
  };
  scope.innerWidth = sysInfo.screenWidth || 1024;
  scope.innerHeight = sysInfo.screenHeight || 768;
  scope.navigator = {
    userAgent: 'ra2-douyin',
    platform: 'douyin-mini-game',
    language: sysInfo.language || 'zh-CN',
    onLine: true,
    vibrateShort: tt && tt.vibrateShort ? tt.vibrateShort.bind(tt) : function () {},
  };

  return scope;
}

module.exports = { createGlobalScope };
