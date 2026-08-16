# 协作规范（CONTRIBUTING）

本项目供多名员工共同开发，遵循以下约定以避免互相踩脚。请每位员工开工前通读本文档与 `docs/roadmap.md`。

## 分支与提交

- 分支模型：`main` 恒绿，开发在短命 feature 分支上进行：
  - `feat/xxx`（新功能）、`fix/xxx`（修复）、`chore/xxx`（杂项）、`docs/xxx`（文档）
  - 合入 `main` 使用 **squash merge**；禁止向共享分支 force-push。
- Commit message 采用 **Conventional Commits**：
  ```
  feat(ai): 敌方 AI 攒波进攻
  fix(state): 单位贴边滑行绕障
  chore(pack): 忽略文档目录
  ```
  类型：`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `perf` / `build`。

## PR 流程

每个 PR 必须包含：

1. **动机**：解决什么 issue / 满足哪个里程碑。
2. **改动清单**：改动了哪些文件，为什么。
3. **验证证据**：开发者工具截图、真机录屏、`npm test` 输出等。**没有证据默认 NEEDS WORK。**
4. **配置影响声明**：是否改动 `game.json` / `project.config.json`（会影响开发者工具编译的敏感路径，需 maintainer 亲自 review）。

Review 规则：至少 1 人 approve；改动编译配置 / 平衡表（`game/config.js`）的 PR 必须 maintainer 亲自过目。

## Issue 标签

`proposal` / `bug` / `game` / `ai` / `adapter` / `docs` / `good-first-issue` / `release-blocker`

决策类问题先开 Discussion/Issue 讨论，再开 PR（避免大改返工）。

## 敏感路径约定

| 路径 | 规则 |
|---|---|
| `game.json` / `project.config.json` | 单一 owner 制；改动必须走 PR + 配置变更检查项 |
| `game/config.js`（平衡表） | 数值调整需在 PR 说明理由与验证（对局测试） |
| `game/` `adapter/` `scripts/` `tests/` | 正常开发范围 |
| 许可声明（README / LICENSE） | 需 maintainer 同意，不得擅自删除 |

## 质量门槛（合入 main 前必须通过）

```bash
npm run quality-gate   # 一键门禁 = test + audit-dom + check-size + smoke-render + format:check
```

> 提交前也请先读 `AGENTS.md` 与 `memory-bank/`（Always 先读文档）。

## 版本与发布

- 版本号 `0.x.y`，由 maintainer 打 tag `v0.x.y`；同步 `game/config.js` 的 `GAME_VERSION` 与 `package.json`。

## 上手第一步

1. 安装 [抖音开发者工具](https://developer.open-douyin.com/)。
2. 克隆：`git clone https://github.com/zhang4xin/ra2-douyin.git`（或 `--filter=blob:none` 懒加载）。
3. 导入项目根目录，把 `project.config.json` 的 `appid` 替换为真实 AppID。
4. 读四份文档：`README.md` → `AGENTS.md` → `CONTRIBUTING.md` → `memory-bank/`（GDD/实施计划/架构/进度）。
5. 从 Issues 认领任务，切 `feat/xxx` 分支开发。
