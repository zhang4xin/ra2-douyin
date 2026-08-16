# 钢铁前线 · 抖音小游戏（steel-front-douyin）

> 一款**原创即时战略小游戏**（单机）：建基地、造兵、采矿涨收入，与电脑 AI 对推，拆掉对方主基地即获胜。玩法逻辑参考经典 RTS，代码与素材全部自研，无任何第三方游戏素材。

## 当前状态（2026-08）

- ✅ 完整可玩的第一版（MVP）：建造/生产/框选/右键指挥/战斗/胜负/AI 进攻全闭环。
- ✅ 可在抖音开发者工具导入运行（`compileType: game`）。
- ✅ 质量门禁全绿：单元测试（24+ 项）+ 无头渲染冒烟 + DOM 审计 + 包体守卫 + 格式检查。
- 🚧 打磨项（Roadmap）：双指缩放、音效、更多兵种/地图、胜利结算动画。

## 快速开始

```bash
npm install
npm run quality-gate   # test + audit-dom + check-size + smoke-render + format:check
```

抖音开发者工具「导入项目」选本仓库根目录；`project.config.json` 的 `appid` 替换为你们的小游戏 AppID（本地工具会自动写回真实 AppID，勿提交）。

## 玩法与操作

- **资金**：每 10 秒自动到账；建造「矿场」可提升收入（顶栏能量条显示收入）。
- **发展**：底部面板「建筑」页签选兵营/工厂/矿场/炮塔 → 点地图放置；「兵种」页签生产步兵/坦克，坦克强但贵。
- **指挥**（触屏=鼠标的映射）：
  - 单击 = 选中己方单位；拖动 = 框选多个单位
  - 长按 0.5s = 右键指令：对空地=移动，对敌人=攻击
  - 右上角雷达实时显示敌我动向；顶部「重开」随时开新战局。
- **胜负**：拆掉对方主基地获胜；自己的基地被拆即败。

## 目录结构

```
game.js / game.json / project.config.json   # 抖音小游戏入口与配置
adapter/                                    # 适配层：触控->鼠标事件合成、视口、全局面
game/                                       # 游戏本体（纯逻辑 + 渲染 + 输入 + AI）
  config.js   平衡表（建筑/单位/价格/属性）
  state.js    核心逻辑：地图/资源/生产/战斗/胜负（纯函数，可单测）
  ai.js       敌方 AI（发展 + 攒波进攻）
  ui.js       布局与坐标换算
  input.js    输入事件 -> 游戏指令
  render.js   canvas 2D 渲染
  main.js     主循环
scripts/                                    # 质量门禁 / 构建脚本
tests/                                      # Node 无头测试（mock tt）
docs/decisions/                             # 架构决策记录（含转向自研的 ADR-0005）
memory-bank/                                # GDD / 实施计划 / 进度（先读）
```

## 协作

多员工协作见 [CONTRIBUTING.md](CONTRIBUTING.md)。关键决策见 [docs/decisions](docs/decisions/)。
AI 助手与员工都必须「先读上下文再动手」（vibe-coding 原则）：先看 `memory-bank/` 与 `AGENTS.md`。
