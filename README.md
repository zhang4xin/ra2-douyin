# 网页红井 · 抖音小游戏单机版（ra2-douyin）

> 由 [RA2WEB / 网页红井]（网页版红警 / Chronodivide）裁剪而来的 **抖音小游戏 · 单机版** 移植工程。
> 仅保留单机玩法（遭遇战 + 单人战役），联机功能已禁用。

## 当前状态（2026-08）

- ✅ 工程骨架：`game.json` / `game.js` / `project.config.json` 已就位，可在抖音开发者工具导入。
- ✅ 联机禁用：`servers.ini` 全部 `available=no`；配置文件已全部 https。
- ✅ 安全加固：Sentry 遥测禁用；品牌名已按单机版修正。
- ✅ 适配层基础：触控->鼠标/wheel 事件合成器、视口变换（1024x768 letterbox）、全局作用域、Node 冒烟测试（8 项通过）。
- 🚧 **引擎尚未在小游戏运行时跑通**：`adapter/` 是 Phase 0 基础，完整 DOM 适配与引擎打包见 `docs/roadmap.md`。
- 🚧 **版权授权未完成**：上架前必须取得版权方书面授权（见下文"许可须知"）。

## 快速开始

```bash
npm install             # 仅安装开发期依赖（esbuild / prettier）
npm run quality-gate    # 一键质量门禁：test + audit-dom + check-size + format:check
```

用抖音开发者工具「导入项目」选择本仓库根目录，`compileType` 已设为 `game`；
将 `project.config.json` 里的 `appid` 替换为你们的小游戏 AppID。

**给开发者的第一份阅读材料**：`AGENTS.md` 与 `memory-bank/`（游戏设计 / 实施计划 / 架构 / 进度）。
AI 助手与员工都必须「先读上下文再动手」（vibe-coding 原则）。

## 目录结构

```
game.js / game.json / project.config.json   # 抖音小游戏工程骨架（入口）
adapter/                                    # 自研适配层（触控/视口/全局面，Phase 0）
scripts/                                    # 构建与质量门禁脚本
tests/                                      # Node 无头测试（mock tt）
docs/                                       # 决策记录 / 触控方案 / 安全 / 路线图
memory-bank/                                # Always 先读：GDD / 实施计划 / 架构 / 进度
assets/releases/0.83.4-r0918ad8-dac2bf5b2/  # 上游引擎（压缩产物，不可手改）
build-config.json                           # 版本 / CDN / 视口单点配置
PORTING.md                                  # 移植技术状态（live doc）
```

## 协作

多员工协作规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。关键结论与决策见 [docs/decisions](docs/decisions/)。

## 里程碑（详见 docs/roadmap.md）

- **M0 骨架验证**：工程可在开发者工具运行，仓库可协作 —— *进行中*
- **M1 引擎跑通**：DOM 适配 + 引擎加载，主菜单可见可点
- **M2 触控可玩**：遭遇战可开打并打完，触控操作闭环
- **M3 打磨发布**：包体/性能/合规达标，过审上架

## 重要说明（许可与使用边界）

本项目（RA2WEB / 网页红井 / 红色井界）仅用于个人研究和爱好用途，不得将本项目作为商业用途直接或间接使用。
在任何部署、分发、展示或二次发布时，必须**显著保留**以下任一名称：`RA2WEB`、`网页红井`、`红色井界`，不得删除、隐藏或替换为其他名称。

除非取得版权方 **北京瑞得哈希有限公司** 的书面授权，严禁将本项目用于任何商业用途（包括但不限于：付费使用、广告变现、商用托管、授权出售、商业集成、商业代部署、商业推广活动）。
如有商用意向，请先联系版权方取得书面许可。

> ⚠️ 抖音小游戏上架属于公开分发，**务必在取得书面授权并确认版号/备案要求后再提审**。完整检查清单见 [docs/security.md](docs/security.md)。

## Usage Notice (English)

This project (RA2WEB / 网页红井 / 红色井界) is provided for personal research and hobby use only.
Any deployment, distribution, demonstration, or republishing must clearly keep one of these names: `RA2WEB`, `网页红井`, or `红色井界`.
Commercial use is strictly prohibited unless written authorization is obtained from the copyright holder **REDHASH Co., Ltd.**.
For commercial authorization, please contact the copyright holder first.
