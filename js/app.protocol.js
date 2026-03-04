(function (globalObject) {
  var root = globalObject;
  if (!root || typeof root !== "object") {
    return;
  }

  if (typeof window !== "undefined") {
    window.__APP_BOOT__ = window.__APP_BOOT__ || {};
  }
  var appBoot = root.__APP_BOOT__ || {};
  var protocolStore =
    appBoot.protocols && typeof appBoot.protocols === "object"
      ? appBoot.protocols
      : Object.create(null);
  var legacyMap =
    appBoot.legacyMap && typeof appBoot.legacyMap === "object"
      ? appBoot.legacyMap
      : Object.create(null);
  var warnedLegacyAccess = Object.create(null);

  var resolveRuntimeEnv = function () {
    var fromGlobal = root.__APP_ENV__;
    if (typeof fromGlobal === "string" && fromGlobal.trim()) {
      return fromGlobal.trim().toLowerCase();
    }
    if (
      typeof process !== "undefined" &&
      process &&
      process.env &&
      typeof process.env.NODE_ENV === "string" &&
      process.env.NODE_ENV.trim()
    ) {
      return process.env.NODE_ENV.trim().toLowerCase();
    }
    var host =
      root.location && typeof root.location.hostname === "string"
        ? root.location.hostname.toLowerCase()
        : "";
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return "development";
    }
    return "production";
  };

  var resolveLegacyAccessMode = function (runtimeEnv) {
    var fromGlobal = root.__APP_BOOT_LEGACY_MODE;
    var normalized = typeof fromGlobal === "string" ? fromGlobal.trim().toLowerCase() : "";
    if (normalized === "allow" || normalized === "warn" || normalized === "throw") {
      return normalized;
    }
    return runtimeEnv === "production" ? "warn" : "allow";
  };

  var runtimeEnv = resolveRuntimeEnv();
  var legacyAccessMode = resolveLegacyAccessMode(runtimeEnv);

  var warnLegacyAccess = function (legacyName, protocolName) {
    var warnKey = legacyName + "->" + protocolName;
    if (warnedLegacyAccess[warnKey]) {
      return;
    }
    warnedLegacyAccess[warnKey] = true;
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(
        `[app-protocol] legacy protocol "${legacyName}" was accessed. Use window.__APP_BOOT__.readProtocol("${protocolName}") instead.`
      );
    }
  };

  var publishProtocol = function (protocolName, value) {
    if (!protocolName) return value;
    protocolStore[protocolName] = value;
    return value;
  };

  var readProtocol = function (protocolName) {
    if (!protocolName) return undefined;
    return protocolStore[protocolName];
  };

  var setLegacyAccessMode = function (mode) {
    var normalized = String(mode || "").trim().toLowerCase();
    if (normalized === "allow" || normalized === "warn" || normalized === "throw") {
      legacyAccessMode = normalized;
      appBoot.legacyAccessMode = legacyAccessMode;
    }
    return legacyAccessMode;
  };

  var getLegacyAccessMode = function () {
    return legacyAccessMode;
  };

  var onLegacyAccess = function (legacyName, protocolName) {
    if (legacyAccessMode === "throw") {
      throw new Error(
        `[app-protocol] legacy protocol "${legacyName}" access is blocked in ${runtimeEnv} mode`
      );
    }
    if (legacyAccessMode === "warn" || runtimeEnv === "production") {
      warnLegacyAccess(legacyName, protocolName);
    }
  };

  var bridgeLegacyProtocol = function (legacyName, protocolName, options) {
    if (!legacyName || !protocolName) return;
    var descriptor = Object.getOwnPropertyDescriptor(root, legacyName);
    var existingValue;
    if (descriptor) {
      if (typeof descriptor.get === "function") {
        try {
          existingValue = descriptor.get.call(root);
        } catch (error) {
          existingValue = undefined;
        }
      } else if (Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        existingValue = descriptor.value;
      }
    } else {
      existingValue = root[legacyName];
    }
    if (typeof existingValue !== "undefined") {
      publishProtocol(protocolName, existingValue);
    }
    var shouldWarnOnRead = !options || options.warnOnRead !== false;
    Object.defineProperty(root, legacyName, {
      configurable: true,
      enumerable: true,
      get: function () {
        if (shouldWarnOnRead) {
          onLegacyAccess(legacyName, protocolName);
        }
        return readProtocol(protocolName);
      },
      set: function (value) {
        publishProtocol(protocolName, value);
      },
    });
    legacyMap[legacyName] = protocolName;
  };

  appBoot.protocols = protocolStore;
  appBoot.legacyMap = legacyMap;
  appBoot.runtimeEnv = runtimeEnv;
  appBoot.legacyAccessMode = legacyAccessMode;
  appBoot.resolveLegacyAccessMode = resolveLegacyAccessMode;
  appBoot.setLegacyAccessMode = setLegacyAccessMode;
  appBoot.getLegacyAccessMode = getLegacyAccessMode;
  appBoot.publishProtocol = publishProtocol;
  appBoot.readProtocol = readProtocol;
  appBoot.bridgeLegacyProtocol = bridgeLegacyProtocol;
  root.__APP_BOOT__ = appBoot;

  bridgeLegacyProtocol("__loadScript", "loadScript");
  bridgeLegacyProtocol("__renderBootError", "renderBootError");
  bridgeLegacyProtocol("__startBootstrapEntry", "startBootstrapEntry");
  bridgeLegacyProtocol("__APP_SCRIPT_CHAIN", "appScriptChain");
})(
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : this
);
