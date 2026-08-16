# 进度记录（progress）

> 每完成一个实施计划步骤，在此追加一行：日期、步骤、验证证据、回滚点。

## 2026-08-16

- M0.1-M0.6 完成：工程骨架、单机化/安全加固、适配层 Phase 0、质量门禁、协作文档，已推送（commit f42d264，回滚点）。
- 应用三套方法论做优化（ponytail 懒人审查 + ECC 质量/安全 + vibe-coding memory-bank）：
  - ponytail：删除死代码（consumed/down 触点属性、补帧定时器流、blackBarTop、game.js 未用变量），修复「拖动中途加第二指补帧流未停」根因，双指平移标注 Phase 2 不提前实现。
  - ECC：触控输入信任边界过滤（非有限坐标/超量触点丢弃）；补边界测试（长按不补 click、捏合 wheel、非法坐标、cancel 清理），测试 8→12 项；新增一键 quality-gate。
  - vibe-coding：建立 memory-bank（GDD / 实施计划 / 架构 / 进度）+ AGENTS.md「Always 先读」规则。
- 验证：`npm test` 12 项通过；audit-dom / check-size / quality-gate 全绿（commit 89aead2，回滚点）。
- **M0.8 仓库瘦身完成**：删除 186 个历史版本目录（assets/releases 91 个 + runtime/releases 91 个 + res/werhd/releases 4 个），`versions.json` 收敛为 0.83.4；工作树 686MB→22MB，全仓口径 13.76MB（<60MB）。已澄清：git pack 以 delta 存储历史，克隆体积本就 ~26MB，无需改写历史。
- **M0.7 WASM Spike（Node 侧）通过**：`node spike/wasm-load/verify-node.js` 用 7zz.js 胶水 + `wasmBinary` 注入完成建 7z→列表→解压→chmod→读回闭环，PASS。关键结论（ADR-0003）：imports=env(40)+wasi_snapshot_preview1(7)；非浏览器环境需注入 wasmBinary；解压文件需 chmod 才能读回。
- **M0.7 抖音端待验证**：`spike/wasm-load/douyin-spike/` 自包含工程就绪，需在开发者工具/真机跑三项 PASS 后更新本节。
- **工作目录收敛（重要）**：本地唯一工作副本统一为 `E:\youxi\hongjin\ra2-douyin`（已同步至 ae62389 并与 origin/main 一致，npm test 12/12）。原 `E:\youxi\hongjin\ra2web.github.io-main` 仅作历史副本不再使用；后续所有改动、提交、推送都在本目录进行。
- **抖音开发者工具编译阻塞与修复**：根工程 `game.js` 用了 `canvas.on('resize')`（抖音无此 API）→ 改 `tt.onWindowResize`；同时工具会把包内**所有 .js** 编译成 CJS，而引擎 `werhd.min.js` 是 Vite ESM 带顶层 `await`（如 `await (0,_werhdmin.l)("…/ffmpeg.min.js")`）→ 编译直接失败。修复：`project.config.json` 加 `packOptions.ignore`（工具 ≥4.2.7 支持）跳过 `assets/releases` + `runtime/releases`；M1 打包链将把引擎打成可编译的 CommonJS 单包再放回包内（届时按文件而非整目录忽略）。
- 新增 `.gitattributes`（`* text=auto eol=lf` + 二进制标记），统一 LF 行尾，避免 Windows CRLF 导致 prettier 误报（commit a819f30）。
- **方向转向（重要，ADR-0005）**：放弃红警引擎移植，**改为自研原创 RTS「钢铁前线」**（玩法参考红警，代码/素材全自研，无版权负担）。触发原因：抖音开发者工具整包编译 ESM 引擎（顶层 await）受阻；上架需版权方书面授权。已删除 `assets/ runtime/ res/ lib/` 引擎与网页残留（109 文件）及 `spike/`（7z WASM 验证已完成使命）。
- **自研 RTS MVP 完成**：`game/` 目录（config/state/ai/ui/input/render/main），完整玩法闭环——资金收入（矿场加成）、建造（兵营/工厂/矿场/炮塔）、生产（步兵/坦克）、单击选择/拖动框选/长按右键指挥（移动/攻击）、敌方 AI（自主发展+攒波进攻+每 8s 重申指令）、胜负判定、重开。修复：单位撞障碍完全卡死 → 贴边滑行绕障；AI 部队被堵在半路 → 波次指令周期重申。
- 质量门禁升级：新增 `scripts/smoke-render.js` 无头渲染+输入冒烟测试并纳入 quality-gate；单测新增 `tests/game-state.test.js`（13 项核心逻辑用例）；`audit-dom` 扫描范围扩到 `game/`；`check-size` 重写（不再依赖引擎目录）。全部门禁绿（25 测试 + 冒烟 + 审计 + 体积 + 格式）。
- 测试进程不退出的坑：`boot.test.js` 加载 game.js 后主循环用 `setTimeout` 链无限 rAF，测试完成后 Node 等待句柄不退出 → 统一加 `--test-force-exit`（测试本身 25/25 全过）。
- 文档同步：README/AGENTS/CONTRIBUTING/@architecture 全面改写为「原创 RTS」定位；新增 ADR-0005；删除 `spike/`（7z WASM 验证已完成使命）。

## 待办（下一步）

- M0.7 抖音端 Spike 验证（开发者工具 + 真机，见 spike README）——需用户操作，完成后更新 ADR-0003 状态为"已接受"。
- M1 打包链 / 迷你 DOM / 运行时桥。
