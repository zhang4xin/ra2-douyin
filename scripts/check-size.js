'use strict';

// 包体守卫：统计主包/整包体积，超限即失败（抖音平台硬约束）。
// 用法：node scripts/check-size.js [--main-budget=4 --total-budget=24]
//
// Phase 0 暂以"当前工程根目录"为口径；打包链就绪后改为统计 dist/ 产物。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INCLUDE_EXT = new Set(['.js', '.json', '.wasm', '.html', '.css', '.ini', '.webmanifest', '.ico']);
const EXCLUDE_DIRS = new Set(['.git', 'node_modules']);

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) total += dirSize(full);
    } else if (entry.isFile()) {
      if (INCLUDE_EXT.has(path.extname(entry.name).toLowerCase())) {
        total += fs.statSync(full).size;
      }
    }
  }
  return total;
}

function parseArgs(argv) {
  const args = { mainBudget: 4, totalBudget: 24 };
  for (const a of argv) {
    const m = /^--main-budget=([\d.]+)$/.exec(a);
    if (m) args.mainBudget = parseFloat(m[1]);
    const t = /^--total-budget=([\d.]+)$/.exec(a);
    if (t) args.totalBudget = parseFloat(t[1]);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const totalMB = dirSize(ROOT) / (1024 * 1024);

// Phase 0 口径：主包近似 = game.js + adapter/ + scripts 中会被打进包的代码。
const mainPaths = [path.join(ROOT, 'game.js'), path.join(ROOT, 'adapter')];
let mainBytes = 0;
for (const p of mainPaths) {
  if (fs.existsSync(p)) {
    mainBytes += fs.statSync(p).isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
}
const mainMB = mainBytes / (1024 * 1024);

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'build-config.json'), 'utf8'));
const countDirs = (rel) => {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readdirSync(p).filter((n) => fs.statSync(path.join(p, n)).isDirectory()).length : 0;
};
const engineReleases = countDirs(config.engine.engineDir.replace(/\/[^/]+$/, ''));
const runtimeReleases = countDirs(config.engine.runtimeDir.replace(/\/[^/]+$/, ''));

console.log(`[check-size] 主包口径: ${mainMB.toFixed(2)} MB (预算 ${args.mainBudget} MB)`);
console.log(`[check-size] 全仓口径: ${totalMB.toFixed(2)} MB (预算 ${args.totalBudget} MB)`);
console.log(
  `[check-size] 已收敛引擎目录：assets ${engineReleases} 套 / runtime ${runtimeReleases} 套（仅保留 ${config.engine.upstreamVersion}）`,
);

let ok = true;
if (mainMB > args.mainBudget) {
  console.error(`[check-size] FAIL: 主包 ${mainMB.toFixed(2)}MB 超限 ${args.mainBudget}MB`);
  ok = false;
}
if (totalMB > args.totalBudget) {
  console.warn(
    `[check-size] WARN: 全仓 ${totalMB.toFixed(2)}MB 超 ${args.totalBudget}MB（Phase 0 仓库口径，打包后应为 dist 口径）`,
  );
}

process.exit(ok ? 0 : 1);
