# 抖音小游戏移植技术状态（PORTING.md）

> 本文档是移植工作的 live 状态文档，随实现进展持续更新。
> 目标：在抖音小游戏运行时运行**仅单机**内容（遭遇战 + 单人战役）。

## 已完成

1. **禁用联机**：`servers.ini` 全部 `available=no`；`config.ini` 中协议相对地址 `//` 统一为 `https://`。
2. **删除无关文件**：`old/`、`start.bat`、`stop.bat`、`breaking-news.html`。
3. **抖音小游戏工程骨架**：`game.json`、`game.js`、`project.config.json`。
4. **安全加固（2026-08）**：
   - 禁用 Sentry 遥测（`config.ini [Sentry]` dsn/incidentUrl 置空），异常只写本地日志；
   - 品牌与描述去除"联机对战平台/王二火大"，标题改为"网页红井-单机版"，保留 RA2WEB/网页红井 名称（上游许可红线）。
5. **适配层基础（Phase 0，2026-08）**：
   - `adapter/`：`EventSynthesizer`（触控->鼠标/wheel 合成：单击/双击/拖动/长按=右键/双指捏合=缩放）、`ViewportTransform`（1024x768 等比 letterbox + 坐标换算）、`GlobalScope`（window/document 聚合）、最小 `EventTarget`。
   - 质量门禁：`npm test`（8 项冒烟）、`npm run audit-dom`（裸 DOM 引用检查）、`npm run check-size`（包体预算）。
   - `build-config.json`：版本 / CDN / 视口单点配置，升级引擎只改此处（见 ADR-0004）。

## 关键背景（调研结论）

- 原引擎入口 `assets/releases/0.83.4-r0918ad8-dac2bf5b2/werhd.min.js`（约 3.4MB）是 **Vite 打包的 ESM + React 18** 应用，含 `createRoot`/`hydrateRoot`、DOM 事件委托、动态 `import()`（均为静态字符串）。
- 抖音小游戏运行时**没有 DOM/BOM**，只有 `tt.*` API 与 `tt.getGameCanvas()`，JS 为 CommonJS。
- 包体硬约束：主包 ≤4MB，总包 ≤24MB。当前全仓 635MB（含 92 个历史版本目录），必须裁剪 + 分包。

## 移植路线图（详见 docs/roadmap.md 与 docs/decisions/）

- **Phase 1（M1）**：`scripts/build.js` 用 esbuild 把 lib 链 + 引擎打包为 CJS 单包；实现迷你 DOM 树（React 挂载面）、Image/Audio/网络/文件系统桥、脚本注册表（ScriptRegistry）；`new Worker` 主线程仿真。验收 = 开发者工具出现可操作主菜单。
- **Phase 2（M2）**：渲染接管（主 canvas = `tt.getGameCanvas()`）+ 触控事件注入闭环 + 视口变换落地；虚拟键盘 HUD。验收 = 遭遇战可开打并打完。
- **Phase 3（M3）**：分包 + CDN 资源落盘、包体/性能达标、真机测试矩阵、合规上架材料。

## 如何用抖音开发者工具打开

1. 下载 [抖音开发者工具](https://developer.open-douyin.com/)。
2. 「导入项目」→ 选择本仓库目录 → `compileType` 已设为 `game`。
3. 替换 `project.config.json` 里的 `appid` 为真实小游戏 AppID。
4. 远程资源域名（`stdres.wangerhuoda.cn` 等）需在抖音开放平台后台加入 request/downloadFile 白名单，详见 `docs/security.md`。

## 许可须知（务必阅读）

上游项目声明：仅限个人研究与爱好用途，禁止商用；部署与分发必须显著保留 `RA2WEB` / `网页红井` / `红色井界` 名称之一。
对外发布（包括以小游戏形式上架）前请先取得版权方 **北京瑞得哈希有限公司** 书面授权，并确认版号/备案要求。

## 协作

```bash
git clone https://github.com/zhang4xin/ra2-douyin.git
git checkout -b feat/xxx
# ... 开发、提交（Conventional Commits）
git push origin feat/xxx   # 提 PR
```

规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。
