window.CONTENT = {
  announcement: {
    version: "1.1.1",
    title: "公告",
    date: "2026-02-01",
    qqGroup: "1045523485",
    qqNote: "反馈与建议交流",
    items: [
      "2026-02-01 12:02 :",
      "优化方案武器排序",
      "多选武器冲突后提示冲突原因",
      "下次更新预计将支持繁体中文/English,同时尝试为武器增加xx专武标记",
      "如果UI有问题请评论区/群聊/私信反馈",
      "详细更新日志请看更新日志或GitHub",
    ],
  },
  changelog: {
    title: "更新日志",
    entries: [
      {
        date: "2026-01-30",
        items: [
          "多武器方案分批刷取提示与覆盖逻辑优化。",
          "方案卡片信息整理，展开其他方案入口更明显。",
          "支持反向查询（属性筛选）。",
          "窄屏/竖屏适配增强，属性换行时自动隐藏类型。",
          "排除武器功能。",
          "武器可增加备注。",
        ],
      },
      {
        date: "2026-01-31",
        items: [
          "增加新手教程(排除武器功能近乎没有被使用过,防止是因为不知道如何使用遂增加新手教程)",
        ],
      },
      {
        date: "2026-02-01",
        items: [
          "方案中的武器排序按照基础属性",
          "增加未被任何五星六星武器使用的强攻技能属性",
          "选中多把冲突武器时提示冲突原因",
        ],
      },
    ],
  },
  about: {
    title: "关于本工具",
    paragraphs: [
      "本工具为《明日方舟：终末地》玩家自制作品，旨在提供可视化的基质刷取规划。",
      "项目属于早期阶段，可能存在数据错误，如有错误欢迎反馈指出。亦欢迎建议。",
    ],
    author: "璨梦踏月",
    links: [
      {
        chip: "GITHUB",
        text: "项目仓库",
        href: "https://github.com/cmyyx/endfield-essence-planner",
      },
      {
        chip: "BILIBILI",
        text: "介绍视频",
        href: "https://www.bilibili.com/video/BV1r26cB3EYL/",
      },
      {
        chip: "BILIBILI",
        text: "部分更新内容介绍",
        href: "https://www.bilibili.com/video/BV12o61BGEay/",
      },
    ],
    thanks: [
      { name: "端木芒 (终末地基质图的原作者)", href: "https://space.bilibili.com/17955975", note: "提供方案排序与效率优化建议" },
    ],
  },
  embed: {
    allowedHosts: ["elysium-stack.cn"],
  },
};
