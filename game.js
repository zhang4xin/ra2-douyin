// 抖音小游戏入口（原创 RTS：钢铁前线）
// 职责：获取上屏画布 -> 装配适配层 -> 启动游戏主循环。
// 游戏逻辑全在 game/ 目录（纯逻辑，可单测），本文件只做环境装配。

const { createAdapter } = require('./adapter/index');
const { createMain } = require('./game/main');

// 抖音上屏画布：tt.createCanvas() 首次调用返回上屏画布（官方标准）；
// tt.getGameCanvas() 是部分运行时的旧 API，作为兜底。
const canvas =
  (typeof tt.createCanvas === 'function' && tt.createCanvas()) ||
  (typeof tt.getGameCanvas === 'function' && tt.getGameCanvas());
if (!canvas) {
  throw new Error('当前环境无画布 API：缺少 tt.createCanvas / tt.getGameCanvas');
}
const ctx = canvas.getContext('2d');

const adapter = createAdapter(tt);

function ensureCanvasSize() {
  const sys = (tt.getSystemInfoSync && tt.getSystemInfoSync()) || {};
  const w = sys.windowWidth || sys.screenWidth || canvas.width || 1024;
  const h = sys.windowHeight || sys.screenHeight || canvas.height || 768;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return { w, h };
}

if (typeof tt.onWindowResize === 'function') {
  tt.onWindowResize(ensureCanvasSize);
} else if (canvas.on) {
  canvas.on('resize', ensureCanvasSize);
}

try {
  ensureCanvasSize();
  const main = createMain(adapter, canvas, ctx);
  main.start();
} catch (e) {
  console.error('[game] 启动失败：', e && e.stack ? e.stack : e);
}
