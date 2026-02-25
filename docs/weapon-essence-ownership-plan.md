# 武器拥有 / 基质拥有改造计划（最终确认版）

## 1. 目标与范围
- 将现有单一“排除”语义拆分为两类状态：
  - 武器拥有状态：`weaponOwned（武器已拥有/未拥有）`
  - 基质拥有状态：`essenceOwned（基质已拥有/待刷）`
- 推荐框架改为基于“待刷目标”计算。
- 支持更灵活的显示过滤组合：
  - `hideEssenceOwnedWeapons（隐藏基质已拥有）`
  - `hideUnownedWeapons（隐藏武器未拥有）`
  - 两者可同时开启。
- 保留并扩展优先策略，使用单一比较器避免冲突。
- 清理旧加权字段与残留存储逻辑。

## 2. 最终确认的业务结论
1. `ownershipPriorityMode（拥有状态优先策略）` 的方向为“优先已拥有武器”。
2. `hideUnownedWeapons（隐藏武器未拥有）` 与 `hideFourStarWeapons（隐藏四星武器）` 均增加子开关，控制是否同步作用到左侧武器选择列表。
3. 允许状态组合：`weaponOwned=false` 且 `essenceOwned=true`（常见且必须支持）。
4. `pendingCount（待刷数量）` 定义为“已选中且 `essenceOwned=false`”。
5. 教程只演示 `essenceOwned（基质拥有状态）`，不再演示旧“排除”语义。

## 3. 目标数据模型
`weaponMarks` 统一升级为：

```js
{
  [weaponName]: {
    weaponOwned: boolean,   // 默认 true
    essenceOwned: boolean,  // 默认 false
    note: string
  }
}
```

派生集合与计数：
- `weaponOwnedNameSet`
- `weaponUnownedNameSet`
- `essenceOwnedNameSet`
- `selectedCount = selectedNames.length`
- `pendingCount = selectedNames 中 essenceOwned=false 的数量`
- `pendingSelectedWeapons = selectedWeaponRows 中 essenceOwned=false 的集合`

## 4. 配置项设计（方案推荐设置）

```js
{
  hideEssenceOwnedWeapons: boolean,
  hideUnownedWeapons: boolean,
  hideUnownedWeaponsInSelector: boolean,      // 子开关
  hideFourStarWeapons: boolean,
  hideFourStarWeaponsInSelector: boolean,     // 子开关
  preferredRegion1: string,
  preferredRegion2: string,
  regionPriorityMode: "ignore" | "strict" | "sameCoverage" | "sameEfficiency",
  ownershipPriorityMode: "ignore" | "strict" | "sameCoverage" | "sameEfficiency",
  strictPriorityOrder: "ownershipFirst" | "regionFirst"
}
```

说明：
- 旧 `priorityMode` 重命名为 `regionPriorityMode`。
- 新增 `ownershipPriorityMode`。
- `strictPriorityOrder` 仅在两者均为 `strict` 时生效。
- 删除旧字段：
  - `priorityStrength`
  - `prioritySecondaryWeight`

## 5. 排序规则（单一比较器）
统一在 `app.recommendations.js` 的单一比较器中处理：
1. 待刷覆盖数（硬优先）
2. 严格优先阶段（按 `strictPriorityOrder` 决定先比较“拥有”还是“地区”）
3. 效率主序（可同时刷数量、最大可刷数量）
4. 同覆盖优先阶段（对应 mode=`sameCoverage`）
5. 同效率优先阶段（对应 mode=`sameEfficiency`）
6. 稳定兜底（副本名、锁词条）

关键原则：
- 两项策略可同时开启。
- 顺序固定、结果稳定、冲突可解释。

## 6. 显示与文案策略
顶部计数：
- `已选 X / 待刷 Y`

方案区空态：
- `待刷为 0，当前无需刷取。`
- `当前筛选隐藏了全部结果。`

卡片徽章：
- `未拥有`
- `基质已有`

## 7. 旧数据迁移（新增独立模块）
新增独立迁移模块：`js/app.migration.js`，集中处理旧数据迁移逻辑，便于未来维护和整体下线。

### 7.1 触发条件
- 检测到旧结构数据（`weapon-marks:v1` 或 `excluded-notes:v1`）时触发。
- 即使用户已录入新版数据，若旧数据仍存在且未完成最终决策，仍会自动弹出迁移弹窗。

### 7.2 迁移弹窗要求
- 弹窗层级低于公告弹窗。
- 不支持点击空白关闭。
- 不支持 `Esc` 关闭。
- 必须通过按钮操作。

### 7.3 操作与二次确认
主弹窗提供：
- 开始迁移
- 放弃旧数据
- 稍后再说

所有操作都必须进入二次确认弹窗；二次确认同样：
- 不支持点击空白关闭
- 不支持 `Esc` 关闭
- 必须点击按钮确认/取消
- 使用醒目警告色
- 高亮当前选择的迁移方案

### 7.4 迁移方案与冲突策略
迁移方案（先选其一）：
- `excluded=true -> essenceOwned=true`
- `excluded=true -> weaponOwned=false`

冲突策略（仅在检测到冲突时显示）：
- 仅补全缺失（推荐）
- 旧数据覆盖新数据
- 保留新数据，跳过冲突

说明：
- 若无冲突，不显示冲突策略。
- 若有冲突，必须先选择冲突策略再可确认迁移。

### 7.5 风险提示（弹窗文案必须包含）
- 建议尽快完成迁移。
- 若持续“稍后再说”并继续编辑，后续冲突与人工核对成本可能增加。
- 若后续网站更新，可能带来更多不确定性。

## 8. 文件级改造清单
### 8.1 状态与计算
- `js/app.weapons.js`
  - 替换 `excluded` 语义，新增拥有/基质状态读写方法。
  - 新增派生集合、计数与 `pendingSelectedWeapons`。
- `js/app.recommendations.js`
  - 目标池改为 `pendingSelectedWeapons`。
  - 合并地区优先与拥有优先到单一比较器。
- `js/app.recommendations.display.js`
  - 显示过滤改为 `hideEssenceOwnedWeapons + hideUnownedWeapons`。

### 8.2 配置与存储
- `js/app.state.js`
  - 更新 `recommendationConfig` 默认结构。
  - 新增迁移状态字段。
- `js/app.storage.js`
  - 更新配置清洗与兼容迁移入口。
  - 主 marks key 升级：`weapon-marks:v2`。
  - 读取旧 marks 作为“待迁移数据源”，不再静默自动迁移。

### 8.3 迁移模块
- `js/app.migration.js`（新增）
  - 检测旧数据
  - 迁移预演（冲突统计）
  - 二次确认流程
  - 执行迁移/放弃
  - 状态持久化

### 8.4 模板与交互
- `js/templates.plan-config.js`
  - 新增两个隐藏开关及其子开关
  - 新增 `ownershipPriorityMode`、`strictPriorityOrder`
- `js/templates.main.01.js`
  - 顶部计数改为 `已选 X / 待刷 Y`
  - “排除”交互改为“武器拥有 + 基质拥有”双开关
- `js/templates.main.02.js`
  - 覆盖/空态文案改为待刷口径
- `js/templates.main.03.js`
  - 新增迁移弹窗与二次确认弹窗
- `js/app.main.js`
  - 暴露新增状态与方法给模板

### 8.5 教程与多语言
- `js/app.tutorial.js`
  - “排除武器”步骤改为“标记基质已有”
- `data/i18n.zh-CN.js`
- `data/i18n.en.js`
- `data/i18n.zh-TW.js`
- `data/i18n.ja.js`
  - 新增/替换必要词条

### 8.6 样式
- `css/styles.weapons.css`
- `css/styles.overlays.css`
- `css/styles.recommendations.css`
  - 新增 `.is-unowned`、`.is-essence-owned`、迁移弹窗相关样式

## 9. 验收清单
功能验收：
- 四种显示组合行为正确：
  - 仅隐藏基质已有
  - 仅隐藏武器未拥有
  - 同时隐藏两者
  - 全部不隐藏
- `已选 X / 待刷 Y` 与状态一致。
- `pendingCount` 定义正确（仅按 `essenceOwned=false`）。
- 严格优先顺序切换后排序可解释且稳定。
- 迁移弹窗行为符合确认要求（不可点空白关闭、二次确认生效）。
- 冲突策略仅在冲突存在时显示。

语法检查（按 AGENTS 要求）：
- `node --check js/bootstrap.entry.js`
- `node --check js/app.js`
- `node --check js/app.main.js`
- `node --check js/app.embed.js`
- `node --check js/app.ui.js`
- `node --check js/templates.plan-config.js`
- `node --check js/templates.main.01.js`
- `node --check js/templates.main.02.js`
- `node --check js/templates.main.03.js`
- `node --check js/app.migration.js`

## 10. 实施顺序建议
1. 先做状态模型与存储改造。
2. 再新增迁移模块与弹窗流程。
3. 再做推荐比较器与显示过滤。
4. 再改模板交互与文案。
5. 最后处理教程、多语言与样式收尾。