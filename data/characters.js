(function () {
  window.characters = window.characters || [];
  const scripts = window.__APP_CHARACTER_SCRIPTS__ || [];
  const newScript = "./data/characters/tangtang.js";
  if (!scripts.includes(newScript)) {
    scripts.push(newScript);
  }
  window.__APP_CHARACTER_SCRIPTS__ = scripts;
})();
