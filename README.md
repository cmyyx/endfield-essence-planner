# 终末地基质规划器 (Endfield Essence Planner)

一款面向《明日方舟：终末地》玩家的本地化网页工具，用于基质刷取规划与多武器共刷方案推荐。

## 功能概览

- 武器搜索与多选
- 副本共刷方案推荐与冲突提示
- 单武器副产物展示
- 页面驻留时的主动更新检测提示

## 运行与部署（摘要）

项目是静态站点，直接发布仓库文件即可。

1. 确保本地依赖存在：`vendor/vue.global.prod.js`
2. 确保图片目录完整：`image/`
3. 部署前执行：`node scripts/gen-version.mjs`

推荐平台配置：
- Build command: `node scripts/gen-version.mjs`
- Output directory: `.`

## 维护与门禁文档

完整执行清单、启动链约束、Phase 6 继承治理与 Phase 7 文档门禁，请以 [AGENTS.md](./AGENTS.md) 为唯一真源。

本 README 仅保留项目摘要，不再重复维护完整执行 checklist。

## 核心数据位置（摘要）

- `data/dungeons.js`
- `data/weapons.js`
- `data/weapon-images.js`
- `data/content.js`
- `data/version.js`
- `data/version.json`

## 赞助支持

您的赞助将用于服务器维护，功能开发，内容创作。

| 支付宝 | 微信赞赏码 |
| --- | --- |
| ![](sponsors/alipay.jpg) | ![](sponsors/wechat.png) |

## 许可证

本项目使用 **AGPL-3.0**（GNU Affero General Public License v3.0）。
