# AGENTS.md — 面向 AI 与本项目协作者的上下文与约束

本文档融合三套方法论：**vibe-coding（规划驱动 + 上下文固定）**、**ECC（质量/安全规则）**、**ponytail（最小实现）**。
所有参与本仓库的 AI 助手与员工，动手前先读本文件与 memory-bank。

## Always 先读（强制，写任何代码前）

- [ ] `memory-bank/@game-design-document.md` — 目标、范围、红线
- [ ] `memory-bank/@architecture.md` — 每个文件的作用与责任边界
- [ ] `memory-bank/implementation-plan.md` — 当前步骤与验证方式
- [ ] `memory-bank/progress.md` — 已完成与验证证据
- 每完成一个功能/里程碑，更新 `memory-bank/progress.md` 与 `@architecture.md`。

## 核心工作法（vibe-coding）

- 一句话目标 + 非目标：先写清楚「做什么/不做什么」再动手。
- 一次只改一个模块；接口先行，实现后补。
- 能抄不写：先问有没有现成能力（标准库 / 平台 API / 本仓库已实现的 helper）。
- 文档即上下文，不是事后补：行为变化同步改 docs/ 与 memory-bank。

## 编码规范（ECC + ponytail）

- 最小实现（YAGNI）：不需要的不造。删优于加，平淡优于花哨。
- 删除死代码；函数单一职责、短小；命名英文语义直白；注释/文档/日志用中文。
- 所有触控/外部输入按**信任边界**处理：非法值丢弃、容量设上限、不做无界累积。
- Bug 修复=根因修复：先 grep 所有调用点，在共享函数处修一次，不逐个调用点打补丁。
- 非平凡逻辑必须留一个可运行检查（tests/ 下一个最小用例），平凡一行无需测试。
- 无注释要求时少写注释；刻意简化必须用 `ponytail:` 注释标明上限与升级路径。

## 运行环境铁律

- 运行环境（抖音小游戏）**无 DOM/BOM**，JS 为 CommonJS。
- 禁止裸用 `window.` / `document.` / `self.`（`npm run audit-dom` 门禁）。
- 游戏逻辑（`game/`）保持**纯逻辑无平台依赖**（可单测）；只允许 `game.js`、`adapter/`、`game/render.js` 接触 canvas/tt。
- 游戏坐标：地图空间（`config.js` 的 TILE/MAP_* 决定）与屏幕坐标的换算集中在 `game/ui.js`，勿在别处自行换算。

## 提交与 PR（ECC git-workflow）

- 分支：`feat/xxx` `fix/xxx` `chore/xxx` `docs/xxx`，squash 合入 main。
- Commit：Conventional Commits（`feat|fix|docs|chore|refactor|test|perf|build` + scope）。
- PR 必填：动机 / 改动清单 / 验证证据（测试输出、截图、录屏）——没证据默认 NEEDS WORK。

## 质量门禁（合入 main 前必须全绿）

```bash
npm run quality-gate   # = test + audit-dom + check-size + smoke-render + format:check
```

- `npm test`：Node 无头测试（mock tt），核心逻辑在 `tests/game-state.test.js`，不得依赖真机。
- `npm run audit-dom`：代码无裸 DOM/BOM。
- `npm run check-size`：包体预算。
- `npm run smoke-render`：无头渲染 + 输入链路冒烟。
- `npm run format:check`：prettier。
- 新增/改动逻辑同步补测试；边界与主流程必须有测试。

## 版本管理

- 自有版本 `0.x.y`（maintainer 打 tag），同步 `game/config.js` 的 `GAME_VERSION` 与 `package.json`。

## 红线（不谈判）

- 本项目为**原创游戏**，不得引入任何第三方游戏（含红警/RA2）的代码、素材或名称。
- 遥测/联机保持关闭；域名白名单外零外连（详见 `docs/security.md`）。
