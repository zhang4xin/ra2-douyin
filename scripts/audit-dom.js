'use strict';

// DOM 引用审计：扫描我们自己的代码（adapter/、game/、game.js、scripts/），
// 找出"直接裸用浏览器 DOM/BOM"的调用——在抖音小游戏运行时这些会直接崩。
// 用法：node scripts/audit-dom.js
//
// 白名单/忽略：允许出现"被适配层定义/注入"的标识（如 window/document 定义处）。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['adapter', 'game', 'game.js', 'scripts'];
const EXCLUDE_DIRS = new Set(['node_modules']);

// 浏览器专属裸标识，出现在对象访问链左侧即为危险引用。
const BAD_PATTERNS = [
  /\bdocument\./g,
  /\bwindow\./g,
  /\blocalStorage/g,
  /\bsessionStorage/g,
  /\bnavigator\.storage/g,
  /\bXMLHttpRequest\b/g,
  /\bnew\s+Audio\b/g,
  /\bnew\s+Image\b/g,
  /\bnew\s+WebSocket\b/g,
  /\bfetch\s*\(/g,
  /\bindexedDB\b/g,
  /\bserviceWorker\b/g,
];

// 出现这些模块自身的文件不算违规（它们在"定义"而非"使用"）。
const SELF_DEFINE = new Set(['adapter/core/GlobalScope.js', 'adapter/dom/EventTarget.js']);

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) out.push(...collectFiles(full));
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

let issues = 0;
for (const rel of SCAN_DIRS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const files = fs.statSync(abs).isDirectory() ? collectFiles(abs) : [abs];
  for (const file of files) {
    const relFile = path.relative(ROOT, file).replace(/\\/g, '/');
    if (SELF_DEFINE.has(relFile)) continue;
    const src = fs.readFileSync(file, 'utf8');
    for (const re of BAD_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) {
        const line = src.slice(0, m.index).split('\n').length;
        const snippet = src.split('\n')[line - 1].trim().slice(0, 80);
        // 跳过注释行
        if (/^\s*(\/\/|\*|#)/.test(snippet)) continue;
        console.error(`[audit-dom] ${relFile}:${line} 裸引用 ${m[0].trim()} -> ${snippet}`);
        issues++;
      }
    }
  }
}

if (issues === 0) {
  console.log('[audit-dom] OK: 移植层代码未发现裸 DOM/BOM 引用。');
} else {
  console.error(`[audit-dom] FAIL: 发现 ${issues} 处裸 DOM/BOM 引用。`);
  process.exit(1);
}
