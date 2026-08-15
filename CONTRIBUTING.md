# 协作规范（CONTRIBUTING）

本项目供多名员工共同开发，遵循以下约定以避免互相踩脚。请每位员工开工前通读本文档与 `docs/roadmap.md`。

## 分支与提交

- 分支模型：`main` 恒绿，开发在短命 feature 分支上进行：
  - `feat/xxx`（新功能）、`fix/xxx`（修复）、`chore/xxx`（杂项）、`docs/xxx`（文档）、`spike/xxx`（技术验证）
  - 合入 `main` 使用 **squash merge**；禁止向共享分支 force-push。
- Commit message 采用 **Conventional Commits**：
  ```
  feat(adapter): 实现触控->鼠标事件合成器
  fix(config): 禁用 Sentry 遥测上报
  chore(assets): 清理历史版本目录
  ```
  类型：`feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `perf` / `build`。

## PR 流程

每个 PR 必须包含：

1. **动机**：解决什么 issue / 满足哪个里程碑。
2. **改动清单**：改动了哪些文件，为什么。
3. **验证证据**：开发者工具截图、真机录屏、`npm test` 输出等。**没有证据默认 NEEDS WORK。**
4. **配置影响声明**：是否改动 `config.ini` / `servers.ini` / `game.json` / `assets` 目录（这些是敏感路径，改动需 maintainer 亲自 review）。

Review 规则：至少 1 人 approve；维护敏感路径（配置 / assets / 许可声明）的 PR 必须 maintainer 亲自过目。

## Issue 标签

`proposal` / `bug` / `porting` / `assets` / `docs` / `spike` / `blocked-by-upstream` / `good-first-issue` / `release-blocker`

决策类问题先开 Discussion/Issue 讨论，再开 PR（避免大改返工）。

## 敏感路径约定

| 路径 | 规则 |
|---|---|
| `config.ini` / `servers.ini` / `game.json` | 单一 owner 制；改动必须走 PR + 配置变更检查项 |
| `assets/` `runtime/` | **只读**。资源变更走 issue + 专人，禁止随意增删 |
| `werhd.min.js` 及上游压缩产物 | 不可手改，升级走 `build-config.json`（见 ADR-0004） |
| `adapter/` `scripts/` `tests/` | 正常开发范围 |
| 许可声明（README / LICENSE / PORTING.md） | 需 maintainer 同意，不得擅自删除上游许可条款 |

## 质量门槛（合入 main 前必须通过）

```bash
npm test          # 无头冒烟（mock tt）
npm run audit-dom # 无裸 DOM/BOM 引用
npm run check-size
npm run format:check
```

## 版本与发布

- 版本号沿用 `0.83.4-dy.N`（上游版本号 + `-dy` 自有后缀），由 maintainer 打 tag `v0.83.4-dy.N`。
- 上游版本锁定 `0.83.4`，不主动追新；升级需按 `docs/release-versioning.md` 流程执行回归。

## 上手第一步

1. 安装 [抖音开发者工具](https://developer.open-douyin.com/)。
2. 克隆：`git clone https://github.com/zhang4xin/ra2-douyin.git`（或 `--filter=blob:none` 懒加载）。
3. 导入项目根目录，把 `project.config.json` 的 `appid` 替换为真实 AppID。
4. 读三份文档：`README.md` → `CONTRIBUTING.md` → `docs/roadmap.md`。
5. 从 Issues 认领任务，切 `feat/xxx` 分支开发。
