/* Heart Rate tab — connect to a heart-rate sensor over Web Bluetooth.
 *
 * Two modes, one tab:
 *   1. Standard  — any device that implements the Bluetooth SIG Heart Rate
 *      Service (0x180D): chest straps (Polar H10/H9, Wahoo Tickr, Garmin HRM),
 *      many rings and watches. Plug-and-play, no key.
 *   2. Amazfit / Mi Band — Huami devices (Amazfit Band 5 ≈ Mi Band 5) speak a
 *      proprietary, *authenticated* protocol. They will not stream heart rate
 *      until you complete an AES challenge/response using the band's
 *      device-specific auth key (32 hex chars). See docs/heart-rate.md for how
 *      to extract that key from the Zepp / Mi Fit app.
 *
 * Web Bluetooth runs only on Chromium browsers (desktop Chrome/Edge, Android
 * Chrome) over HTTPS — not iOS Safari, not Firefox. The UI degrades to a clear
 * "not supported here" message in those cases.
 *
 * The file is split into PURE LOGIC (parsing, hex, auth-message building, the
 * AES step) which is unit-tested under node --test, and the BROWSER GLUE (GATT
 * wiring + DOM) which needs a real device and is verified by hand.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api; // Node — tests require the pure logic.
  } else {
    root.HeartRate = api; // Browser — app.js / index.html use the whole thing.
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---- Bluetooth UUIDs ---------------------------------------------------
  const UUID = {
    // Standard SIG services/characteristics
    heartRate: 0x180d,
    heartRateMeasurement: 0x2a37,
    heartRateControlPoint: 0x2a39,
    battery: 0x180f,
    batteryLevel: 0x2a19,
    // Huami / Mi Band proprietary service + auth characteristic
    miService: "0000fee1-0000-1000-8000-00805f9b34fb",
    miAuth: "00000009-0000-3512-2118-0009af100700",
  };

  // ---- Pure: standard Heart Rate Measurement (0x2A37) --------------------
  // Layout per the Bluetooth SIG spec. flags byte, then BPM (uint8 or uint16),
  // optional energy expended, optional RR-interval list (each 1/1024 s).
  function parseHeartRateMeasurement(dataView) {
    const flags = dataView.getUint8(0);
    const is16 = (flags & 0x01) !== 0;
    const contactSupported = (flags & 0x04) !== 0;
    const contactDetected = (flags & 0x02) !== 0;
    const hasEnergy = (flags & 0x08) !== 0;
    const hasRR = (flags & 0x10) !== 0;

    let i = 1;
    let bpm;
    if (is16) {
      bpm = dataView.getUint16(i, /* littleEndian */ true);
      i += 2;
    } else {
      bpm = dataView.getUint8(i);
      i += 1;
    }

    let energyExpended = null;
    if (hasEnergy) {
      energyExpended = dataView.getUint16(i, true);
      i += 2;
    }

    const rrIntervals = [];
    if (hasRR) {
      for (; i + 2 <= dataView.byteLength; i += 2) {
        const raw = dataView.getUint16(i, true);
        rrIntervals.push((raw / 1024) * 1000); // -> milliseconds
      }
    }

    return { bpm, contactSupported, contactDetected, energyExpended, rrIntervals };
  }

  // ---- Pure: hex helpers for the auth key --------------------------------
  function hexToBytes(hex) {
    const clean = String(hex).trim().replace(/^0x/i, "").replace(/[\s:-]/g, "");
    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length !== 32) {
      throw new Error("Auth key must be 32 hex characters (16 bytes).");
    }
    const out = new Uint8Array(16);
    for (let i = 0; i < 16; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---- Pure: Huami auth handshake messages -------------------------------
  // Mi Band 4/5 (and Amazfit Band 5) "encrypted" auth:
  //   -> [0x02,0x00]                request a 16-byte random number
  //   <- [0x10,0x02,0x01, ...16]    the random number
  //   -> [0x03,0x00, ...cipher16]   AES(random, key)
  //   <- [0x10,0x03,0x01]           success   (0x04 = failure)
  // Opcodes are firmware-family dependent; see Gadgetbridge's Huami classes if
  // a particular band needs tweaking.
  function buildHuamiAuthRequestRandom() {
    return new Uint8Array([0x02, 0x00]);
  }

  function buildHuamiAuthResponse(cipher16) {
    const out = new Uint8Array(2 + cipher16.length);
    out[0] = 0x03;
    out[1] = 0x00;
    out.set(cipher16, 2);
    return out;
  }

  function parseHuamiAuthNotification(dataView) {
    const b0 = dataView.getUint8(0);
    const b1 = dataView.byteLength > 1 ? dataView.getUint8(1) : 0;
    const b2 = dataView.byteLength > 2 ? dataView.getUint8(2) : 0;
    if (b0 === 0x10 && b1 === 0x02 && b2 === 0x01) {
      const random = new Uint8Array(dataView.byteLength - 3);
      for (let i = 0; i < random.length; i++) random[i] = dataView.getUint8(3 + i);
      return { stage: "random", ok: true, random };
    }
    if (b0 === 0x10 && b1 === 0x03 && b2 === 0x01) return { stage: "authok", ok: true };
    if (b0 === 0x10 && b1 === 0x03) return { stage: "authfail", ok: false };
    return { stage: "unknown", ok: false };
  }

  // ---- Pure-ish: the AES step --------------------------------------------
  // Huami uses AES-128-ECB on a single 16-byte block. Web Crypto has no ECB,
  // but ECB of one block == CBC with a zero IV (C1 = E(P1 ^ 0) = E(P1)); we
  // encrypt and keep the first 16 bytes (the rest is CBC's padding block).
  function getSubtle() {
    if (typeof crypto !== "undefined" && crypto.subtle) return crypto.subtle;
    // Node < global webcrypto fallback for the test runner.
    // eslint-disable-next-line global-require
    return require("node:crypto").webcrypto.subtle;
  }

  async function encryptAuthBlock(plain16, key16) {
    const subtle = getSubtle();
    const key = await subtle.importKey("raw", key16, { name: "AES-CBC" }, false, [
      "encrypt",
    ]);
    const iv = new Uint8Array(16); // zeros
    const buf = await subtle.encrypt({ name: "AES-CBC", iv }, key, plain16);
    return new Uint8Array(buf).slice(0, 16);
  }

  const pure = {
    UUID,
    parseHeartRateMeasurement,
    hexToBytes,
    bytesToHex,
    buildHuamiAuthRequestRandom,
    buildHuamiAuthResponse,
    parseHuamiAuthNotification,
    encryptAuthBlock,
  };

  // In Node we only need the pure logic; skip all DOM/Bluetooth wiring.
  if (typeof document === "undefined" || typeof navigator === "undefined") {
    return pure;
  }

  // ======================================================================
  //  BROWSER GLUE — Web Bluetooth + DOM. Hand-verified against real devices.
  // ======================================================================

  const supported = !!(navigator.bluetooth && navigator.bluetooth.requestDevice);

  const el = {};
  const state = {
    device: null,
    server: null,
    hrChar: null,
    connected: false,
    mode: "standard", // or "amazfit"
    rr: [], // recent RR intervals (ms) for a rough HRV readout
    keepAlive: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, kind) {
    if (!el.status) return;
    el.status.textContent = msg;
    el.status.className = "hr-status" + (kind ? " hr-status-" + kind : "");
  }

  function showBpm(bpm) {
    if (el.bpm) el.bpm.textContent = bpm != null ? String(bpm) : "--";
    if (el.heart) el.heart.classList.toggle("beating", bpm != null && bpm > 0);
  }

  // Simple RMSSD over the last handful of RR intervals — a rough HRV feel, not
  // a clinical figure.
  function updateHrv(rrList) {
    if (!el.hrv) return;
    const rr = rrList.slice(-20);
    if (rr.length < 3) {
      el.hrv.textContent = "–";
      return;
    }
    let sum = 0;
    for (let i = 1; i < rr.length; i++) {
      const d = rr[i] - rr[i - 1];
      sum += d * d;
    }
    el.hrv.textContent = Math.round(Math.sqrt(sum / (rr.length - 1))) + " ms";
  }

  function onHrNotification(event) {
    const out = parseHeartRateMeasurement(event.target.value);
    showBpm(out.bpm);
    if (out.rrIntervals.length) {
      state.rr.push(...out.rrIntervals);
      state.rr = state.rr.slice(-60);
      updateHrv(state.rr);
    }
    if (el.contact) {
      if (out.contactSupported) {
        el.contact.hidden = false;
        el.contact.textContent = out.contactDetected
          ? "● Good skin contact"
          : "○ Poor skin contact — adjust the sensor";
        el.contact.classList.toggle("bad", !out.contactDetected);
      } else {
        el.contact.hidden = true;
      }
    }
  }

  async function readBattery(server) {
    try {
      const svc = await server.getPrimaryService(UUID.battery);
      const ch = await svc.getCharacteristic(UUID.batteryLevel);
      const v = await ch.readValue();
      if (el.battery) {
        el.battery.hidden = false;
        el.battery.textContent = "🔋 " + v.getUint8(0) + "%";
      }
    } catch (_) {
      /* many devices don't expose battery — ignore */
    }
  }

  async function startStandard(device) {
    const server = await device.gatt.connect();
    state.server = server;
    const svc = await server.getPrimaryService(UUID.heartRate);
    const ch = await svc.getCharacteristic(UUID.heartRateMeasurement);
    state.hrChar = ch;
    ch.addEventListener("characteristicvaluechanged", onHrNotification);
    await ch.startNotifications();
    readBattery(server);
  }

  // Huami handshake, then start continuous HR and keep it alive.
  async function startAmazfit(device, keyHex) {
    const key = hexToBytes(keyHex); // throws on a bad key, caught by caller
    const server = await device.gatt.connect();
    state.server = server;

    const miSvc = await server.getPrimaryService(UUID.miService);
    const authChar = await miSvc.getCharacteristic(UUID.miAuth);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Auth timed out.")), 15000);
      const onAuth = async (event) => {
        try {
          const note = parseHuamiAuthNotification(event.target.value);
          if (note.stage === "random") {
            const cipher = await encryptAuthBlock(note.random, key);
            await authChar.writeValue(buildHuamiAuthResponse(cipher));
          } else if (note.stage === "authok") {
            cleanup();
            resolve();
          } else if (note.stage === "authfail") {
            cleanup();
            reject(new Error("Band rejected the auth key."));
          }
        } catch (e) {
          cleanup();
          reject(e);
        }
      };
      function cleanup() {
        clearTimeout(timer);
        authChar.removeEventListener("characteristicvaluechanged", onAuth);
      }
      authChar.addEventListener("characteristicvaluechanged", onAuth);
      authChar
        .startNotifications()
        .then(() => authChar.writeValue(buildHuamiAuthRequestRandom()))
        .catch((e) => {
          cleanup();
          reject(e);
        });
    });

    // Authenticated — wire up the standard HR characteristic the band exposes.
    const hrSvc = await server.getPrimaryService(UUID.heartRate);
    const hrMeasure = await hrSvc.getCharacteristic(UUID.heartRateMeasurement);
    state.hrChar = hrMeasure;
    hrMeasure.addEventListener("characteristicvaluechanged", onHrNotification);
    await hrMeasure.startNotifications();

    const control = await hrSvc.getCharacteristic(UUID.heartRateControlPoint);
    // Stop any manual/continuous measurement, then start continuous.
    await control.writeValue(new Uint8Array([0x15, 0x02, 0x00]));
    await control.writeValue(new Uint8Array([0x15, 0x01, 0x00]));
    await control.writeValue(new Uint8Array([0x15, 0x01, 0x01]));
    // The band stops continuous HR unless pinged every ~12 s.
    state.keepAlive = setInterval(() => {
      control.writeValue(new Uint8Array([0x16])).catch(() => {});
    }, 12000);

    readBattery(server);
  }

  async function connect() {
    if (!supported) return;
    state.mode = el.modeAmazfit && el.modeAmazfit.checked ? "amazfit" : "standard";
    const keyHex = el.authKey ? el.authKey.value.trim() : "";

    if (state.mode === "amazfit") {
      try {
        hexToBytes(keyHex);
      } catch (e) {
        setStatus(e.message, "error");
        return;
      }
    }

    try {
      setStatus("Choose your device in the browser prompt…");
      const options =
        state.mode === "amazfit"
          ? {
              // Match Mi Band / Amazfit by name and expose the proprietary service.
              filters: [{ namePrefix: "Amazfit" }, { namePrefix: "Mi Band" }, { namePrefix: "Mi Smart Band" }],
              optionalServices: [UUID.miService, UUID.heartRate, UUID.battery],
            }
          : {
              filters: [{ services: [UUID.heartRate] }],
              optionalServices: [UUID.battery],
            };
      const device = await navigator.bluetooth.requestDevice(options);
      state.device = device;
      device.addEventListener("gattserverdisconnected", onDisconnected);

      setStatus("Connecting…");
      if (state.mode === "amazfit") await startAmazfit(device, keyHex);
      else await startStandard(device);

      state.connected = true;
      setStatus("Connected to " + (device.name || "device") + ".", "ok");
      if (el.deviceName) el.deviceName.textContent = device.name || "";
      if (el.connectBtn) el.connectBtn.hidden = true;
      if (el.disconnectBtn) el.disconnectBtn.hidden = false;
    } catch (e) {
      if (e && e.name === "NotFoundError") {
        setStatus("No device selected.");
      } else {
        setStatus((e && e.message) || "Could not connect.", "error");
      }
      teardown();
    }
  }

  function teardown() {
    if (state.keepAlive) clearInterval(state.keepAlive);
    state.keepAlive = null;
    if (state.hrChar) {
      try {
        state.hrChar.removeEventListener("characteristicvaluechanged", onHrNotification);
      } catch (_) {}
    }
    state.hrChar = null;
    state.rr = [];
    showBpm(null);
    updateHrv([]);
    if (el.hrv) el.hrv.textContent = "–";
  }

  function onDisconnected() {
    state.connected = false;
    teardown();
    setStatus("Disconnected.", "");
    if (el.connectBtn) el.connectBtn.hidden = false;
    if (el.disconnectBtn) el.disconnectBtn.hidden = true;
    if (el.contact) el.contact.hidden = true;
    if (el.battery) el.battery.hidden = true;
  }

  function disconnect() {
    teardown();
    if (state.device && state.device.gatt && state.device.gatt.connected) {
      state.device.gatt.disconnect(); // fires gattserverdisconnected -> onDisconnected
    } else {
      onDisconnected();
    }
  }

  function syncModeUi() {
    const amazfit = el.modeAmazfit && el.modeAmazfit.checked;
    if (el.authKeyRow) el.authKeyRow.hidden = !amazfit;
  }

  function init() {
    el.panel = $("heartPanel");
    if (!el.panel) return;
    el.status = $("hrStatus");
    el.bpm = $("hrBpm");
    el.heart = $("hrHeart");
    el.hrv = $("hrHrv");
    el.contact = $("hrContact");
    el.battery = $("hrBattery");
    el.deviceName = $("hrDeviceName");
    el.connectBtn = $("hrConnectBtn");
    el.disconnectBtn = $("hrDisconnectBtn");
    el.modeStandard = $("hrModeStandard");
    el.modeAmazfit = $("hrModeAmazfit");
    el.authKeyRow = $("hrAuthKeyRow");
    el.authKey = $("hrAuthKey");
    el.unsupported = $("hrUnsupported");
    el.controls = $("hrControls");

    if (!supported) {
      if (el.unsupported) el.unsupported.hidden = false;
      if (el.controls) el.controls.hidden = true;
      setStatus("Web Bluetooth isn't available in this browser.", "");
      return;
    }

    el.connectBtn.addEventListener("click", connect);
    if (el.disconnectBtn) el.disconnectBtn.addEventListener("click", disconnect);
    [el.modeStandard, el.modeAmazfit].forEach((r) => {
      if (r) r.addEventListener("change", syncModeUi);
    });
    syncModeUi();
    setStatus("Ready. Pick a mode and press Connect.");
  }

  // Called by app.js when the user leaves the Heart Rate tab.
  function onLeaveTab() {
    /* Keep the connection alive across tabs; nothing to tear down. */
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return Object.assign({}, pure, { init, connect, disconnect, onLeaveTab, isSupported: () => supported });
});
