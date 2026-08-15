# ADR-0003：WASM 可行性策略（7zz 解压 / ffmpeg）

- 状态：待验证（M0 Spike，2026-08）
- 决策者：多部门头脑风暴 + maintainer

## 背景

引擎依赖 WebAssembly：
- `runtime/releases/0.83.4-r0918ad8-dac2bf5b2/7zz.wasm`（1.87MB，7z 解压游戏资源）；
- `ffmpeg.min.js` 及其远程 `ffmpeg-core.wasm`（音视频处理，当前指向 `unpkg.com`，属供应链风险）。
抖音小游戏运行时的 WASM 加载方式与浏览器不同（无 `<script src=".wasm">` / `fetch` 同源限制），需要验证。

## 决策（草案，Spike 后定稿）

1. **先做 Spike**（M0）：在抖音开发者工具 + 真机上验证 `7zz.wasm` 能否用 `tt.getFileSystemManager` + `WebAssembly.instantiate` 加载执行。
2. **若 WASM 可用**：7zz/ffmpeg 走分包 + `WebAssembly.instantiate(Uint8Array)` 本地加载，**移除 `unpkg.com` 远程依赖**（ffmpeg-core 本地化）。
3. **若 WASM 不可用**：降级为 **CDN 预解压**——构建期用 Node 把游戏资源预解压为明文清单，运行时直接读取，绕开引擎的 7z 解压路径。
4. `docs/decisions` 在 Spike 结论出来后更新本 ADR 状态为"已接受"并记录实测证据。

## 理由

- WASM 是引擎资源加载链的硬依赖，不可用即必须换路，是 M1 的最大技术风险。
- ffmpeg 远程加载是供应链投毒面，无论 WASM 结论如何都要本地化（见 docs/security.md P0）。

## 后果

- 若走 CDN 预解压：分包体积增大（需放解压后的资源），但运行时更简单可靠。
- 若 WASM 可行：包体更小，但需维护 WASM 加载适配。

## 复议条件

抖音运行时 WASM 支持政策变化，或实测性能不达标。
