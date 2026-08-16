# 架构映射（@architecture）

> 「Always 先读」文档之二。写代码前先读本文件，明白每个文件的作用与责任边界。
> 原则：单向数据流、单一职责、跨模块接口稳定；`game/` 纯逻辑与平台解耦（ADR-0005）。

## 目录结构

```
game.js                    抖音小游戏入口：createCanvas -> createMain -> bindTouch -> rAF 主循环
game.json / project.config.json   平台配置（横屏/compileType=game/游客 appid/packOptions 忽略非打包目录）
adapter/                   自研适配层（触控/视口/全局面，已验证）
  config.js                配置加载器（读 __RA2WEB_CONFIG__，回退 BUILTIN）
  index.js                 createAdapter：装配 global/viewport/synthesizer/eventTarget + bindTouch
  core/GlobalScope.js      全局面：window/document/self 聚合，挂 tt.* 绑定
  core/ViewportTransform.js 1024x768 letterbox 视口 + 物理<->逻辑坐标换算
  dom/EventTarget.js       最小事件目标 + 事件工厂
  input/EventSynthesizer.js 触控手势 -> 鼠标/wheel 事件合成（信任边界输入过滤）
game/                      游戏本体（原创 RTS「钢铁前线」，纯逻辑可单测）
  config.js                平衡表：建筑/单位/价格/属性 + GAME_NAME/GAME_VERSION
  state.js                 核心状态机：地图/资金/建造/生产/移动(贴边绕障)/战斗/胜负（纯函数）
  ai.js                    敌方 AI：自主发展(PLAN_STEPS) + 攒波进攻(每 8s 重申指令)
  ui.js                    布局与坐标换算（mapX/mapY/mapScale、按钮坐标、toScreen/toMap）
  input.js                 输入事件 -> 游戏指令（点选/框选/建造放置/右键指令/重开）
  render.js                canvas 2D 渲染（地图/建筑/单位/血条/框选/指示/toast/结算）
  main.js                  主循环装配：createMain(adapter,canvas,ctx)，rAF 驱动，dt 上限 50ms
scripts/
  check-size.js            包体预算守卫（主包/全仓两档预算）
  audit-dom.js             无裸 DOM/BOM 引用扫描
  quality-gate.js          一键质量门禁（test + audit + size + smoke + format）
  smoke-render.js          无头渲染+输入链路冒烟（mock-tt 驱动完整帧）
  build.js                 预留：正式打包脚本
tests/
  mock-tt.js               tt.* 运行时 mock（含 canvas ctx 全方法）
  boot.test.js             game.js 可加载 / adapter 可装配 / 全局面语义
  game-state.test.js       核心逻辑用例：建造/生产/移动/战斗/胜负/收入/AI
  input-transform.test.js  视口换算 + 手势合成边界用例
docs/decisions/            架构决策（含 ADR-0005 转向自研原创 RTS）
memory-bank/               本文档 + GDD + 实施计划 + progress（Always 先读）
CONTRIBUTING.md / README.md / AGENTS.md   协作规范 / 项目说明 / 工作约束
```

## 事件流向

```
tt.onTouch* -> EventSynthesizer（手势判定/坐标换算前的物理坐标）
             -> bindTouch 回调 -> game/input.js 转成游戏指令（点选/框选/建造/移动/攻击）
             -> game/state.js 状态变更 -> render 每帧重绘
```

## 关键不变量（改动前必须确认不破坏）

1. `game/state.js` 等纯逻辑模块不得引用 tt/canvas/DOM；渲染与输入只经 `render.js`/`input.js`/`game.js` 接触平台。
2. 屏幕<->地图坐标换算只集中在 `game/ui.js`（`toScreen`/`toMap`），勿在别处自行换算。
3. 运行环境无 DOM/BOM：任何新代码禁止裸用 `window./document./self.`（audit-dom 门禁）。
4. 触控输入按信任边界处理（非有限坐标/超量触点丢弃）。
5. 新逻辑必须有 Node 测试覆盖（tests/game-state.test.js 或 input-transform.test.js）。

## 已知待补（见实施计划）

- 双指缩放/平移视野（当前无镜头，全图显示）
- 音效、更多兵种/建筑/地图、胜负结算动画
- `scripts/build.js` 正式打包链
