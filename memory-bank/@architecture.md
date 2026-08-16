# 架构映射（@architecture）

> 「Always 先读」文档之二。写代码前先读本文件，明白每个文件的作用与责任边界。
> 原则：单向数据流、单一职责、跨模块接口稳定；升级上游只改 `build-config.json`（ADR-0004）。

## 目录结构

```
game.js                    抖音小游戏入口：装配 adapter -> 启动状态屏 -> bindTouch -> 预留引擎加载点
game.json / project.config.json   平台配置（横屏/首包/compileType=game/游客 appid）
build-config.json          单点配置：版本 / CDN / 视口 / 单机模式 / 包体预算 / 域名白名单
config.ini / servers.ini   引擎配置（敏感：单机开关 / Sentry 已禁用 / CDN https）
adapter/                   自研适配层（Phase 0 基础）
  config.js                配置加载器（读 __RA2WEB_CONFIG__，回退 BUILTIN）
  index.js                 createAdapter：装配 global/viewport/synthesizer/eventTarget + bindTouch
  core/GlobalScope.js      全局面：window/document/self 聚合，挂 tt.* 绑定
  core/ViewportTransform.js 1024x768 letterbox 视口 + 物理<->逻辑坐标换算
  dom/EventTarget.js       最小事件目标 + 事件工厂（Phase 1 迷你 DOM 的基础）
  input/EventSynthesizer.js 触控手势 -> 鼠标/wheel 事件合成（信任边界输入过滤）
scripts/
  check-size.js            包体预算守卫（build-config.json 预算）
  audit-dom.js             移植层无裸 DOM/BOM 引用扫描
  quality-gate.js          一键质量门禁（test + audit + size + format）
  build.js                 （M1）esbuild 打包 lib 链 + 引擎为 CommonJS 单包
tests/
  mock-tt.js               tt.* 运行时 mock（无头冒烟）
  boot.test.js             game.js 可加载 / adapter 可装配 / 全局面语义
  input-transform.test.js  视口换算 + 手势合成边界用例
docs/                      决策(ADR-0001..0004) / 触控方案 / 安全合规 / 路线图 / 版本手册
memory-bank/               本文档 + GDD + 实施计划 + progress（Always 先读）
assets/releases/0.83.4-r0918ad8-dac2bf5b2/  上游引擎压缩产物（只读，不可手改）
runtime/releases/0.83.4-r0918ad8-dac2bf5b2/  WASM 运行时（只读）
CONTRIBUTING.md / README.md / PORTING.md     协作规范 / 项目说明 / 移植状态
```

## 事件流向（当前 Phase 0）

```
tt.onTouch* -> EventSynthesizer（手势判定/坐标换算前的物理坐标）
             -> bindTouch 回调（ViewportTransform.toLogical 过滤黑边）
             -> EventTarget（冒泡链）-> [Phase 1] 引擎 DOM 树
```

## 关键不变量（改动前必须确认不破坏）

1. 引擎逻辑分辨率恒为 1024x768（`config.viewport`），触控坐标必须经 `ViewportTransform.toLogical` 换算且黑边外返回 null。
2. `adapter/config.js` 是引擎版本/路径的唯一读取处；升级上游只改 `build-config.json`。
3. `config.ini`/`servers.ini`/`assets`/`runtime` 为敏感只读区（见 CONTRIBUTING）。
4. 运行环境无 DOM/BOM：任何新代码禁止裸用 `window./document./self.`（audit-dom 门禁）。
5. 触控输入按信任边界处理（非有限坐标/超量触点丢弃）。

## 已知待补（见实施计划）

- `scripts/build.js` 打包链（M1.1）
- 迷你 DOM 树 / Image/Audio/网络/文件系统桥 / ScriptRegistry（M1.2-M1.3）
- 渲染接管与触屏 HUD（M2）
