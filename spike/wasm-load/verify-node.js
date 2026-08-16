'use strict';

// M0.7 WASM Spike · Node 侧验证
// 目标：证明 runtime/releases/<ver>/7zz.wasm(+7zz.js 胶水) 在非浏览器环境可完整工作：
//       建 7z -> 列表 -> 解压 -> 读回比对。
// 用法：node spike/wasm-load/verify-node.js
// 结论：供 ADR-0003 定稿使用；真机部分见 spike/wasm-load/douyin-spike/README.md。

const fs = require('fs');
const path = require('path');

const RUNTIME_DIR = path.resolve(__dirname, '..', '..', 'runtime', 'releases', '0.83.4-r0918ad8-dac2bf5b2');
const SevenZip = require(path.join(RUNTIME_DIR, '7zz.js'));

const PAYLOAD = `douyin-wasm-spike-${Date.now()}\n内容仅用于 M0.7 验证\n`;

function main() {
  return SevenZip({
    wasmBinary: fs.readFileSync(path.join(RUNTIME_DIR, '7zz.wasm')),
    print: (s) => console.log('[7z]', s),
    printErr: (s) => console.error('[7z]', s),
  }).then((m) => {
    const { FS, callMain } = m;

    FS.writeFile('/test.txt', PAYLOAD);
    callMain(['a', '/spike.7z', '/test.txt']);
    const listed = FS.stat('/spike.7z');
    console.log(`[spike] 已创建 spike.7z：${listed.size} 字节`);

    callMain(['l', '-ba', '/spike.7z']);

    FS.mkdir('/out');
    callMain(['x', '-y', '-o/out', '/spike.7z']);
    FS.chmod('/out/test.txt', 0o644);
    const back = FS.readFile('/out/test.txt', { encoding: 'utf8' });
    console.log(`[spike] 解压读回: ${JSON.stringify(back.slice(0, 40))}...`);
    const ok = back === PAYLOAD;
    console.log(ok ? '[spike] PASS：建/列/解压/读回全部一致' : '[spike] FAIL：内容不一致');
    return ok;
  });
}

main()
  .then((ok) => process.exit(ok ? 0 : 1))
  .catch((e) => {
    console.error('[spike] FAIL：', e && e.message ? e.message : e);
    process.exit(1);
  });
