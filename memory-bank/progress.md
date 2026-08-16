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

## 待办（下一步）

- M0.7 抖音端 Spike 验证（开发者工具 + 真机，见 spike README）——需用户操作，完成后更新 ADR-0003 状态为"已接受"。
- M1 打包链 / 迷你 DOM / 运行时桥。
