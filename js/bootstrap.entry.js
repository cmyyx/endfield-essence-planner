(function () {
  var root = document.documentElement;
  var themeStorageKey = "planner-theme-mode:v1";
  var runSerial = 0;
  var cssFiles = [
    "./css/styles.theme.css",
    "./css/styles.layout.css",
    "./css/styles.overlays.css",
    "./css/styles.filters.css",
    "./css/styles.weapons.css",
    "./css/styles.recommendations.css",
    "./css/styles.gear-refining.css",
    "./css/styles.theme.modes.css",
  ];
  var startupScripts = [
    "./vendor/vue.global.prod.js",
    "./data/version.js",
    "./data/dungeons.js",
    "./data/weapons.js",
    "./data/gears.js",
    "./data/weapon-images.js",
    "./data/i18n.zh-CN.js",
    "./js/app.script-chain.js",
    "./js/app.js",
  ];
  var optionalScriptConfigs = {
    "./vendor/pinyin-pro.min.js": {
      featureKey: "pinyin",
    },
  };
  var langStorageKey = "planner-lang";
  var fallbackBootLocale = "zh-CN";
  var supportedBootLocales = ["zh-CN", "zh-TW", "en", "ja"];
  var bootI18n = {
    "zh-CN": {
      preload_title: "少女祈祷中",
      preload_note: "首次打开或强制刷新可能稍慢",
      preload_status_prepare: "正在准备资源…",
      preload_status_failed: "资源加载失败",
      preload_status_ready: "资源已就绪，正在初始化页面…",
      preload_status_background_prepare: "资源已就绪，正在准备背景…",
      preload_status_staging: "资源已下载，正在启动下一阶段…",
      preload_status_parallel: "正在并行加载资源…",
      preload_status_loading: "正在加载资源…",
      preload_current_failed: "失败项：{label}",
      preload_current_parallel: "并行：{labels}{more}",
      preload_current_parallel_more: " 等 {count} 项",
      preload_current_done: "已完成：{labels}",
      preload_current_now: "当前：{label}",
      preload_current_wait_stage: "最近完成：{labels}；等待下一阶段…",
      preload_current_wait_core: "当前：等待核心模块启动…",
      preload_current_background: "当前：背景",
      preload_current_wait_mount: "等待应用挂载完成…",
      preload_help_short: "加载时间较长通常由网络波动或缓存导致，请稍候。",
      preload_help_long:
        "若长时间无变化，可点击“重试加载”或“刷新页面”；仍未恢复请点击“反馈问题”。",
      action_retry: "重试加载",
      action_refresh: "刷新页面",
      action_feedback: "反馈问题",
      unknown_resource: "未知资源",
      unknown_item: "未知",
      error_title_page_load: "页面加载失败",
      error_summary_unknown: "出现未知错误，请稍后重试。",
      error_details_title: "错误详情",
      error_suggestions_title: "建议处理",
      error_title_resource: "页面资源加载失败",
      error_summary_script_chain_missing: "脚本加载清单缺失，应用暂时无法启动。",
      error_detail_missing_chain: "缺失资源清单：window.__APP_SCRIPT_CHAIN",
      error_detail_confirm_chain: "请确认 ./js/app.script-chain.js 已成功部署且可访问",
      error_summary_core_script: "核心脚本未能完整加载，应用暂时无法启动。",
      error_summary_core_resource: "核心资源未能完整加载，应用暂时无法启动。",
      error_summary_http_404: "检测到资源路径错误（404），请检查部署目录与访问路径。",
      error_summary_http_403: "检测到资源访问被拒绝（403），请检查访问策略或防护规则。",
      error_summary_http_429: "检测到请求过于频繁（429），请稍后重试。",
      error_summary_http_5xx: "检测到服务端异常（5xx），请稍后重试。",
      error_title_style: "页面样式加载失败",
      error_summary_style: "关键样式文件未能完整加载，页面无法正常展示。",
      error_detail_failed_style: "失败样式：{name}",
      error_detail_failed_resource: "失败资源：{name}",
      error_detail_network_state: "网络状态：{state}",
      error_network_online: "在线",
      error_network_offline: "离线",
      error_detail_http_status: "HTTP 状态：{status}{hint}",
      error_detail_failed_reason: "失败原因：{reason}",
      error_hint_flaky:
        "可能原因：网络波动、缓存损坏、CDN 同步延迟或拦截插件阻止脚本请求",
      error_reason_http: "资源请求返回了错误状态",
      error_reason_error: "浏览器触发了资源加载错误事件",
      error_reason_stalled: "资源长时间未进入可用状态（可能连接悬挂或被拦截）",
      error_reason_stalled_with_status:
        "资源请求有响应，但样式未进入就绪状态（可能连接悬挂或被拦截）",
      http_404: "资源不存在或路径错误",
      http_429: "请求过于频繁（可能被限速）",
      http_403: "访问被拒绝（也可能触发了访问频率限制）",
      http_5xx: "服务端异常",
      suggestion_retry: "点击“重试加载”重新请求关键资源",
      suggestion_hard_refresh: "按 Ctrl + F5 强制刷新后重试",
      suggestion_issue_screenshot: "若问题持续，请在 GitHub Issues 附上控制台报错截图",
      list_sep: "、",
      preload_current_optional_failed: "可选失败：{label}",
      optional_modal_title: "可选功能加载失败",
      optional_modal_summary: "部分可选功能未能加载，页面主体仍可继续使用。",
      optional_modal_detail_features: "失败功能：{features}",
      optional_modal_detail_resources: "失败资源：{resources}",
      optional_modal_detail_non_blocking: "影响说明：仅影响可选功能，不影响核心功能。",
      optional_feature_pinyin: "拼音搜索",
      optional_feature_i18n: "扩展语言支持",
      optional_feature_notice_content: "公告与说明内容",
      optional_feature_sponsor_data: "赞助名单展示",
      optional_feature_weapon_images: "武器图片索引",
      optional_feature_version_meta: "版本元数据展示",
      optional_feature_core_data: "核心游戏数据",
      optional_feature_ui_scripts: "界面交互脚本",
      optional_feature_runtime: "页面运行时依赖",
    },
    "zh-TW": {
      preload_title: "少女祈禱中",
      preload_note: "首次開啟或強制重新整理可能稍慢",
      preload_status_prepare: "正在準備資源…",
      preload_status_failed: "資源載入失敗",
      preload_status_ready: "資源已就緒，正在初始化頁面…",
      preload_status_background_prepare: "資源已就緒，正在準備背景…",
      preload_status_staging: "資源已下載，正在啟動下一階段…",
      preload_status_parallel: "正在並行載入資源…",
      preload_status_loading: "正在載入資源…",
      preload_current_failed: "失敗項：{label}",
      preload_current_parallel: "並行：{labels}{more}",
      preload_current_parallel_more: " 等 {count} 項",
      preload_current_done: "已完成：{labels}",
      preload_current_now: "目前：{label}",
      preload_current_wait_stage: "最近完成：{labels}；等待下一階段…",
      preload_current_wait_core: "目前：等待核心模組啟動…",
      preload_current_background: "目前：背景",
      preload_current_wait_mount: "等待應用掛載完成…",
      preload_help_short: "載入較慢通常由網路波動或快取導致，請稍候。",
      preload_help_long:
        "若長時間無變化，可點擊「重試載入」或「重新整理頁面」；仍未恢復請點擊「回報問題」。",
      action_retry: "重試載入",
      action_refresh: "重新整理頁面",
      action_feedback: "回報問題",
      unknown_resource: "未知資源",
      unknown_item: "未知",
      error_title_page_load: "頁面載入失敗",
      error_summary_unknown: "發生未知錯誤，請稍後再試。",
      error_details_title: "錯誤詳情",
      error_suggestions_title: "建議處理",
      error_title_resource: "頁面資源載入失敗",
      error_summary_script_chain_missing: "腳本載入清單缺失，應用暫時無法啟動。",
      error_detail_missing_chain: "缺失資源清單：window.__APP_SCRIPT_CHAIN",
      error_detail_confirm_chain: "請確認 ./js/app.script-chain.js 已成功部署且可訪問",
      error_summary_core_script: "核心腳本未完整載入，應用暫時無法啟動。",
      error_summary_core_resource: "核心資源未完整載入，應用暫時無法啟動。",
      error_summary_http_404: "偵測到資源路徑錯誤（404），請檢查部署目錄與訪問路徑。",
      error_summary_http_403: "偵測到資源存取被拒（403），請檢查存取策略或防護規則。",
      error_summary_http_429: "偵測到請求過於頻繁（429），請稍後再試。",
      error_summary_http_5xx: "偵測到伺服器異常（5xx），請稍後再試。",
      error_title_style: "頁面樣式載入失敗",
      error_summary_style: "關鍵樣式檔未完整載入，頁面無法正常展示。",
      error_detail_failed_style: "失敗樣式：{name}",
      error_detail_failed_resource: "失敗資源：{name}",
      error_detail_network_state: "網路狀態：{state}",
      error_network_online: "連線中",
      error_network_offline: "離線",
      error_detail_http_status: "HTTP 狀態：{status}{hint}",
      error_detail_failed_reason: "失敗原因：{reason}",
      error_hint_flaky:
        "可能原因：網路波動、快取損壞、CDN 同步延遲或攔截外掛阻止了腳本請求",
      error_reason_http: "資源請求返回了錯誤狀態",
      error_reason_error: "瀏覽器觸發了資源載入錯誤事件",
      error_reason_stalled: "資源長時間未進入可用狀態（可能連線懸掛或被攔截）",
      error_reason_stalled_with_status:
        "資源請求有回應，但樣式未進入就緒狀態（可能連線懸掛或被攔截）",
      http_404: "資源不存在或路徑錯誤",
      http_429: "請求過於頻繁（可能被限速）",
      http_403: "存取被拒絕（也可能觸發了頻率限制）",
      http_5xx: "伺服器異常",
      suggestion_retry: "點擊「重試載入」重新請求關鍵資源",
      suggestion_hard_refresh: "按 Ctrl + F5 強制重新整理後重試",
      suggestion_issue_screenshot: "若問題持續，請在 GitHub Issues 附上控制台錯誤截圖",
      list_sep: "、",
      preload_current_optional_failed: "可選失敗：{label}",
      optional_modal_title: "可選功能載入失敗",
      optional_modal_summary: "部分可選功能未能載入，頁面主體仍可繼續使用。",
      optional_modal_detail_features: "失敗功能：{features}",
      optional_modal_detail_resources: "失敗資源：{resources}",
      optional_modal_detail_non_blocking: "影響說明：僅影響可選功能，不影響核心功能。",
      optional_feature_pinyin: "拼音搜尋",
      optional_feature_i18n: "擴展語言支援",
      optional_feature_notice_content: "公告與說明內容",
      optional_feature_sponsor_data: "贊助名單展示",
      optional_feature_weapon_images: "武器圖片索引",
      optional_feature_version_meta: "版本中繼資料顯示",
      optional_feature_core_data: "核心遊戲資料",
      optional_feature_ui_scripts: "介面互動腳本",
      optional_feature_runtime: "頁面執行時依賴",
    },
    en: {
      preload_title: "少女祈祷中 / A Maiden at Prayer...",
      preload_note: "First load or hard refresh may be a bit slow",
      preload_status_prepare: "Preparing resources...",
      preload_status_failed: "Resource loading failed",
      preload_status_ready: "Resources ready, initializing page...",
      preload_status_background_prepare: "Resources ready, preparing background...",
      preload_status_staging: "Resources downloaded, starting next stage...",
      preload_status_parallel: "Loading resources in parallel...",
      preload_status_loading: "Loading resources...",
      preload_current_failed: "Failed: {label}",
      preload_current_parallel: "Parallel: {labels}{more}",
      preload_current_parallel_more: " and {count} more",
      preload_current_done: "Done: {labels}",
      preload_current_now: "Current: {label}",
      preload_current_wait_stage: "Recently done: {labels}; waiting for next stage...",
      preload_current_wait_core: "Current: waiting for core modules...",
      preload_current_background: "Current: background",
      preload_current_wait_mount: "Waiting for app mount...",
      preload_help_short: "Longer loading is usually caused by network or cache. Please wait.",
      preload_help_long:
        "If progress stalls for long, try Retry or Refresh. If it still fails, use Report Issue.",
      action_retry: "Retry",
      action_refresh: "Refresh",
      action_feedback: "Report Issue",
      unknown_resource: "Unknown resource",
      unknown_item: "Unknown",
      error_title_page_load: "Page Load Failed",
      error_summary_unknown: "An unknown error occurred. Please try again later.",
      error_details_title: "Error Details",
      error_suggestions_title: "Suggested Actions",
      error_title_resource: "Resource Load Failed",
      error_summary_script_chain_missing: "Script chain is missing. The app cannot start right now.",
      error_detail_missing_chain: "Missing manifest: window.__APP_SCRIPT_CHAIN",
      error_detail_confirm_chain: "Please verify ./js/app.script-chain.js is deployed and accessible",
      error_summary_core_script: "Core scripts failed to load completely.",
      error_summary_core_resource: "Core resources failed to load completely.",
      error_summary_http_404: "Detected a 404 resource path error. Please verify deployment directory and URL path.",
      error_summary_http_403: "Detected a 403 access denial. Please check access policy or protection rules.",
      error_summary_http_429: "Detected too many requests (429). Please retry in a moment.",
      error_summary_http_5xx: "Detected a server-side error (5xx). Please retry later.",
      error_title_style: "Stylesheet Load Failed",
      error_summary_style: "Critical styles failed to load. The page cannot render correctly.",
      error_detail_failed_style: "Failed stylesheet: {name}",
      error_detail_failed_resource: "Failed resource: {name}",
      error_detail_network_state: "Network: {state}",
      error_network_online: "online",
      error_network_offline: "offline",
      error_detail_http_status: "HTTP status: {status}{hint}",
      error_detail_failed_reason: "Failure reason: {reason}",
      error_hint_flaky:
        "Possible causes: network fluctuation, broken cache, CDN propagation delay, or blocking extensions.",
      error_reason_http: "The request returned an error status",
      error_reason_error: "The browser fired a resource error event",
      error_reason_stalled:
        "The resource never became usable for too long (possible hanging connection or interception)",
      error_reason_stalled_with_status:
        "The request responded, but the stylesheet never became ready (possible hanging connection or interception)",
      http_404: "Resource not found or wrong path",
      http_429: "Too many requests (possibly rate limited)",
      http_403: "Access denied (can also indicate request rate limiting)",
      http_5xx: "Server error",
      suggestion_retry: "Click Retry to request critical resources again",
      suggestion_hard_refresh: "Press Ctrl + F5 for a hard refresh and retry",
      suggestion_issue_screenshot: "If the issue persists, attach console screenshots in GitHub Issues",
      list_sep: ", ",
      preload_current_optional_failed: "Optional failed: {label}",
      optional_modal_title: "Optional Feature Load Failed",
      optional_modal_summary: "Some optional features could not be loaded. Core page usage is still available.",
      optional_modal_detail_features: "Affected features: {features}",
      optional_modal_detail_resources: "Failed resources: {resources}",
      optional_modal_detail_non_blocking: "Impact: optional features only, core functionality remains available.",
      optional_feature_pinyin: "Pinyin search",
      optional_feature_i18n: "Extended language support",
      optional_feature_notice_content: "Announcement content",
      optional_feature_sponsor_data: "Sponsor list display",
      optional_feature_weapon_images: "Weapon image index",
      optional_feature_version_meta: "Version metadata display",
      optional_feature_core_data: "Core game data",
      optional_feature_ui_scripts: "UI interaction scripts",
      optional_feature_runtime: "Runtime dependency",
    },
    ja: {
      preload_title: "少女祈祷中 / 少女、祈りの最中…",
      preload_note: "初回起動や強制リロードは少し時間がかかる場合があります",
      preload_status_prepare: "リソースを準備しています…",
      preload_status_failed: "リソースの読み込みに失敗しました",
      preload_status_ready: "リソースの準備が完了しました。ページを初期化しています…",
      preload_status_background_prepare: "リソースの準備が完了しました。背景を準備しています…",
      preload_status_staging: "リソースの取得完了。次の段階を開始しています…",
      preload_status_parallel: "リソースを並列で読み込み中…",
      preload_status_loading: "リソースを読み込み中…",
      preload_current_failed: "失敗項目：{label}",
      preload_current_parallel: "並列：{labels}{more}",
      preload_current_parallel_more: " ほか {count} 件",
      preload_current_done: "完了：{labels}",
      preload_current_now: "現在：{label}",
      preload_current_wait_stage: "直近の完了：{labels}；次の段階を待機中…",
      preload_current_wait_core: "現在：コアモジュールの起動待ち…",
      preload_current_background: "現在：背景",
      preload_current_wait_mount: "アプリのマウント完了を待機中…",
      preload_help_short: "読み込みが長い場合、ネットワークやキャッシュが原因のことがあります。",
      preload_help_long:
        "長時間変化がない場合は「再試行」または「再読み込み」を試してください。改善しない場合は「問題を報告」。",
      action_retry: "再試行",
      action_refresh: "再読み込み",
      action_feedback: "問題を報告",
      unknown_resource: "不明なリソース",
      unknown_item: "不明",
      error_title_page_load: "ページの読み込みに失敗しました",
      error_summary_unknown: "不明なエラーが発生しました。しばらくしてから再試行してください。",
      error_details_title: "エラー詳細",
      error_suggestions_title: "対処方法",
      error_title_resource: "リソースの読み込みに失敗しました",
      error_summary_script_chain_missing:
        "スクリプト読み込みマニフェストが見つからず、アプリを起動できません。",
      error_detail_missing_chain: "欠落マニフェスト：window.__APP_SCRIPT_CHAIN",
      error_detail_confirm_chain:
        "./js/app.script-chain.js が正しく配置されアクセス可能か確認してください",
      error_summary_core_script: "コアスクリプトの読み込みが完了しませんでした。",
      error_summary_core_resource: "コアリソースの読み込みが完了しませんでした。",
      error_summary_http_404:
        "リソースのパスエラー（404）を検出しました。配置ディレクトリとURLパスを確認してください。",
      error_summary_http_403:
        "リソースへのアクセス拒否（403）を検出しました。アクセス方針や保護設定を確認してください。",
      error_summary_http_429: "リクエスト過多（429）を検出しました。しばらくして再試行してください。",
      error_summary_http_5xx: "サーバー側の異常（5xx）を検出しました。しばらくして再試行してください。",
      error_title_style: "スタイルシートの読み込みに失敗しました",
      error_summary_style: "重要なスタイルの読み込みに失敗し、正しく表示できません。",
      error_detail_failed_style: "失敗したスタイル：{name}",
      error_detail_failed_resource: "失敗したリソース：{name}",
      error_detail_network_state: "ネットワーク：{state}",
      error_network_online: "オンライン",
      error_network_offline: "オフライン",
      error_detail_http_status: "HTTP ステータス：{status}{hint}",
      error_detail_failed_reason: "失敗理由：{reason}",
      error_hint_flaky:
        "原因候補：ネットワーク変動、キャッシュ破損、CDN 反映遅延、拡張機能によるブロック",
      error_reason_http: "リクエストがエラーステータスを返しました",
      error_reason_error: "ブラウザでリソース読み込みエラーが発生しました",
      error_reason_stalled:
        "長時間リソースが利用可能状態になりませんでした（接続停滞またはブロックの可能性）",
      error_reason_stalled_with_status:
        "応答はあるものの、スタイルが利用可能状態になりませんでした（接続停滞またはブロックの可能性）",
      http_404: "リソースが見つからないか、パスが不正です",
      http_429: "リクエストが多すぎます（レート制限の可能性）",
      http_403: "アクセスが拒否されました（レート制限の可能性もあります）",
      http_5xx: "サーバーエラー",
      suggestion_retry: "「再試行」で重要リソースを再取得",
      suggestion_hard_refresh: "Ctrl + F5 で強制再読み込みして再試行",
      suggestion_issue_screenshot:
        "改善しない場合は GitHub Issues にコンソールのスクリーンショットを添付してください",
      list_sep: "、",
      preload_current_optional_failed: "任意機能の失敗：{label}",
      optional_modal_title: "任意機能の読み込みに失敗しました",
      optional_modal_summary: "一部の任意機能を読み込めませんでしたが、ページ本体は引き続き利用できます。",
      optional_modal_detail_features: "失敗した機能：{features}",
      optional_modal_detail_resources: "失敗したリソース：{resources}",
      optional_modal_detail_non_blocking: "影響：任意機能のみ。コア機能は利用可能です。",
      optional_feature_pinyin: "ピンイン検索",
      optional_feature_i18n: "追加言語サポート",
      optional_feature_notice_content: "お知らせ内容表示",
      optional_feature_sponsor_data: "スポンサー一覧表示",
      optional_feature_weapon_images: "武器画像インデックス",
      optional_feature_version_meta: "バージョンメタデータ表示",
      optional_feature_core_data: "コアゲームデータ",
      optional_feature_ui_scripts: "UI操作スクリプト",
      optional_feature_runtime: "ランタイム依存",
    },
  };

  var normalizeBootLocale = function (value) {
    return supportedBootLocales.indexOf(value) >= 0 ? value : fallbackBootLocale;
  };
  var detectBootLocale = function () {
    try {
      var stored = localStorage.getItem(langStorageKey);
      if (stored) {
        return normalizeBootLocale(String(stored));
      }
    } catch (error) {
      // ignore storage errors
    }
    var raw = String((navigator && navigator.language) || "").toLowerCase();
    if (raw.indexOf("zh") === 0) {
      if (
        raw.indexOf("tw") >= 0 ||
        raw.indexOf("hk") >= 0 ||
        raw.indexOf("mo") >= 0 ||
        raw.indexOf("hant") >= 0
      ) {
        return "zh-TW";
      }
      return "zh-CN";
    }
    if (raw.indexOf("ja") === 0) return "ja";
    return "en";
  };
  var bootLocale = detectBootLocale();
  try {
    if (root) {
      root.setAttribute("lang", bootLocale);
    }
  } catch (error) {
    // ignore
  }
  var interpolateBootText = function (text, params) {
    if (!params) return String(text || "");
    return String(text || "").replace(/\{(\w+)\}/g, function (match, name) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        return String(params[name]);
      }
      return match;
    });
  };
  var bt = function (key, params) {
    var localeTable = bootI18n[bootLocale] || bootI18n[fallbackBootLocale] || {};
    var fallbackTable = bootI18n[fallbackBootLocale] || {};
    var raw = Object.prototype.hasOwnProperty.call(localeTable, key)
      ? localeTable[key]
      : Object.prototype.hasOwnProperty.call(fallbackTable, key)
      ? fallbackTable[key]
      : key;
    return interpolateBootText(raw, params);
  };
  window.__bootI18n = {
    locale: bootLocale,
    t: bt,
  };
  var runBootStorageProbe = function () {
    var probeKey = "planner-storage-bootstrap-probe";
    var result = {
      ok: true,
      key: probeKey,
      errorName: "",
      errorMessage: "",
      occurredAt: new Date().toISOString(),
    };
    try {
      var marker = "__ok__" + Date.now();
      localStorage.setItem(probeKey, marker);
      var readBack = localStorage.getItem(probeKey);
      if (readBack !== marker) {
        throw new Error("localStorage probe mismatch");
      }
      localStorage.removeItem(probeKey);
    } catch (error) {
      result.ok = false;
      result.errorName = String((error && error.name) || "Error");
      result.errorMessage = String((error && error.message) || "bootstrap storage probe failed");
      try {
        localStorage.removeItem(probeKey);
      } catch (cleanupError) {
        // ignore probe cleanup errors
      }
    }
    window.__bootStorageProbe = result;
  };
  runBootStorageProbe();
  var resolveBootCacheBustToken = function () {
    try {
      var url = new URL(window.location.href);
      return String(url.searchParams.get("__clear_ts") || "").trim();
    } catch (error) {
      return "";
    }
  };
  var bootCacheBustToken = resolveBootCacheBustToken();
  var applyBootCacheBust = function (src) {
    var input = String(src || "");
    if (!input || !bootCacheBustToken) return input;
    try {
      var url = new URL(input, window.location.href);
      url.searchParams.set("__cb", bootCacheBustToken);
      return url.toString();
    } catch (error) {
      return input;
    }
  };
  window.__bootCacheBustToken = bootCacheBustToken;
  var normalizeResourceKey = function (src) {
    try {
      return new URL(src, window.location.href).href;
    } catch (error) {
      return String(src || "");
    }
  };

  var buildProbeUrl = function (src) {
    var normalized = normalizeResourceKey(src);
    if (!normalized) return "";
    var separator = normalized.indexOf("?") === -1 ? "?" : "&";
    return normalized + separator + "__boot_probe_ts=" + Date.now();
  };

  var probeResourceStatus = function (src) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    var probeUrl = buildProbeUrl(src);
    if (!probeUrl) return Promise.resolve(null);
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = null;
    if (controller) {
      timeoutId = setTimeout(function () {
        try {
          controller.abort();
        } catch (error) {
          // ignore abort errors
        }
      }, 2200);
    }
    var init = {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    };
    if (controller) {
      init.signal = controller.signal;
    }
    return fetch(probeUrl, init)
      .then(
        function (response) {
          return {
            status: Number(response && response.status) || 0,
          };
        },
        function () {
          return null;
        }
      )
      .then(function (result) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        return result;
      });
  };

  var explainHttpStatus = function (status) {
    if (!status) return "";
    if (status === 404) return bt("http_404");
    if (status === 429) return bt("http_429");
    if (status === 403) return bt("http_403");
    if (status >= 500 && status <= 599) return bt("http_5xx");
    return "";
  };
  var isFatalHttpStatus = function (status) {
    if (!status) return false;
    return status === 404 || status === 403 || status === 429 || (status >= 500 && status <= 599);
  };
  var resolveStatusSummaryKey = function (status) {
    if (!status) return "";
    if (status === 404) return "error_summary_http_404";
    if (status === 403) return "error_summary_http_403";
    if (status === 429) return "error_summary_http_429";
    if (status >= 500 && status <= 599) return "error_summary_http_5xx";
    return "";
  };
  var resolveResourceSummary = function (status, fallbackKey) {
    var key = resolveStatusSummaryKey(status);
    if (key) return bt(key);
    return bt(fallbackKey);
  };

  var createLoadError = function (kind, src, reason, probe) {
    var message;
    if (kind === "style") {
      if (reason === "stalled") {
        message = "Failed to load stylesheet (stalled): " + src;
      } else if (reason === "http") {
        message = "Failed to load stylesheet (http): " + src;
      } else if (reason === "error") {
        message = "Failed to load stylesheet (error): " + src;
      } else {
        message = "Failed to load stylesheet: " + src;
      }
    } else {
      message = "Failed to load: " + src;
    }
    var error = new Error(message);
    error.resource = {
      kind: kind || "resource",
      src: String(src || ""),
      reason: String(reason || ""),
      probe: probe || null,
    };
    return error;
  };
  var describeStyleFailureReason = function (reason, status) {
    if (reason === "http") return bt("error_reason_http");
    if (reason === "error") return bt("error_reason_error");
    if (reason === "stalled") {
      if (status && !isFatalHttpStatus(status)) {
        return bt("error_reason_stalled_with_status");
      }
      return bt("error_reason_stalled");
    }
    return "";
  };

  var applyPreloadTheme = function () {
    var themePreference = "auto";
    try {
      var savedTheme = localStorage.getItem(themeStorageKey);
      if (savedTheme === "auto" || savedTheme === "light" || savedTheme === "dark") {
        themePreference = savedTheme;
      }
    } catch (error) {
      // ignore localStorage errors
    }
    var resolvedTheme =
      themePreference === "auto"
        ? window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : themePreference;
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    if (themePreference === "auto" && window.matchMedia) {
      var preloadMediaTheme = window.matchMedia("(prefers-color-scheme: light)");
      var onPreloadThemeChange = function (event) {
        if (!root.classList.contains("preload")) return;
        root.setAttribute("data-theme", event.matches ? "light" : "dark");
        root.style.colorScheme = event.matches ? "light" : "dark";
      };
      if (typeof preloadMediaTheme.addEventListener === "function") {
        preloadMediaTheme.addEventListener("change", onPreloadThemeChange);
      } else if (typeof preloadMediaTheme.addListener === "function") {
        preloadMediaTheme.addListener(onPreloadThemeChange);
      }
    }
  };

  var syncPreloadStaticText = function (overlay) {
    if (!overlay) return;
    var title = overlay.querySelector(".preload-title");
    var note = overlay.querySelector(".preload-note") || overlay.querySelector(".preload-sub");
    var status = overlay.querySelector(".preload-status");
    if (title) title.textContent = bt("preload_title");
    if (note) note.textContent = bt("preload_note");
    if (status) status.textContent = bt("preload_status_prepare");
  };

  var ensureShell = function () {
    if (!document.body) return false;
    var preload = document.getElementById("app-preload");
    if (!preload) {
      preload = document.createElement("div");
      preload.id = "app-preload";
      preload.innerHTML =
        '<div class="preload-card">' +
        '<div class="preload-title">' +
        bt("preload_title") +
        "</div>" +
        '<div class="preload-sub preload-note">' +
        bt("preload_note") +
        "</div>" +
        '<div class="preload-status" aria-live="polite">' +
        bt("preload_status_prepare") +
        "</div>" +
        '<div class="preload-current" aria-live="polite"></div>' +
        '<div class="preload-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">' +
        '<span class="preload-progress-fill" aria-valuenow="0"></span>' +
        "</div>" +
        '<div class="preload-count" aria-live="polite">0/0</div>' +
        "</div>";
      document.body.insertBefore(preload, document.body.firstChild || null);
    } else {
      syncPreloadStaticText(preload);
    }
    var app = document.getElementById("app");
    if (!app) {
      app = document.createElement("div");
      app.id = "app";
      app.className = "app-shell";
      app.setAttribute("v-cloak", "");
      app.setAttribute("v-show", "appReady");
      app.setAttribute("data-fingerprint", "cmty-ep-2026-02-07");
      document.body.appendChild(app);
    }
    return true;
  };

  var getPreloadRefs = function () {
    var overlay = document.getElementById("app-preload");
    return {
      overlay: overlay,
      status: overlay ? overlay.querySelector(".preload-status") : null,
      current: overlay ? overlay.querySelector(".preload-current") : null,
      count: overlay ? overlay.querySelector(".preload-count") : null,
      progressFill: overlay ? overlay.querySelector(".preload-progress-fill") : null,
      help: overlay ? overlay.querySelector(".preload-help") : null,
      actions: overlay ? overlay.querySelector(".preload-actions") : null,
    };
  };

  var ensureErrorRenderer = function () {
    if (typeof window.__renderBootError === "function") return;
    var teardownPreloadOverlay = function () {
      root.classList.remove("preload");
      var overlay = document.getElementById("app-preload");
      if (!overlay) return;
      overlay.classList.add("preload-hide");
      overlay.style.pointerEvents = "none";
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
    window.__renderBootError = function renderBootError(payload) {
      if (!document.body) {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            window.__renderBootError(payload);
          },
          { once: true }
        );
        return;
      }
      var title = String((payload && payload.title) || bt("error_title_page_load"));
      var summary = String((payload && payload.summary) || bt("error_summary_unknown"));
      var details = Array.isArray(payload && payload.details)
        ? payload.details.filter(Boolean).map(String)
        : [];
      var suggestions = Array.isArray(payload && payload.suggestions)
        ? payload.suggestions.filter(Boolean).map(String)
        : [];

      teardownPreloadOverlay();
      var existing = document.getElementById("boot-error-overlay");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      var page = document.createElement("div");
      page.id = "boot-error-overlay";
      page.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;overflow:auto;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0f14;color:#e6e9ef;font-family:'Microsoft YaHei UI','PingFang SC',sans-serif;";
      var card = document.createElement("div");
      card.style.cssText =
        "width:min(680px,92vw);border:1px solid rgba(243,108,108,0.42);border-radius:14px;padding:18px 18px 16px;background:rgba(26,14,18,0.84);box-shadow:0 14px 34px rgba(0,0,0,0.38);";

      var titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size:16px;font-weight:700;letter-spacing:0.03em;color:#ff9e9e;";
      titleEl.textContent = title;
      card.appendChild(titleEl);

      var summaryEl = document.createElement("div");
      summaryEl.style.cssText = "margin-top:8px;line-height:1.7;color:#ffd7d7;";
      summaryEl.textContent = summary;
      card.appendChild(summaryEl);

      if (details.length) {
        var detailWrap = document.createElement("div");
        detailWrap.style.cssText =
          "margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);";
        var detailTitle = document.createElement("div");
        detailTitle.style.cssText = "font-weight:600;color:#ffd1d1;";
        detailTitle.textContent = bt("error_details_title");
        detailWrap.appendChild(detailTitle);
        var detailUl = document.createElement("ul");
        detailUl.style.cssText = "margin:8px 0 0 18px;padding:0;line-height:1.65;";
        details.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          detailUl.appendChild(li);
        });
        detailWrap.appendChild(detailUl);
        card.appendChild(detailWrap);
      }

      if (suggestions.length) {
        var suggestWrap = document.createElement("div");
        suggestWrap.style.cssText =
          "margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);";
        var suggestTitle = document.createElement("div");
        suggestTitle.style.cssText = "font-weight:600;color:#f2e5c9;";
        suggestTitle.textContent = bt("error_suggestions_title");
        suggestWrap.appendChild(suggestTitle);
        var suggestOl = document.createElement("ol");
        suggestOl.style.cssText = "margin:8px 0 0 18px;padding:0;line-height:1.65;";
        suggestions.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          suggestOl.appendChild(li);
        });
        suggestWrap.appendChild(suggestOl);
        card.appendChild(suggestWrap);
      }

      var actionRow = document.createElement("div");
      actionRow.style.cssText = "margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;";

      var retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.style.cssText =
        "cursor:pointer;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#c9fff7;";
      retryButton.textContent = bt("action_retry");
      retryButton.addEventListener("click", function () {
        var current = document.getElementById("boot-error-overlay");
        if (current && current.parentNode) {
          current.parentNode.removeChild(current);
        }
        if (typeof window.__startBootstrapEntry === "function") {
          window.__startBootstrapEntry({ fromRetry: true });
          return;
        }
        window.location.reload();
      });
      actionRow.appendChild(retryButton);

      var refreshButton = document.createElement("button");
      refreshButton.type = "button";
      refreshButton.style.cssText =
        "cursor:pointer;border:1px solid rgba(255,255,255,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#fff;";
      refreshButton.textContent = bt("action_refresh");
      refreshButton.addEventListener("click", function () {
        window.location.reload();
      });
      actionRow.appendChild(refreshButton);

      var feedbackLink = document.createElement("a");
      feedbackLink.href = "https://github.com/cmyyx/endfield-essence-planner/issues";
      feedbackLink.target = "_blank";
      feedbackLink.rel = "noreferrer";
      feedbackLink.style.cssText =
        "display:inline-flex;align-items:center;text-decoration:none;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.85);color:#c9fff7;";
      feedbackLink.textContent = bt("action_feedback");
      actionRow.appendChild(feedbackLink);

      card.appendChild(actionRow);
      page.appendChild(card);
      document.body.appendChild(page);
    };
  };

  var ensureLoadErrorReporter = function () {
    if (typeof window.__reportScriptChainMissing !== "function") {
      window.__reportScriptChainMissing = function reportScriptChainMissing() {
        window.__renderBootError({
          title: bt("error_title_resource"),
          summary: bt("error_summary_script_chain_missing"),
          details: [
            bt("error_detail_missing_chain"),
            bt("error_detail_confirm_chain"),
          ],
          suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
        });
      };
    }
    if (typeof window.__reportScriptLoadFailure !== "function") {
      window.__reportScriptLoadFailure = function reportScriptLoadFailure(failedScript, diagnostics) {
        var failed = String(failedScript || "").trim();
        var status = diagnostics && diagnostics.status ? Number(diagnostics.status) : 0;
        var onlineState = navigator.onLine ? bt("error_network_online") : bt("error_network_offline");
        var details = [
          bt("error_detail_failed_resource", { name: failed || bt("unknown_item") }),
          bt("error_detail_network_state", { state: onlineState }),
        ];
        if (status) {
          var hint = explainHttpStatus(status);
          details.push(
            bt("error_detail_http_status", {
              status: status,
              hint: hint ? " (" + hint + ")" : "",
            })
          );
        }
        details.push(bt("error_hint_flaky"));
        window.__renderBootError({
          title: bt("error_title_resource"),
          summary: resolveResourceSummary(status, "error_summary_core_script"),
          details: details,
          suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh"), bt("suggestion_issue_screenshot")],
        });
      };
    }
  };

  var startBootstrap = function (options) {
    options = options || {};
    if (options.fromRetry && document.body) {
      document.body.textContent = "";
    }
    runSerial += 1;
    var runId = runSerial;
    window.__bootstrapEntryRunning = true;
    var declaredAppScriptChain =
      Array.isArray(window.__APP_SCRIPT_CHAIN) && window.__APP_SCRIPT_CHAIN.length
        ? window.__APP_SCRIPT_CHAIN.slice()
        : [];
    root.classList.add("preload");
    applyPreloadTheme();
    ensureErrorRenderer();
    ensureLoadErrorReporter();
    var progressPulseTimer = null;

    var finish = function () {
      if (progressPulseTimer) {
        clearInterval(progressPulseTimer);
        progressPulseTimer = null;
      }
      root.classList.remove("preload");
      var overlay = document.getElementById("app-preload");
      if (overlay) {
        overlay.classList.add("preload-hide");
        overlay.style.pointerEvents = "none";
        setTimeout(function () {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 240);
      }
    };
    window.__finishPreload = finish;

    if (!ensureShell() && document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          ensureShell();
        },
        { once: true }
      );
    }

    var ensurePreloadAssist = function () {
      var refs = getPreloadRefs();
      if (!refs.overlay) return;
      var card = refs.overlay.querySelector(".preload-card");
      if (!card) return;
      if (!refs.help) {
        var help = document.createElement("div");
        help.className = "preload-sub preload-help";
        help.style.cssText = "margin-top:8px;line-height:1.5;";
        card.appendChild(help);
      }
      if (!refs.actions) {
        var actionRow = document.createElement("div");
        actionRow.className = "preload-actions";
        actionRow.style.cssText =
          "margin-top:10px;display:none;gap:8px;flex-wrap:wrap;justify-content:center;";

        var retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.textContent = bt("action_retry");
        retryButton.style.cssText =
          "cursor:pointer;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.9);color:#c9fff7;font-size:12px;";
        retryButton.addEventListener("click", function () {
          if (typeof window.__startBootstrapEntry === "function") {
            window.__startBootstrapEntry({ fromRetry: true });
            return;
          }
          window.location.reload();
        });
        actionRow.appendChild(retryButton);

        var refreshButton = document.createElement("button");
        refreshButton.type = "button";
        refreshButton.textContent = bt("action_refresh");
        refreshButton.style.cssText =
          "cursor:pointer;border:1px solid rgba(255,255,255,0.35);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.9);color:#fff;font-size:12px;";
        refreshButton.addEventListener("click", function () {
          window.location.reload();
        });
        actionRow.appendChild(refreshButton);

        var feedbackLink = document.createElement("a");
        feedbackLink.href = "https://github.com/cmyyx/endfield-essence-planner/issues";
        feedbackLink.target = "_blank";
        feedbackLink.rel = "noreferrer";
        feedbackLink.textContent = bt("action_feedback");
        feedbackLink.style.cssText =
          "display:inline-flex;align-items:center;text-decoration:none;border:1px solid rgba(77,214,201,0.4);border-radius:999px;padding:4px 10px;background:rgba(12,18,28,0.85);color:#c9fff7;font-size:12px;";
        actionRow.appendChild(feedbackLink);

        card.appendChild(actionRow);
      }
    };
    ensurePreloadAssist();

    var optionalFailureReported = new Set();
    var optionalFailureEventName = "planner:optional-resource-failed";
    var optionalFailureQueueKey = "__bootOptionalLoadFailures";
    var resolveOptionalFeatureKey = function (entry) {
      if (entry && entry.featureKey) return String(entry.featureKey);
      return "";
    };
    var resolveOptionalFeatureLabel = function (featureKey) {
      if (!featureKey) return "";
      var key = "optional_feature_" + featureKey;
      var translated = bt(key);
      if (!translated || translated === key) return "";
      return translated;
    };
    var enqueueOptionalFailure = function (payload) {
      if (typeof window === "undefined") return;
      var queue = Array.isArray(window[optionalFailureQueueKey]) ? window[optionalFailureQueueKey] : [];
      queue.push(payload);
      window[optionalFailureQueueKey] = queue.slice(-20);
      if (typeof window.dispatchEvent === "function") {
        try {
          var event = new CustomEvent(optionalFailureEventName, { detail: payload });
          window.dispatchEvent(event);
        } catch (error) {
          // ignore event dispatch failures
        }
      }
    };
    var reportOptionalResourceFailure = function (entry) {
      if (!entry || !entry.optional) return;
      var featureKey = resolveOptionalFeatureKey(entry);
      var resourceLabel = String((entry && entry.label) || (entry && entry.src) || "").trim();
      var signature = String(featureKey || "") + "|" + resourceLabel;
      if (optionalFailureReported.has(signature)) return;
      optionalFailureReported.add(signature);
      enqueueOptionalFailure({
        id: "bootopt-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8),
        occurredAt: new Date().toISOString(),
        featureKey: featureKey,
        featureLabel: resolveOptionalFeatureLabel(featureKey),
        src: String((entry && entry.src) || ""),
        label: resourceLabel,
      });
    };

    var toResourceLabel = function (src) {
      var value = String(src || "");
      if (!value) return bt("unknown_resource");
      if (/^https?:\/\//i.test(value)) return value;
      return value;
    };
    var resourceState = new Map();
    var progressMeta = {
      startedAt: Date.now(),
      lastCompleted: -1,
      lastCompletedAt: Date.now(),
    };
    var preloadAssistStallMs = 30000;
    var preloadFailStallMs = 60000;
    var preloadLongHelpStallMs = 45000;
    var triggerStallTimeout = null;
    var ensureResource = function (src, kind, options) {
      var normalizedOptions = options && typeof options === "object" ? options : {};
      var optionalConfig = optionalScriptConfigs[src] || null;
      var key = normalizeResourceKey(src);
      if (!resourceState.has(key)) {
        resourceState.set(key, {
          key: key,
          src: src,
          kind: kind || "resource",
          label: toResourceLabel(src),
          status: "pending",
          statusAt: 0,
          optional: Boolean(normalizedOptions.optional || optionalConfig),
          featureKey: normalizedOptions.featureKey || (optionalConfig ? optionalConfig.featureKey : ""),
        });
      } else if (normalizedOptions.optional || optionalConfig) {
        var existing = resourceState.get(key);
        if (existing) {
          existing.optional = true;
          if (!existing.featureKey) {
            existing.featureKey = normalizedOptions.featureKey || (optionalConfig ? optionalConfig.featureKey : "");
          }
        }
      }
      return key;
    };
    var renderProgress = function () {
      if (runId !== runSerial) return;
      ensurePreloadAssist();
      var refs = getPreloadRefs();
      if (!refs.overlay) return;
      var entries = Array.from(resourceState.values());
      var total = entries.length;
      var loaded = entries.filter(function (entry) {
        return entry.status === "loaded";
      }).length;
      var criticalFailedItem = entries.find(function (entry) {
        return entry.status === "failed" && !entry.optional;
      });
      var optionalFailedItems = entries.filter(function (entry) {
        return entry.status === "failed" && entry.optional;
      });
      var completedCount = loaded + optionalFailedItems.length;
      var loadingItems = entries.filter(function (entry) {
        return entry.status === "loading";
      });
      var loadingItem = loadingItems.length ? loadingItems[0] : null;
      var loadingCount = loadingItems.length;
      var loadingPreview =
        loadingCount > 0
          ? loadingItems
              .slice(0, 3)
              .map(function (entry) {
                return entry.label;
              })
              .join(bt("list_sep"))
          : "";
      var recentLoadedPreview = entries
        .filter(function (entry) {
          return entry.status === "loaded" && entry.statusAt > 0;
        })
        .sort(function (a, b) {
          return b.statusAt - a.statusAt;
        })
        .slice(0, 2)
        .map(function (entry) {
          return entry.label;
        })
        .join(bt("list_sep"));
      if (completedCount !== progressMeta.lastCompleted) {
        progressMeta.lastCompleted = completedCount;
        progressMeta.lastCompletedAt = Date.now();
      }
      var stagnantMs = Date.now() - progressMeta.lastCompletedAt;
      var shouldShowAssist =
        !criticalFailedItem && completedCount < total && stagnantMs >= preloadAssistStallMs;
      var shouldForceTimeout =
        !criticalFailedItem && completedCount < total && stagnantMs >= preloadFailStallMs;
      var hasStagingGap = !criticalFailedItem && !loadingItem && completedCount < total;
      if (refs.count) {
        refs.count.textContent = completedCount + "/" + total;
      }
      if (refs.progressFill) {
        var percent = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;
        refs.progressFill.style.width = percent + "%";
        refs.progressFill.setAttribute("aria-valuenow", String(percent));
      }
      if (refs.status) {
        if (criticalFailedItem) {
          refs.status.textContent = bt("preload_status_failed");
        } else if (total === 0) {
          refs.status.textContent = bt("preload_status_prepare");
        } else if (completedCount >= total) {
          refs.status.textContent = bt("preload_status_ready");
        } else if (hasStagingGap) {
          refs.status.textContent = bt("preload_status_staging");
        } else if (loadingCount > 1) {
          refs.status.textContent = bt("preload_status_parallel");
        } else {
          refs.status.textContent = bt("preload_status_loading");
        }
      }
      if (refs.current) {
        var currentText = "";
        if (criticalFailedItem) {
          currentText = bt("preload_current_failed", { label: criticalFailedItem.label });
        } else if (loadingCount > 1) {
          var parallelText = bt("preload_current_parallel", {
            labels: loadingPreview,
            more:
              loadingCount > 3
                ? bt("preload_current_parallel_more", { count: loadingCount })
                : "",
          });
          currentText = recentLoadedPreview
            ? parallelText + " | " + bt("preload_current_done", { labels: recentLoadedPreview })
            : parallelText;
        } else if (loadingItem) {
          currentText = bt("preload_current_now", { label: loadingItem.label });
        } else if (hasStagingGap) {
          currentText = recentLoadedPreview
            ? bt("preload_current_wait_stage", { labels: recentLoadedPreview })
            : bt("preload_current_wait_core");
        } else if (completedCount >= total && total > 0) {
          currentText = bt("preload_current_wait_mount");
        }
        if (!criticalFailedItem && optionalFailedItems.length) {
          var optionalFailedPreview = optionalFailedItems
            .slice(0, 2)
            .map(function (entry) {
              return entry.label;
            })
            .join(bt("list_sep"));
          var optionalFailedText = bt("preload_current_optional_failed", {
            label: optionalFailedPreview,
          });
          currentText = currentText ? currentText + " | " + optionalFailedText : optionalFailedText;
        }
        refs.current.textContent = currentText;
      }
      if (refs.help) {
        if (criticalFailedItem) {
          refs.help.textContent = "";
        } else if (completedCount < total && stagnantMs >= preloadLongHelpStallMs) {
          refs.help.textContent = bt("preload_help_long");
        } else if (shouldShowAssist) {
          refs.help.textContent = bt("preload_help_short");
        } else {
          refs.help.textContent = "";
        }
      }
      if (refs.actions) {
        refs.actions.style.display = shouldShowAssist ? "flex" : "none";
      }
      if (shouldForceTimeout && typeof triggerStallTimeout === "function") {
        triggerStallTimeout();
      }
    };
    var setResourceStatus = function (key, status) {
      var item = resourceState.get(key);
      if (!item) return;
      item.status = status;
      item.statusAt = Date.now();
      renderProgress();
    };

    cssFiles.forEach(function (href) {
      ensureResource(href, "style");
    });
    startupScripts.forEach(function (src) {
      ensureResource(src, "script");
    });
    declaredAppScriptChain.forEach(function (src) {
      ensureResource(src, "script");
    });
    renderProgress();

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          ensurePreloadAssist();
          renderProgress();
        },
        { once: true }
      );
    }
    progressPulseTimer = setInterval(function () {
      if (runId !== runSerial) {
        clearInterval(progressPulseTimer);
        progressPulseTimer = null;
        return;
      }
      renderProgress();
    }, 1000);

    var scriptLoadRegistry = new Map();
    var loadScript = function (src, options) {
      var requestSrc = applyBootCacheBust(src);
      var key = ensureResource(src, "script", options);
      if (scriptLoadRegistry.has(key)) {
        return scriptLoadRegistry.get(key);
      }
      var task = new Promise(function (resolve, reject) {
        var existingLoaded = false;
        if (!bootCacheBustToken) {
          existingLoaded = Array.from(document.scripts || []).some(function (script) {
            var s = script.getAttribute("src") || script.src || "";
            var same = normalizeResourceKey(s) === key;
            return same && script.dataset && script.dataset.loaded === "true";
          });
        }
        if (existingLoaded) {
          setResourceStatus(key, "loaded");
          resolve();
          return;
        }
        var script = document.createElement("script");
        script.src = requestSrc;
        setResourceStatus(key, "loading");
        script.onload = function () {
          script.dataset.loaded = "true";
          setResourceStatus(key, "loaded");
          resolve();
        };
        script.onerror = function () {
          setResourceStatus(key, "failed");
          scriptLoadRegistry.delete(key);
          probeResourceStatus(requestSrc).then(function (probe) {
            reject(createLoadError("script", src, "error", probe));
          });
        };
        var target = document.body || document.head || document.documentElement;
        target.appendChild(script);
      });
      scriptLoadRegistry.set(key, task);
      return task;
    };
    window.__loadScript = loadScript;

    var styleLoadRegistry = new Map();
    var resolveCssStallLimitMs = function () {
      var base = 60000;
      try {
        var conn =
          navigator && (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
        if (conn) {
          if (conn.saveData) return 75000;
          var type = String(conn.effectiveType || "").toLowerCase();
          if (type === "slow-2g" || type === "2g") return 75000;
          if (type === "3g") return 65000;
        }
      } catch (error) {
        // ignore
      }
      return base;
    };
    var cssStallLimitMs = resolveCssStallLimitMs();
    var cssStatePollIntervalMs = 900;
    var cssProbeIntervalMs = 5000;
    var isStylesheetReady = function (key, link) {
      if (!link) return false;
      try {
        if (link.sheet && !link.disabled) {
          return true;
        }
      } catch (error) {
        // ignore cross-origin/parse errors and continue with fallback scan
      }
      try {
        var sheets = Array.from(document.styleSheets || []);
        return sheets.some(function (sheet) {
          var href = "";
          try {
            href = sheet && sheet.href ? normalizeResourceKey(sheet.href) : "";
          } catch (error) {
            href = "";
          }
          return href === key;
        });
      } catch (error) {
        return false;
      }
    };
    var loadStyle = function (href) {
      var requestHref = applyBootCacheBust(href);
      var key = ensureResource(href, "style");
      if (styleLoadRegistry.has(key)) {
        return styleLoadRegistry.get(key);
      }
      var task = new Promise(function (resolve, reject) {
        var settled = false;
        var probeInFlight = false;
        var lastProbe = null;
        var errorSettleTimer = null;
        var nextProbeAt = Date.now();
        var link =
          bootCacheBustToken
            ? null
            : document.querySelector('link[rel="stylesheet"][href="' + href + '"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = requestHref;
          document.head.appendChild(link);
        }
        setResourceStatus(key, "loading");
        var pollTimer = null;
        var stallTimer = null;
        var cleanup = function () {
          clearInterval(pollTimer);
          clearTimeout(stallTimer);
          clearTimeout(errorSettleTimer);
          link.removeEventListener("load", onLoad);
          link.removeEventListener("error", onError);
        };
        var onLoad = function () {
          if (settled) return;
          settled = true;
          if (link.dataset) {
            link.dataset.loaded = "true";
          }
          cleanup();
          setResourceStatus(key, "loaded");
          resolve();
        };
        var onFailure = function (reason, probe) {
          if (settled) return;
          settled = true;
          cleanup();
          setResourceStatus(key, "failed");
          styleLoadRegistry.delete(key);
          reject(createLoadError("style", href, reason, probe));
        };
        var runProbe = function (source) {
          if (settled || probeInFlight) return;
          probeInFlight = true;
          probeResourceStatus(requestHref)
            .then(function (probe) {
              if (settled) return;
              lastProbe = probe || null;
              if (isStylesheetReady(key, link)) {
                onLoad();
                return;
              }
              var status = probe && probe.status ? Number(probe.status) : 0;
              if (status && isFatalHttpStatus(status)) {
                onFailure("http", probe);
                return;
              }
            })
            .finally(function () {
              probeInFlight = false;
            });
        };
        var schedulePoll = function () {
          clearInterval(pollTimer);
          pollTimer = setInterval(function () {
            if (settled) return;
            if (isStylesheetReady(key, link)) {
              onLoad();
              return;
            }
            if (Date.now() >= nextProbeAt) {
              nextProbeAt = Date.now() + cssProbeIntervalMs;
              runProbe("poll");
            }
          }, cssStatePollIntervalMs);
        };
        var scheduleStallWatchdog = function () {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(function () {
            if (settled) return;
            if (isStylesheetReady(key, link)) {
              onLoad();
              return;
            }
            probeResourceStatus(requestHref).then(function (probe) {
              if (settled) return;
              if (isStylesheetReady(key, link)) {
                onLoad();
                return;
              }
              var status = probe && probe.status ? Number(probe.status) : 0;
              if (status && isFatalHttpStatus(status)) {
                onFailure("http", probe);
                return;
              }
              onFailure("stalled", probe);
            });
          }, cssStallLimitMs);
        };
        schedulePoll();
        scheduleStallWatchdog();
        link.addEventListener("load", onLoad);
        var onError = function () {
          if (settled) return;
          runProbe("error");
          clearTimeout(errorSettleTimer);
          errorSettleTimer = setTimeout(function () {
            if (settled) return;
            if (isStylesheetReady(key, link)) {
              onLoad();
              return;
            }
            onFailure("error", lastProbe);
          }, 1600);
        };
        link.addEventListener("error", onError);
        try {
          if (isStylesheetReady(key, link)) {
            onLoad();
            return;
          }
          runProbe("init");
        } catch (error) {
          // ignore and wait load/error
        }
      });
      styleLoadRegistry.set(key, task);
      return task;
    };

    var cssPromise = Promise.all(cssFiles.map(loadStyle));
    var vuePromise = loadScript("./vendor/vue.global.prod.js");
    var pinyinOptionalOptions = { optional: true, featureKey: "pinyin" };
    var pinyinOptionalPromise = loadScript("./vendor/pinyin-pro.min.js", pinyinOptionalOptions).catch(function () {
      var capturedRunId = runId;
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (runSerial !== capturedRunId) {
            resolve();
            return;
          }
          loadScript("./vendor/pinyin-pro.min.js", pinyinOptionalOptions)
            .catch(function () {
              if (runSerial !== capturedRunId) return;
              var entry = resourceState.get(normalizeResourceKey("./vendor/pinyin-pro.min.js"));
              if (runSerial !== capturedRunId) return;
              if (entry) {
                if (runSerial !== capturedRunId) return;
                reportOptionalResourceFailure(entry);
              } else {
                if (runSerial !== capturedRunId) return;
                reportOptionalResourceFailure({
                  optional: true,
                  label: "./vendor/pinyin-pro.min.js",
                  featureKey: "pinyin",
                  src: "./vendor/pinyin-pro.min.js",
                });
              }
            })
            .finally(resolve);
        }, 1200);
      });
    });
    var dataPromise = Promise.all([
      loadScript("./data/version.js"),
      loadScript("./data/dungeons.js"),
      loadScript("./data/weapons.js"),
      loadScript("./data/gears.js"),
      loadScript("./data/weapon-images.js"),
      loadScript("./data/i18n.zh-CN.js"),
    ]);
    var scriptChainPromise = loadScript("./js/app.script-chain.js");
    if (typeof window.__loadAnalyticsNow === "function") {
      try {
        // Intentionally eager: capture real startup timing under first-screen contention.
        window.__loadAnalyticsNow();
      } catch (error) {
        // ignore analytics bootstrap errors
      }
    }
    var shellReadyPromise = new Promise(function (resolve) {
      var guard = 0;
      var check = function () {
        if (ensureShell()) {
          resolve();
          return;
        }
        guard += 1;
        if (guard >= 200) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
    var stallTimeoutTriggered = false;
    var stallTimeoutReject = null;
    var stallTimeoutPromise = new Promise(function (resolve, reject) {
      stallTimeoutReject = reject;
    });
    triggerStallTimeout = function () {
      if (stallTimeoutTriggered || typeof stallTimeoutReject !== "function") return;
      stallTimeoutTriggered = true;
      var stallError = new Error("Bootstrap progress stalled");
      stallError.resource = {
        kind: "startup-stall",
        src: "bootstrap",
        reason: "stalled",
        probe: null,
      };
      stallTimeoutReject(stallError);
    };
    var bootLoadPromise = Promise.all([
      shellReadyPromise,
      cssPromise,
      vuePromise,
      dataPromise,
      scriptChainPromise,
    ])
      .then(function () {
        if (
          !declaredAppScriptChain.length &&
          Array.isArray(window.__APP_SCRIPT_CHAIN) &&
          window.__APP_SCRIPT_CHAIN.length
        ) {
          declaredAppScriptChain = window.__APP_SCRIPT_CHAIN.slice();
          declaredAppScriptChain.forEach(function (src) {
            ensureResource(src, "script");
          });
          renderProgress();
        }
        pinyinOptionalPromise.catch(function () {
          // non-blocking optional dependency
        });
        return loadScript("./js/app.js");
      });
    Promise.race([bootLoadPromise, stallTimeoutPromise])
      .catch(function (error) {
        if (runId !== runSerial) return;
        finish();
        var failedMessage = String((error && error.message) || "");
        var resourceMeta = error && error.resource ? error.resource : null;
        var probe = resourceMeta && resourceMeta.probe ? resourceMeta.probe : null;
        var status = probe && probe.status ? Number(probe.status) : 0;
        var statusHint = explainHttpStatus(status);
        var failedScript = failedMessage.replace(/^Failed to load:\s*/i, "");
        if (resourceMeta && resourceMeta.kind === "script" && resourceMeta.src) {
          failedScript = resourceMeta.src;
        }
        if (resourceMeta && resourceMeta.kind === "startup-stall") {
          window.__renderBootError({
            title: bt("error_title_resource"),
            summary: bt("error_summary_core_resource"),
            details: [
              bt("error_detail_failed_reason", { reason: bt("error_reason_stalled") }),
              bt("error_hint_flaky"),
            ],
            suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh"), bt("suggestion_issue_screenshot")],
          });
          return;
        }
        var failedStyle = failedMessage
          .replace(/^Failed to load stylesheet(?: \([^)]+\))?:\s*/i, "")
          .trim();
        if (resourceMeta && resourceMeta.kind === "style" && resourceMeta.src) {
          failedStyle = resourceMeta.src;
        }
        var failureReason = resourceMeta && resourceMeta.reason ? String(resourceMeta.reason) : "";
        var isCssFailure =
          (resourceMeta && resourceMeta.kind === "style") || failedMessage.indexOf("stylesheet") !== -1;
        if (isCssFailure) {
          var cssDetails = [bt("error_detail_failed_style", { name: failedStyle || bt("unknown_item") })];
          if (status) {
            cssDetails.push(
              bt("error_detail_http_status", {
                status: status,
                hint: statusHint ? " (" + statusHint + ")" : "",
              })
            );
          }
          if (failureReason) {
            cssDetails.push(
              bt("error_detail_failed_reason", {
                reason: describeStyleFailureReason(failureReason, status),
              })
            );
          }
          window.__renderBootError({
            title: bt("error_title_style"),
            summary: resolveResourceSummary(status, "error_summary_style"),
            details: cssDetails,
            suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
          });
        } else if (typeof window.__reportScriptLoadFailure === "function") {
          window.__reportScriptLoadFailure(failedScript, {
            status: status,
          });
        } else {
          var scriptDetails = [
            bt("error_detail_failed_resource", { name: failedScript || bt("unknown_item") }),
          ];
          if (status) {
            scriptDetails.push(
              bt("error_detail_http_status", {
                status: status,
                hint: statusHint ? " (" + statusHint + ")" : "",
              })
            );
          }
          window.__renderBootError({
            title: bt("error_title_resource"),
            summary: resolveResourceSummary(status, "error_summary_core_resource"),
            details: scriptDetails,
            suggestions: [bt("suggestion_retry"), bt("suggestion_hard_refresh")],
          });
        }
      })
      .finally(function () {
        stallTimeoutTriggered = true;
        if (runId === runSerial) {
          window.__bootstrapEntryRunning = false;
        }
      });
  };

  window.__startBootstrapEntry = startBootstrap;
  startBootstrap({ fromRetry: false });
})();
