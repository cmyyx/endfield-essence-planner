# 终末地基质规划器 (Endfield Essence Planner)

一款面向《明日方舟：终末地》玩家的本地化网页工具，用于基质刷取规划与多武器共刷方案推荐。  
本项目为玩家自制，旨在提供可视化的基质刷取规划，数据仍可能存在偏差，欢迎反馈修正。

## 功能概览

- **武器选择器**：搜索 + 多选，左侧以卡片形式快速选择武器
- **方案推荐**：基于副本池与锁定规则生成可刷方案，展示锁定策略与可共刷武器列表
- **冲突提示**：基础属性超出 3 种时提示冲突，并高亮显示
- **单武器副产物**：单选武器时显示该副本可顺带刷到的其他武器
- **更新检测提示**：页面长期驻留时会周期检测新版本，并在右下角提示“当前版本 / 最新版本”

## 运行方式

本项目为静态站点，可直接发布仓库文件。运行时无需打包构建产物。

1. 将依赖文件放到 `vendor/` 目录：
   - `vendor/vue.global.prod.js`
2. 确保武器图片放在 `image/` 目录（图片文件名需与武器名称一致）

## 部署说明（Cloudflare Pages / ESA Pages）

为保证“主动更新检测”可用，建议在平台构建命令中执行版本元数据生成脚本：

- `Build command`：`node scripts/gen-version.mjs`
- `Output directory`：`.`

说明：

- 无需安装额外第三方依赖（脚本仅使用 Node 内置模块）。
- 无需把构建命令写入 `wrangler.jsonc`，在平台项目设置中配置即可。
- 若你是手动本地部署，请先执行一次 `node scripts/gen-version.mjs` 再上传。

## 数据位置

为方便后续更新，数据集中在：

- 副本池：`data/dungeons.js`
- 武器数据：`data/weapons.js`
- 武器图片清单：`data/weapon-images.js`
- 公告内容与公告版本号：`data/content.js`（`announcement.version`）
- 版本元数据（自动生成）：`data/version.js`、`data/version.json`

## 版本元数据说明

`scripts/gen-version.mjs` 会生成 `data/version.js` 与 `data/version.json`，字段含义如下：

- `buildId`：14 位 UTC 时间戳（`YYYYMMDDHHmmss`，用于更新检测比对；前端按“不相等即有变化”处理）
- `displayVersion`：用于界面展示的版本文案，由 `announcementVersion`、`buildId` 与 `toDisplayTime(buildId)` 计算生成，格式为 `v{announcementVersion}@{YYMMDD-HHmm}`（例如 `v1.2.3@240301-1530`）；当公告版本缺失时回退为 `v0.0.0@{buildId}`
- `announcementVersion`：公告版本号（来源于 `data/content.js` 的 `announcement.version`）
- `fingerprint`：当前页面资源指纹（来源于 `index.html` 的 `data-fingerprint`）
- `publishedAt`：发布时间（ISO 时间，前端展示时会转换为设备本地时区）

建议维护方式：

- 日常代码发布：只需确保部署时会执行 `node scripts/gen-version.mjs`
- 公告更新：手动更新 `data/content.js` 的 `announcement.version`，脚本会自动同步到版本文件

## 游戏适配版本提示（手动维护）

在 `data/content.js` 中可维护 `gameCompat`：

- `supportedVersion`：站点当前已适配的游戏版本（例如 `1.0`）
- `nextVersion`：下一目标游戏版本（例如 `1.1`）
- `nextVersionAt`：下一版本预计开启时间（可选，建议 ISO UTC，如 `2026-03-12T04:00:00Z`）

提醒规则：

- 当 `nextVersionAt` 未设置时，仅显示适配版本，不触发到时提醒
- 当设备时间已超过 `nextVersionAt` 且 `supportedVersion < nextVersion` 时，页面左下角会展开提醒

## 规则说明（简要）

- **基础属性**：从 5 种中选择 3 种（产出必定在这 3 种内）
- **附加 / 技能属性**：二选一锁定，被锁定的词条必出
- **共刷方案**：需同时满足所有武器的附加/技能属性池与锁定规则

## 赞助支持

您的赞助将用于服务器维护，功能开发，内容创作。

| 支付宝 | 微信赞赏码 |
| --- | --- |
| ![](sponsors/alipay.jpg) | ![](sponsors/wechat.png) |

## 许可证

本项目使用 **AGPL-3.0**（GNU Affero General Public License v3.0）。
