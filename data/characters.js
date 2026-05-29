(function () {
  window.characters = window.characters || [];
  var scripts = window.__APP_CHARACTER_SCRIPTS__ || [];

  // 添加新角色只需在这里加一行 ID
  var characterIds = [
    "tangtang",
    "rossi",
    "lifeng",
    "zhuangfangyi",
    "gilberta",
    "laevatain",
    "snowshine",
  ];

  characterIds.forEach(function (id) {
    var path = "./data/characters/" + id + ".js";
    if (scripts.indexOf(path) === -1) {
      scripts.push(path);
    }
  });

  window.__APP_CHARACTER_SCRIPTS__ = scripts;
})();
