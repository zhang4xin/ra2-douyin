# 版本升级手册（release-versioning）

> 依据 ADR-0004：锁上游 `0.83.4`，自有版本 `0.83.4-dy.N`，版本/路径单点配置于 `build-config.json`。

## 日常迭代（不打上游引擎）

1. 改代码 → `npm test` → `npm run audit-dom` → `npm run check-size` → `npm run format:check`。
2. Conventional Commits 提交，squash 合入 main。
3. maintainer 打 tag `v0.83.4-dy.N` 并发 Release Notes（模板见下）。

## 升级上游引擎（0.83.x）

1. 下载新版 release 目录，替换到 `assets/releases/<新版本>/` 与 `runtime/releases/<新版本>/`。
2. 修改 `build-config.json`：
   - `engine.upstreamVersion`、`engine.engineDir`、`engine.runtimeDir`；
   - `version` 改为 `0.83.x-dy.0`。
3. 跑 `scripts/audit-api.js`（P1 上线后）：比对引擎暴露的 DOM/API 面与适配层覆盖，补齐缺口。
4. 回归：`npm test` + 开发者工具冒烟 + 真机三档（低/中/高）跑 F1/F2/F4 子集。
5. 存档兼容性：0.83.4 存档能在新版读取（或显式迁移）。
6. 检查资源 manifest：CDN 清单与 config.ini 引用一致性（hash/大小/域名）。

## Release Notes 模板

```markdown
## v0.83.4-dy.N
- 引擎版本：0.83.4-r0918ad8-dac2bf5b2
- 资源版本：<hash>
- CDN 域名清单：stdres.wangerhuoda.cn / gmap.wangerhuoda.cn / download.ra2web.com
- 测试机型：<列表>
- 回滚点：<上一 tag>
- 变更：...
```
