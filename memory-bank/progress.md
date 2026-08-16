# 进度记录（progress）

> 每完成一个实施计划步骤，在此追加一行：日期、步骤、验证证据、回滚点。

## 2026-08-16

- M0.1-M0.6 完成：工程骨架、单机化/安全加固、适配层 Phase 0、质量门禁、协作文档，已推送（commit f42d264，回滚点）。
- 应用三套方法论做优化（ponytail 懒人审查 + ECC 质量/安全 + vibe-coding memory-bank）：
  - ponytail：删除死代码（consumed/down 触点属性、补帧定时器流、blackBarTop、game.js 未用变量），修复「拖动中途加第二指补帧流未停」根因，双指平移标注 Phase 2 不提前实现。
  - ECC：触控输入信任边界过滤（非有限坐标/超量触点丢弃）；补边界测试（长按不补 click、捏合 wheel、非法坐标、cancel 清理），测试 8→12 项；新增一键 quality-gate。
  - vibe-coding：建立 memory-bank（GDD / 实施计划 / 架构 / 进度）+ AGENTS.md「Always 先读」规则。
- 验证：`npm test` 12 项通过；audit-dom / check-size 通过；`npm run quality-gate` 全绿。

## 待办（下一步）

- M0.7 WASM Spike（7zz.wasm 在抖音运行时可行性）——最高优先级，结论影响 M1 路线。
- M0.8 仓库瘦身（仅保留 0.83.4，全仓 <60MB）。
- M1 打包链 / 迷你 DOM / 运行时桥。
