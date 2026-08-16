'use strict';

// 一键质量门禁：顺序执行 test / audit-dom / check-size / format:check，
// 任一失败即汇总并退出码 1（供 CI / 提交前使用）。

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'pipe' });

const gates = [
  { name: 'test (node --test)', run: () => run(process.execPath, ['--test']) },
  { name: 'audit-dom', run: () => run(process.execPath, ['scripts/audit-dom.js']) },
  { name: 'check-size', run: () => run(process.execPath, ['scripts/check-size.js']) },
  {
    name: 'format:check',
    run: () =>
      run(process.execPath, [
        'node_modules/prettier/bin/prettier.cjs',
        '--check',
        'adapter',
        'scripts',
        'tests',
        'game.js',
      ]),
  },
];

const failed = [];
for (const g of gates) {
  process.stdout.write(`[quality-gate] ${g.name} ... `);
  try {
    const out = g.run();
    const tail = out.toString().trim().split('\n').slice(-3).join('\n');
    process.stdout.write(`OK\n`);
    if (tail) process.stdout.write(`  ${tail.split('\n').join('\n  ')}\n`);
  } catch (err) {
    const tail = (err.stdout || err.stderr || err.message || '').toString().trim().split('\n').slice(-6).join('\n');
    process.stdout.write(`FAIL\n  ${tail.split('\n').join('\n  ')}\n`);
    failed.push(g.name);
  }
}

if (failed.length) {
  process.stdout.write(`\n[quality-gate] ${failed.length} 项未通过: ${failed.join(', ')}\n`);
  process.exit(1);
}
process.stdout.write('\n[quality-gate] 全部通过。\n');
