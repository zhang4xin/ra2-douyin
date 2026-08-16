'use strict';

// 包体守卫：统计工程包体积，超限即失败（抖音平台硬约束：单包 <= 4MB，整包 <= 20MB）。
// 用法：node scripts/check-size.js [--main-budget=4 --total-budget=20]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', '.tmp_pretty']);

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) total += dirSize(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function parseArgs(argv) {
  const args = { mainBudget: 4, totalBudget: 20 };
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

const mainPaths = [path.join(ROOT, 'game.js'), path.join(ROOT, 'adapter'), path.join(ROOT, 'game')];
let mainBytes = 0;
for (const p of mainPaths) {
  if (fs.existsSync(p)) {
    mainBytes += fs.statSync(p).isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
}
const mainMB = mainBytes / (1024 * 1024);

console.log(`[check-size] 主包口径(game.js+adapter+game): ${mainMB.toFixed(2)} MB (预算 ${args.mainBudget} MB)`);
console.log(`[check-size] 全仓口径: ${totalMB.toFixed(2)} MB (预算 ${args.totalBudget} MB)`);

let ok = true;
if (mainMB > args.mainBudget) {
  console.error(`[check-size] FAIL: 主包 ${mainMB.toFixed(2)}MB 超限 ${args.mainBudget}MB`);
  ok = false;
}
if (totalMB > args.totalBudget) {
  console.error(`[check-size] FAIL: 全仓 ${totalMB.toFixed(2)}MB 超限 ${args.totalBudget}MB`);
  ok = false;
}
if (ok) console.log('[check-size] OK: 包体在预算内。');
process.exit(ok ? 0 : 1);
