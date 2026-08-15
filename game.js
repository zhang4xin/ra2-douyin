// 抖音小游戏入口（单机版）
// 运行环境：抖音开发者工具 / 抖音 App
// 引擎与适配说明见 PORTING.md

const canvas = tt.getGameCanvas();
const ctx = canvas.getContext('2d');

const INFO = [
  'RA2WEB 网页红警 - 单机版',
  '',
  '当前状态：工程骨架，引擎尚未接入小游戏运行时',
  '接入步骤见项目根目录 PORTING.md',
  '',
  '单机模式：遭遇战（Skirmish）+ 单人战役',
  '联机功能已禁用（servers.ini 全部 available=no）',
];

function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d4b106';
  ctx.font = `${Math.floor(h / 24)}px sans-serif`;
  ctx.textAlign = 'center';
  INFO.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 3 + i * (h / 16));
  });
  ctx.textAlign = 'left';
}

draw();
canvas.on('resize', draw);

// TODO(移植): 在此处初始化 DOM 适配层（weapp-adapter 思路），再加载
// assets/releases/<版本>/werhd.min.js 引擎。详见 PORTING.md。
