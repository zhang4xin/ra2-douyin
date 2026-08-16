# 实施计划（implementation-plan）

> 按 vibe-coding 约定：每步小而具体、含验证方式、严禁大段代码。
> 门禁放行原则：**上一步未验证通过，不得开始下一步。**
> 详细背景见 `docs/roadmap.md` 与 `docs/decisions/`。

## M0 骨架验证（当前）

- [x] M0.1 抖音工程骨架（game.js/game.json/project.config.json）
- [x] M0.2 联机禁用 + 遥测禁用 + 品牌修正（servers.ini / config.ini / index.html / manifest）
- [x] M0.3 适配层基础：触控合成器 / 视口变换 / 全局面 / 事件总线
- [x] M0.4 质量门禁：npm test（12 项）/ audit-dom / check-size / quality-gate
- [x] M0.5 协作文档：CONTRIBUTING / ADR-0001..0004 / roadmap / mobile-controls / security / memory-bank
- [x] M0.6 提交推送至 zhang4xin/ra2-douyin
- [ ] **M0.7 WASM Spike**：在开发者工具/真机验证 `runtime/releases/0.83.4-r0918ad8-dac2bf5b2/7zz.wasm` 能否用 `tt.getFileSystemManager` + `WebAssembly.instantiate` 加载执行 → 更新 ADR-0003。
  - 验证：真机跑一个最小 7z 解压 demo，输出文件可读；记录机型/结论到 progress.md。
- [ ] **M0.8 仓库瘦身**：仅保留 0.83.4 版本目录，历史版本移出 git（ADR-0002）。
  - 验证：`npm run check-size` 全仓口径 < 60MB。

## M1 引擎跑通（最高风险，关键路径）

- [ ] M1.1 打包链：`scripts/build.js` 用 esbuild 把 index.html 的 lib 链 + `werhd.min.js` 打包为 CommonJS 单包。
  - 验证：产物可被 Node + mock-tt 冒烟加载；包大小记录。
- [ ] M1.2 迷你 DOM 树（React 挂载面）+ 事件系统 + ScriptRegistry（脚本加载拦截）。
  - 验证：构造 createElement/appendChild 的最小树，React 能 render。
- [ ] M1.3 Image / Audio / 网络 / 文件系统桥；`new Worker` 主线程仿真。
  - 验证：各桥在开发者工具打桩数据可通。
- [ ] M1.4 主菜单可见可点。
  - 验证：开发者工具/真机出现可操作主菜单、无致命报错；截图入 progress.md。

## M2 触控可玩

- [ ] M2.1 渲染接管：主 canvas = `tt.getGameCanvas()`；触控→事件注入闭环（合成器已就绪）。
  - 验证：一局遭遇战可开打，部队可选中/移动/攻击。
- [ ] M2.2 叠加层 HUD：命令条、编队浮条、快捷按钮、暂停；安全区适配。
  - 验证：按 `docs/mobile-controls.md` 触控专项指标（命中率 ≥95%、误操作 ≤2 次/局）。
- [ ] M2.3 双指平移（中键 mousemove）。
  - 验证：镜头可平移、与捏合互不干扰。

## M3 打磨发布

- [ ] M3.1 分包 + CDN 资源落盘 + manifest 校验；包体 ≤4MB/24MB。
- [ ] M3.2 性能基准：冷启动 ≤5s、中端机 30fps；真机测试矩阵；弱网降级。
- [ ] M3.3 合规：版权授权、版号/备案、域名白名单、隐私政策。
  - 验证：`docs/security.md` P0 清单全勾。

## 测试策略

- Node 无头冒烟：`npm test`（tests/ 用 mock tt，全部同步断言，不依赖框架）。
- 真机手动：每条重要改动附截图/录屏入 progress.md。
- 回归基线：每次改动至少跑 `npm run quality-gate`。
