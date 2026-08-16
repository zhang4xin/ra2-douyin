// 抖音小游戏入口（单机版）
// 运行环境：抖音开发者工具 / 抖音 App（CommonJS）
// 职责：装配适配层 -> 绘制启动状态 -> 绑定触控 -> 预留引擎加载点。
// 引擎接入与 DOM 适配详见 PORTING.md 与 adapter/。

const config = require('./adapter/config');
const { createAdapter } = require('./adapter/index');

const canvas = tt.getGameCanvas();
const ctx = canvas.getContext('2d');

const adapter = createAdapter(tt);

function ensureCanvasSize() {
  const sys = (tt.getSystemInfoSync && tt.getSystemInfoSync()) || {};
  const w = sys.windowWidth || sys.screenWidth || canvas.width || 1024;
  const h = sys.windowHeight || sys.screenHeight || canvas.height || 768;
  if (!canvas.width || canvas.width !== w) canvas.width = w;
  if (!canvas.height || canvas.height !== h) canvas.height = h;
  return { w, h };
}

const STATUS = {
  title: '网页红井 - 单机版',
  lines: [
    `版本 ${config.version}（引擎 ${config.engine.upstreamVersion}）`,
    '单机模式：遭遇战 + 单人战役',
    '联机已禁用（servers.ini 全部 available=no）',
    '',
    'Phase 0 骨架：适配层基础已装配',
    '接入步骤见项目根目录 PORTING.md',
  ],
};

function drawStatus() {
  const { w, h } = ensureCanvasSize();
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, w, h);

  // 标题
  ctx.fillStyle = '#d4b106';
  ctx.font = `bold ${Math.floor(h / 14)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(STATUS.title, w / 2, h / 5);

  // 状态行
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `${Math.floor(h / 30)}px sans-serif`;
  STATUS.lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 5 + (i + 1) * (h / 14));
  });

  // 触控映射提示（首次体验引导）
  ctx.fillStyle = '#8fa0c8';
  ctx.font = `${Math.floor(h / 34)}px sans-serif`;
  const tips = ['单击 = 选择/左键', '拖动 = 框选', '长按 = 右键指令', '双指 = 移动镜头 / 缩放'];
  tips.forEach((tip, i) => {
    ctx.fillText(tip, w / 2, h / 5 + (STATUS.lines.length + 1) * (h / 14) + i * (h / 18));
  });
  ctx.textAlign = 'left';
}

function resize() {
  const { w, h } = ensureCanvasSize();
  adapter.viewport.setPhysical(w, h);
  drawStatus();
}

// 把合成出的鼠标/wheel 事件派发到事件总线。
// 引擎接入后，这里应把事件送到迷你 DOM 树的冒泡链（Phase 1）。
adapter.bindTouch((ev) => {
  const logical = adapter.viewport.toLogical(ev.clientX, ev.clientY);
  if (!logical) return;
  adapter.eventTarget.dispatchEvent(ev);
});

if (typeof tt.onWindowResize === 'function') {
  tt.onWindowResize(resize);
} else if (canvas.on) {
  canvas.on('resize', resize);
}

try {
  resize();
  drawStatus();
  const sys = tt.getSystemInfoSync ? tt.getSystemInfoSync() : {};
  console.log(`[game] 启动成功 canvas=${canvas.width}x${canvas.height} window=${sys.windowWidth}x${sys.windowHeight}`);
} catch (e) {
  console.error('[game] 启动失败：', e && e.stack ? e.stack : e);
}

// TODO(移植): 在此处加载 DOM 适配层并启动引擎（见 PORTING.md 路线图）。
// Phase 1 目标：scripts/build.js 把 index.html 的 lib 链 + werhd.min.js
// 打包为 CommonJS，game.js 顺序加载后触发引擎 main。
