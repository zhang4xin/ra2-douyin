# M0.7 WASM Spike · 抖音端验证步骤

本工程是独立的抖音小游戏项目，用于验证 `7zz.wasm` 在抖音运行时内的可加载性与真实解压能力。
`7zz.js` / `7zz.wasm` 已复制自 `runtime/releases/0.83.4-r0918ad8-dac2bf5b2`（同源自包含）。
验证通过后本 spike 目录会被删除（一次性验证件）。

## 步骤

1. 打开 **抖音开发者工具** → 导入项目 → 选择本目录（`spike/wasm-load/douyin-spike`）。
   AppID 默认 `touristappid`（游客模式）即可，无需联网。
2. 编译运行，观察：
   - Console 中 `[spike]` 与 `[7z]` 日志；
   - 画布上逐步滚动的 PASS/FAIL 结果（可直接截图）。
3. 三项全 PASS 即通过：
   - `PASS 读取 7zz.wasm (tt fs)`：`tt.getFileSystemManager().readFile` 可读项目内 wasm；
   - `PASS WebAssembly.instantiate（平台原生）`：运行时原生 WASM 支持 + 存在 main 导出；
   - `PASS 7zz.js 胶水 + 真实建/解 7z 闭环`：建包→列表→解压→读回一致。
4. 有条件时在**真机**（优先低端安卓）复跑一遍，重点看真机 `WebAssembly` 与文件系统表现。

## 记录

在 `memory-bank/progress.md` 追加：

- 机型 / 开发者工具版本 / 通过与否；
- 三项各自 PASS/FAIL；
- 结论（是否走"7zz.js 胶水 + wasmBinary 注入"方案，见 `docs/decisions/ADR-0003.md`）。

## 与 Node 侧验证的关系

`../verify-node.js` 已在 Node 内以同一份 `7zz.js`+`7zz.wasm` 完成建/列/解压/读回闭环并 PASS，
本工程验证的是**抖音运行时**（文件系统 API + WASM 引擎 + 胶水环境兼容性）。
