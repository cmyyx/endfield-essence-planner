(function () {
  window.characters = window.characters || [];
  window.characters.push({
    id: "perlica",
    name: "佩丽卡",
    avatar: "image/characters/佩丽卡.png",
    rarity: 4,
    weaponType: "施术单元",
    mainAbility: "智识",
    subAbility: "意志",
    element: "电磁",
    role: "辅助",
    profession: "辅助",
    stats: {
      strength: "",
      agility: "",
      intellect: "",
      will: "",
      attack: "",
      hp: ""
    },
    skills: [
      {
        name: "电磁脉冲",
        icon: "",
        description: "释放电磁脉冲，对周围敌人造成伤害并使其短暂麻痹。",
        dataTables: [
          {
            title: "技能数据",
            rows: [
              {
                name: "伤害倍率",
                values: {
                  levels: ["150%", "165%", "180%"]
                }
              },
              {
                name: "麻痹效果",
                value: "短暂"
              }
            ]
          }
        ]
      }
    ],
    talents: [
      { name: "战术指挥", icon: "", description: "全队攻击速度提升 5%。" }
    ],
    potentials: ["费用-1", "天赋增强", "攻击+20", "再部署-5s", "费用-1"],
    materials: {
      elite1: ["装置 x2", "异铁 x2"],
      elite2: ["全新装置 x4", "异铁组 x3"]
    },
    baseSkills: [
      { name: "行政", description: "控制中枢心情消耗 -0.05" },
      { name: "企划", description: "会客室线索搜集速度 +10%" }
    ],
    guide: {
      equipRows: [
        {
          weapons: [
            { name: "典范", icon: "image/典范.png" }
          ],
          equipment: [
            { name: "轻超域护板", icon: "image/equip/item_equip_t4_suit_poise01_body_01.avif", rarity: 5 },
            { name: "轻超域护手", icon: "image/equip/item_equip_t4_suit_poise01_hand_01.avif", rarity: 5 },
            { name: "轻超域分析环", icon: "image/equip/item_equip_t4_suit_poise01_edc_01.avif", rarity: 5 },
            { name: "轻超域稳定盘", icon: "image/equip/item_equip_t4_suit_poise01_edc_02.avif", rarity: 5 }
          ]
        },
        {
          weapons: [
            { name: "爆破单元", icon: "image/爆破单元.png" }
          ],
          equipment: [
          ]
        }
      ],
      analysis: "",
      teamTips: "",
      operationTips: "",
      skillTips: "优先强化电磁脉冲与控制相关天赋，保证控制时长与覆盖率。",
      teamSlots: [
        {
          options: [
            {
              name: "余烬",
              weapons: [
                { name: "热熔切割器", icon: "image/热熔切割器.png" }
              ],
              equipment: [
                { name: "拓荒护甲", icon: "image/equip/item_equip_t4_suit_atb01_body_01.avif", rarity: 5 },
                { name: "拓荒耐蚀手套", icon: "image/equip/item_equip_t4_suit_atb01_hand_01.avif", rarity: 5 },
                { name: "拓荒通信器", icon: "image/equip/item_equip_t4_suit_atb01_edc_01.avif", rarity: 5 },
                { name: "拓荒增量供氧栓", icon: "image/equip/item_equip_t4_suit_atb01_edc_04.avif", rarity: 5 }
              ]
            },
            {
              name: "余烬(下位)",
              tag: "下位",
              weapons: [
                { name: "大雷斑", icon: "image/大雷斑.png" }
              ],
              equipment: [
              ]
            }
          ]
        },
        {
          options: [
            {
              name: "陈千语",
              weapons: [
                { name: "作品：蚀迹", icon: "image/作品：蚀迹.png" }
              ],
              equipment: [
                { name: "轻超域护板", icon: "image/equip/item_equip_t4_suit_poise01_body_01.avif", rarity: 5 },
                { name: "轻超域护手", icon: "image/equip/item_equip_t4_suit_poise01_hand_01.avif", rarity: 5 },
                { name: "轻超域分析环", icon: "image/equip/item_equip_t4_suit_poise01_edc_01.avif", rarity: 5 },
                { name: "轻超域稳定盘", icon: "image/equip/item_equip_t4_suit_poise01_edc_02.avif", rarity: 5 }
              ]
            },
            {
              name: "陈千语(下位)",
              tag: "下位",
              weapons: [
                { name: "白夜新星", icon: "image/白夜新星.png" }
              ],
              equipment: [
              ]
            }
          ]
        },
        {
          options: [
            {
              name: "管理员",
              weapons: [
                { name: "宏愿", icon: "image/宏愿.png" }
              ],
              equipment: [
                { name: "轻超域护板", icon: "image/equip/item_equip_t4_suit_poise01_body_01.avif", rarity: 5 },
                { name: "轻超域护手", icon: "image/equip/item_equip_t4_suit_poise01_hand_01.avif", rarity: 5 },
                { name: "轻超域分析环", icon: "image/equip/item_equip_t4_suit_poise01_edc_01.avif", rarity: 5 },
                { name: "轻超域稳定盘", icon: "image/equip/item_equip_t4_suit_poise01_edc_02.avif", rarity: 5 }
              ]
            },
            {
              name: "管理员(下位)",
              tag: "下位",
              weapons: [
                { name: "古渠", icon: "image/古渠.png" }
              ],
              equipment: [
              ]
            }
          ]
        },
        {
          options: [
            {
              name: "佩丽卡",
              weapons: [
                { name: "典范", icon: "image/典范.png" }
              ],
              equipment: [
                { name: "轻超域护板", icon: "image/equip/item_equip_t4_suit_poise01_body_01.avif", rarity: 5 },
                { name: "轻超域护手", icon: "image/equip/item_equip_t4_suit_poise01_hand_01.avif", rarity: 5 },
                { name: "轻超域分析环", icon: "image/equip/item_equip_t4_suit_poise01_edc_01.avif", rarity: 5 },
                { name: "轻超域稳定盘", icon: "image/equip/item_equip_t4_suit_poise01_edc_02.avif", rarity: 5 }
              ]
            },
            {
              name: "佩丽卡(下位)",
              tag: "下位",
              weapons: [
                { name: "爆破单元", icon: "image/爆破单元.png" }
              ],
              equipment: [
              ]
            }
          ]
        }
      ]
    }
  });
})();
