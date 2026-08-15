# 抖音小游戏移植说明（单机版）

本仓库由 [RA2WEB / 网页红井] 网页版裁剪而来，目标是在抖音小游戏平台运行**仅单机**内容（遭遇战 + 单人战役）。

## 已完成的改动

1. **禁用全部联机服务器**：`servers.ini` 中所有大区 `available=no`，游戏内网络对战/天梯入口不再可用，只保留单机玩法。
2. **删除无关文件**：`old/`（历史版本）、`start.bat`、`stop.bat`、`breaking-news.html`。
3. **URL 协议修正**：`config.ini` / `mods.ini` 中的 `//cdn...` 协议相对地址统一改为 `https://...`（小游戏环境要求完整 https）。
4. **抖音小游戏工程骨架**：新增 `game.json`、`game.js`、`project.config.json`，可用抖音开发者工具直接打开。

## 尚需开发的移植工作（重要）

原引擎是运行在浏览器里的 DOM + Canvas 应用（入口 `assets/releases/<版本>/werhd.min.js`），而抖音小游戏运行时**没有 DOM/BOM**，只有 `tt.*` API 和离屏 Canvas。真正跑起来还需要：

1. **DOM 适配层**：参考 weapp-adapter 的思路，用 `tt.getGameCanvas()` 模拟 `window`、`document`、`HTMLCanvasElement`、`Image`（→ `tt.createImage()`）、`Audio`（→ `tt.createInnerAudioContext()`）、`XMLHttpRequest`/`fetch`（→ `tt.request()`）。
2. **WebAssembly 支持**：引擎用到 `runtime/` 下的 7z 解压与 ffmpeg 的 `.wasm`，需验证小游戏运行时的 WASM 能力与加载方式；不可用时需走 CDN 预解压资源。
3. **资源加载**：游戏资源（`gameresBaseUrl` 等）必须全部走 https CDN，且域名需加入抖音小游戏后台的 request/downloadFile 白名单。
4. **输入适配**：PC 鼠标键盘操作需映射为触屏手势（点击=左键、长按=右键、拖动框选等）。
5. **包体控制**：小游戏主包限制（目前约 4MB，总包 20MB，详见官方最新文档），`assets/`、`runtime/` 里的大文件需通过分包或远程加载解决。
6. **联机代码剔除**：引擎内 WOL/WebSocket 联机逻辑已由服务器配置屏蔽；如需彻底删代码以缩小体积，需在 `werhd.min.js` 构建源头处理（该文件为压缩产物，不建议直接手改）。

## 如何用抖音开发者工具打开

1. 下载 [抖音开发者工具](https://developer.open-douyin.com/)。
2. 「导入项目」→ 选择本仓库目录 → compileType 已设为 `game`。
3. 替换 `project.config.json` 里的 `appid` 为你们的小游戏 AppID。

## 许可须知（务必阅读）

上游项目 README 声明：仅限个人研究与爱好用途，禁止商用；部署与分发必须显著保留 `RA2WEB` / `网页红井` / `红色井界` 名称之一。对外发布（包括以小游戏形式上架）前请先确认已取得版权方授权。

## git / 协作

```bash
git clone <本仓库地址>
# 修改后提交
git add . && git commit -m "描述" && git push
```

建议各员工在 feature 分支上开发，通过 Pull Request 合入 main。
