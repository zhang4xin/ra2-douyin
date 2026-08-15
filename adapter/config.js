'use strict';

// 单点配置加载器。
// 构建时（scripts/build.js）会把 build-config.json 注入为全局 __RA2WEB_CONFIG__。
// 运行期其它模块一律通过本模块读取配置，避免版本号/CDN 地址散落各处。

const BUILTIN = {
  project: 'ra2-douyin',
  name: '网页红井-单机版',
  version: '0.83.4-dy.0',
  engine: {
    upstreamVersion: '0.83.4-r0918ad8-dac2bf5b2',
    engineDir: 'assets/releases/0.83.4-r0918ad8-dac2bf5b2',
    runtimeDir: 'runtime/releases/0.83.4-r0918ad8-dac2bf5b2',
  },
  viewport: { width: 1024, height: 768 },
  mode: { singlePlayer: true, disableSentry: true, disableMultiplayer: true },
};

function resolve(globalObj) {
  const injected = globalObj && globalObj.__RA2WEB_CONFIG__ ? globalObj.__RA2WEB_CONFIG__ : {};
  return Object.assign({}, BUILTIN, injected);
}

const config = resolve(typeof globalThis !== 'undefined' ? globalThis : {});

module.exports = config;
