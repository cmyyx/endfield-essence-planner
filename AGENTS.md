# Development Guide
# AGENTS Development Guide

## 1. MCP 使用约定
- `ace-tool.search_context`：优先用于语义级代码定位、跨文件流程理解、改动影响面分析。
- `desktop-commander`：用于目录/文件读取、编辑、搜索、语法检查与本地命令执行。
- `context7`：仅在使用第三方库且本地信息不足时，查询官方文档与示例。
- `fetch`：仅在需要联网验证外部信息时使用。

## 2. 项目基线与部署
- 项目是静态站点，可直接发布仓库文件；为支持“主动更新检测”，建议在部署前执行版本元数据生成脚本。
- 运行时必须包含 `vendor/vue.global.prod.js`（本地依赖，不依赖 CDN 作为核心运行前提）。
- 核心数据文件在 `data/`：`data/dungeons.js`、`data/weapons.js`、`data/weapon-images.js`、`data/content.js`、`data/version.js`、`data/version.json`。
- 更新检测模块：`js/app.update.js`（轮询 `data/version.json` 并显示右下角提示）。
- 版本元数据脚本：`scripts/gen-version.mjs`（从 `index.html` 与 `data/content.js` 生成 `data/version.js/json`）。
- 部署平台（Cloudflare Pages / ESA Pages）建议配置：
  - Build command：`node scripts/gen-version.mjs`
  - Output directory：`.`
- Cloudflare Worker/Pages 配置以 `wrangler.jsonc` 为准：
  - `compatibility_date: "2025-07-01"`
  - `assets.directory: "."`

## 3. 官方检测与本地预览
- 官方部署信号由响应头控制：`x-endfield-essence-planner-official: 1`。
- 仅当响应头值为 `1` 时，才启用“非官方域名提示 / iframe 内嵌提示”（见 `js/app.embed.js`）。
- 开源二次部署默认不加该响应头，不应触发官方域名提示。
- 本地广告位调试规则（见 `js/app.ui.js`）：
  - 仅 `127.0.0.1` / `localhost` / `::1` 可用 `?adPreview=1`。
  - 广告关闭状态为单次会话内存态（`adDismissedSession`），刷新后恢复。

## 4. 启动链路（必须理解）
- `index.html` 只保留最小壳：`#app-preload`、`#app`、`./js/app.script-chain.js`、`./js/bootstrap.entry.js`。
- `js/bootstrap.entry.js` 是唯一前置入口，负责：
  - preload 主题预应用（`planner-theme-mode:v1` + `prefers-color-scheme`）。
  - preload 动态状态（当前加载项、计数、进度）。
  - 关键资源加载：`cssFiles` 与 `startupScripts`（含 `./data/version.js`）。
  - 统一错误渲染：`window.__renderBootError(...)`。
  - 不刷新重试：`window.__startBootstrapEntry({ fromRetry: true })`。
- `js/app.js` 继续加载模块链（`window.__APP_SCRIPT_CHAIN` 或默认清单）。
- `js/app.main.js` 负责 `createApp(...).mount("#app")`，并在依赖/数据缺失时走错误页。
- 模板分片文件：`js/templates.plan-config.js`、`js/templates.main.01.js`、`js/templates.main.02.js`、`js/templates.main.03.js`（单文件尽量 < 1000 行）。

## 4.1 可选资源（Optional）接入规范
- 可选资源统一在 `js/bootstrap.entry.js` 的 `optionalScriptConfigs` 中声明。
- 现已支持“配置驱动”可选加载：超时、重试、失败上报、非阻塞启动均由通用逻辑处理。
- 新增可选脚本时，默认只需在 `optionalScriptConfigs` 增加一项；无需再单独写一段专用加载代码。
- 配置项说明（每个资源一条）：
  - `featureKey`：功能标识（用于弹窗文案映射 `optional_feature_{featureKey}`）。
  - `timeoutMs`：单次加载超时（毫秒，默认 `12000`）。
  - `retryDelayMs`：重试间隔（毫秒，默认 `1200`）。
  - `maxRetries`：重试次数（默认 `1`，即最多尝试 2 次）。
  - `validate`：可选函数，脚本加载后进行 API 可用性校验；返回 `false` 视为加载失败。
- 推荐做法：
  - 如果脚本只要加载成功就能用，可不写 `validate`。
  - 如果脚本可能“请求成功但 API 未挂载”，必须写 `validate`（如拼音库）。
- i18n 要求：
  - 需要在 boot i18n 与应用 i18n 中提供 `optional_feature_{featureKey}` 对应文案，避免弹窗出现原始 key。
- 行为约定：
  - 可选资源失败不会阻断页面启动。
  - 失败会进入统一异常弹窗（“可选功能加载失败”）。
  - 同一资源同一功能失败会按签名去重，避免重复刷屏。

## 5. 失败与恢复机制
- preload 不按固定时间自动消失，只能在可进入页面时由 `__finishPreload()` 收起。
- `bootstrap.entry.js` 加载失败时，`index.html` 的 `onerror` 会显示最小降级错误页（无依赖兜底）。
- 关键 CSS/JS/数据加载失败时，统一显示可读错误页，并提供：
  - `重试加载`（重跑启动流程，不刷新整页）。
  - `刷新页面`（硬刷新兜底）。

## 6. 改动时必须同步维护的点
- 新增/删除 `app.*.js` 模块：必须更新 `js/app.script-chain.js`（唯一脚本链来源）。
- 新增首屏关键样式或关键启动资源：必须评估并更新 `js/bootstrap.entry.js` 中：
  - `cssFiles`
  - `startupScripts`
- 调整 preload 结构文案时：同步检查 `index.html` 与 `js/bootstrap.entry.js` 中的 preload DOM 构造逻辑。
- 调整官方检测逻辑时：同步更新 `README.md` 对响应头行为的说明。
- 若更新检测依赖字段有变更（`buildId` / `displayVersion` / `announcementVersion` / `fingerprint` / `publishedAt`）：
  - 同步更新 `scripts/gen-version.mjs`、`js/app.update.js` 与 `README.md` 字段说明。
- 调整 `data/content.js` 中 `announcement.version` 后：
  - 发布前必须重新执行 `node scripts/gen-version.mjs`，确保 `data/version.js/json` 同步。

## 7. 安全与实现约束
- 不把不可信输入直接写入 `innerHTML`/`outerHTML`/`document.write`。
- 纯文本展示优先使用 `textContent` 或 DOM API 创建节点。
- 必须渲染 HTML 时，先做严格白名单清洗（例如 DOMPurify）。

## 8. 提交前最低检查
- 语法检查：
  - `node --check js/bootstrap.entry.js`
  - `node --check js/app.js`
  - `node --check js/app.main.js`
  - `node --check js/app.update.js`
  - `node --check js/app.embed.js`
  - `node --check js/app.ui.js`
  - `node --check scripts/gen-version.mjs`
  - `node --check js/templates.plan-config.js`
  - `node --check js/templates.main.01.js`
  - `node --check js/templates.main.02.js`
  - `node --check js/templates.main.03.js`
- 手工验证：
  - 正常启动可进入应用，preload 文案与主题正常。
  - 断网或拦截关键资源时能进入错误页并可重试恢复。
  - 本地 `?adPreview=1` 有效。
  - 官方 header=1 与非官方部署两种场景行为符合预期。
  - 保持页面不刷新，更新 `data/version.json` 后可出现右下角“检测到新版本”提示。

## 9. 快速导航
- `index.html`：最小页面壳 + bootstrap 入口与兜底。
- `js/app.script-chain.js`：应用脚本链单一来源（供 preload 计数与 `app.js` 共用）。
- `css/styles.preload.css`：preload 样式与主题过渡。
- `js/bootstrap.entry.js`：启动与错误恢复核心。
- `js/app.js`：模块链加载器。
- `js/app.main.js`：Vue 应用入口。
- `js/app.update.js`：主动更新检测与右下角更新提示。
- `js/app.embed.js`：官方域名/内嵌检测。
- `js/app.ui.js`：显示、预览与会话关闭状态。
- `scripts/gen-version.mjs`：生成 `data/version.js/json` 的版本元数据脚本。
