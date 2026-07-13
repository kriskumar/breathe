/*
 * ios-shims.js (source) — native capability layer for the Soham iOS app.
 *
 * Goal: run the EXISTING web app (js/app.js, js/heartrate.js, …) completely
 * unchanged inside a Capacitor WKWebView, while transparently upgrading the
 * three things the web platform can't do on iOS:
 *
 *   1. navigator.vibrate   -> native Haptics (Web Vibration is ignored on iOS)
 *   2. navigator.bluetooth -> native BLE     (Web Bluetooth doesn't exist on iOS)
 *   3. navigator.wakeLock  -> KeepAwake      (fallback if Screen Wake Lock is absent)
 *
 * It also keeps the Web Audio context alive across background/resume so a
 * session's tones/ambient don't die when the app is backgrounded. True
 * screen-locked background audio additionally needs the native AVAudioSession
 * config described in native-notes/BackgroundAudio.swift.
 *
 * Everything here is a no-op on the web (Capacitor.isNativePlatform() === false),
 * so the same www/ bundle still works as a plain PWA.
 */
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { BleClient } from "@capacitor-community/bluetooth-le";

function install() {
  if (!Capacitor || !Capacitor.isNativePlatform()) return;
  installHaptics();
  installWakeLock();
  installAudioResume();
  installBluetooth();
  // Health logging is opt-in — only wires up if a HealthKit plugin is present.
  installHealthLogging();
}

/* ------------------------------------------------------------------ *
 * 1. Haptics  — navigator.vibrate(ms) -> Taptic Engine
 * ------------------------------------------------------------------ */
function installHaptics() {
  const impact = (style) => {
    Haptics.impact({ style }).catch(() => {});
  };
  navigator.vibrate = function (pattern) {
    const ms = Array.isArray(pattern) ? pattern[0] : pattern;
    if (!ms) return true;
    // app.js uses 45ms for inhale/exhale (stronger) and 18ms for holds (faint).
    impact(ms >= 40 ? ImpactStyle.Medium : ImpactStyle.Light);
    return true;
  };
}

/* ------------------------------------------------------------------ *
 * 3. Wake lock — only shim if the WebView lacks Screen Wake Lock.
 *    app.js calls navigator.wakeLock.request('screen').
 * ------------------------------------------------------------------ */
function installWakeLock() {
  if (navigator.wakeLock && typeof navigator.wakeLock.request === "function") {
    return; // WKWebView already supports it (iOS 16.4+) — leave it alone.
  }
  navigator.wakeLock = {
    request: async function () {
      await KeepAwake.keepAwake().catch(() => {});
      const sentinel = new EventTarget();
      sentinel.released = false;
      sentinel.type = "screen";
      sentinel.release = async function () {
        this.released = true;
        await KeepAwake.allowSleep().catch(() => {});
        this.dispatchEvent(new Event("release"));
      };
      // Support the onrelease property the way the real API does.
      Object.defineProperty(sentinel, "onrelease", {
        set(fn) { sentinel.addEventListener("release", fn); },
        configurable: true,
      });
      return sentinel;
    },
  };
}

/* ------------------------------------------------------------------ *
 * Audio: iOS suspends the Web Audio context when backgrounded. Track
 * every context the app creates and resume them when the app returns.
 * ------------------------------------------------------------------ */
function installAudioResume() {
  const contexts = new Set();
  const Native = window.AudioContext || window.webkitAudioContext;
  if (Native) {
    const Wrapped = function (...args) {
      const ctx = new Native(...args);
      contexts.add(ctx);
      return ctx;
    };
    Wrapped.prototype = Native.prototype;
    window.AudioContext = Wrapped;
    window.webkitAudioContext = Wrapped;
  }
  const resumeAll = () => {
    contexts.forEach((ctx) => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    });
  };
  App.addListener("resume", resumeAll);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resumeAll();
  });
}

/* ------------------------------------------------------------------ *
 * 2. Web Bluetooth -> Capacitor BLE.
 *
 * heartrate.js drives the standard Web Bluetooth GATT API. We implement
 * exactly the subset it uses on top of BleClient, so heartrate.js needs
 * no changes and works on iPhone for the first time.
 * ------------------------------------------------------------------ */
function installBluetooth() {
  let initialized = false;
  const ensureInit = async () => {
    if (!initialized) {
      await BleClient.initialize();
      initialized = true;
    }
  };

  navigator.bluetooth = {
    async requestDevice(options = {}) {
      await ensureInit();
      const filters = options.filters || [];
      const services = [];
      const namePrefixes = [];
      for (const f of filters) {
        if (f.services) services.push(...f.services.map(normUuid));
        if (f.namePrefix) namePrefixes.push(f.namePrefix);
      }
      const optionalServices = (options.optionalServices || []).map(normUuid);

      const reqOpts = { optionalServices };
      if (services.length) reqOpts.services = services;
      // BleClient supports a single namePrefix; when the app offers several
      // (Amazfit / Mi Band …) we show all nearby devices and let the user pick.
      if (namePrefixes.length === 1) reqOpts.namePrefix = namePrefixes[0];

      let picked;
      try {
        picked = await BleClient.requestDevice(reqOpts);
      } catch (e) {
        // Map "user cancelled" onto the Web Bluetooth NotFoundError contract.
        const err = new Error((e && e.message) || "No device selected.");
        err.name = "NotFoundError";
        throw err;
      }
      return new BluetoothDevice(picked.deviceId, picked.name);
    },
  };
}

// 16-bit SIG numbers -> full 128-bit UUID; strings are lowercased.
function normUuid(u) {
  if (typeof u === "number") {
    return "0000" + u.toString(16).padStart(4, "0") + "-0000-1000-8000-00805f9b34fb";
  }
  return String(u).toLowerCase();
}

function toDataView(value) {
  if (value instanceof DataView) return value;
  if (value instanceof ArrayBuffer) return new DataView(value);
  if (ArrayBuffer.isView(value)) {
    return new DataView(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError("Unsupported value for writeValue");
}

class BluetoothDevice extends EventTarget {
  constructor(deviceId, name) {
    super();
    this.id = deviceId;
    this.name = name || "";
    this.gatt = new BluetoothRemoteGATTServer(this);
  }
}

class BluetoothRemoteGATTServer {
  constructor(device) {
    this.device = device;
    this.connected = false;
  }
  async connect() {
    await BleClient.connect(this.device.id, () => {
      this.connected = false;
      this.device.dispatchEvent(new Event("gattserverdisconnected"));
    });
    this.connected = true;
    return this;
  }
  async getPrimaryService(uuid) {
    return new BluetoothRemoteGATTService(this, normUuid(uuid));
  }
  disconnect() {
    // Web Bluetooth's disconnect() is sync-fire-and-forget.
    BleClient.disconnect(this.device.id).catch(() => {});
    this.connected = false;
  }
}

class BluetoothRemoteGATTService {
  constructor(server, uuid) {
    this.server = server;
    this.uuid = uuid;
  }
  async getCharacteristic(uuid) {
    return new BluetoothRemoteGATTCharacteristic(this, normUuid(uuid));
  }
}

class BluetoothRemoteGATTCharacteristic extends EventTarget {
  constructor(service, uuid) {
    super();
    this.service = service;
    this.uuid = uuid;
    this.value = null;
    this._deviceId = service.server.device.id;
    this._serviceUuid = service.uuid;
  }
  async readValue() {
    const dv = await BleClient.read(this._deviceId, this._serviceUuid, this.uuid);
    this.value = dv;
    return dv;
  }
  async writeValue(value) {
    await BleClient.write(this._deviceId, this._serviceUuid, this.uuid, toDataView(value));
  }
  async startNotifications() {
    await BleClient.startNotifications(
      this._deviceId,
      this._serviceUuid,
      this.uuid,
      (dv) => {
        this.value = dv;
        // event.target.value is what heartrate.js reads.
        this.dispatchEvent(new Event("characteristicvaluechanged"));
      }
    );
    return this;
  }
  async stopNotifications() {
    await BleClient.stopNotifications(this._deviceId, this._serviceUuid, this.uuid).catch(() => {});
    return this;
  }
}

/* ------------------------------------------------------------------ *
 * Optional: log a completed breathing session to Apple Health as a
 * mindfulness minute. Inert unless a HealthKit plugin is registered
 * (see native-notes/HealthKit.swift). No edits to app.js — we watch the
 * DOM for the "Session Complete" message the app already shows.
 * ------------------------------------------------------------------ */
function installHealthLogging() {
  const Health = Capacitor.Plugins && Capacitor.Plugins.HealthKit;
  if (!Health) return;
  const el = document.getElementById("completionMessage");
  if (!el) return;

  let sessionStart = null;
  const controlBtn = document.getElementById("controlBtn");
  if (controlBtn) {
    controlBtn.addEventListener("click", () => {
      if (/start/i.test(controlBtn.textContent || "")) sessionStart = Date.now();
    });
  }

  const obs = new MutationObserver(() => {
    const shown = getComputedStyle(el).display !== "none" && !el.hidden;
    if (shown && sessionStart) {
      const start = sessionStart;
      sessionStart = null;
      Health.saveMindfulSession({ startDate: start, endDate: Date.now() }).catch(() => {});
    }
  });
  obs.observe(el, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
}

install();
