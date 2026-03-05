// Authoring contract:
// 1) Top-level key must be `weaponName`.
// 2) Each weapon entry only allows `windows`.
// 3) Each window only allows string `start` and `end`.
// 4) Do not duplicate role/avatar/special-weapon fields in this file.
window.WEAPON_UP_SCHEDULES = {
  熔铸火焰: {
    windows: [{ start: "2026-01-22T12:00:00+08:00", end: "2026-02-07T11:59:00+08:00" }],
  },
  使命必达: {
    windows: [{ start: "2026-02-07T12:00:00+08:00", end: "2026-02-24T11:59:00+08:00" }],
  },
  艺术暴君: {
    windows: [{ start: "2026-02-24T12:00:00+08:00", end: "2026-03-12T11:59:00+08:00" }],
  },
  落草: {
    windows: [{ start: "2026-03-12T12:00:00+08:00", end: "2026-03-29T11:59:00+08:00" }],
  },
  狼之绯: {
    windows: [{ start: "2026-03-29T12:00:00+08:00", end: "2026-04-15T11:59:00+08:00" }],
  },
};
