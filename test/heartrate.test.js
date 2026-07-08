/* Tests for the pure, hardware-independent logic in js/heartrate.js.
 *
 * These cover the parts we can verify without a real Bluetooth device:
 *   - parsing the standard BLE Heart Rate Measurement characteristic (0x2A37)
 *   - hex <-> byte helpers for the Huami/Amazfit auth key
 *   - building the Huami auth handshake messages
 *   - the AES step (ECB-of-one-block via CBC/zero-IV) against a known vector
 *
 * The Web Bluetooth glue (requestDevice/GATT) needs a physical band and a
 * Chromium browser, so it is exercised manually, not here.
 *
 * Run: node --test
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const HR = require("../js/heartrate.js");

function dv(bytes) {
  return new DataView(new Uint8Array(bytes).buffer);
}

test("parseHeartRateMeasurement: 8-bit BPM, no extras", () => {
  // flags = 0x00 -> uint8 BPM, no contact bits, no energy, no RR
  const out = HR.parseHeartRateMeasurement(dv([0x00, 72]));
  assert.equal(out.bpm, 72);
  assert.equal(out.contactSupported, false);
  assert.deepEqual(out.rrIntervals, []);
});

test("parseHeartRateMeasurement: 16-bit BPM (flag bit 0 set)", () => {
  // flags = 0x01 -> uint16 little-endian BPM = 300
  const out = HR.parseHeartRateMeasurement(dv([0x01, 0x2c, 0x01]));
  assert.equal(out.bpm, 300);
});

test("parseHeartRateMeasurement: sensor-contact detected (bits 1-2)", () => {
  // flags = 0x06 -> contact feature supported (bit2) + contact detected (bit1)
  const out = HR.parseHeartRateMeasurement(dv([0x06, 65]));
  assert.equal(out.bpm, 65);
  assert.equal(out.contactSupported, true);
  assert.equal(out.contactDetected, true);
});

test("parseHeartRateMeasurement: RR intervals present (bit4), 1/1024s -> ms", () => {
  // flags = 0x10 -> RR present. One RR value 0x0400 = 1024 -> 1000 ms.
  const out = HR.parseHeartRateMeasurement(dv([0x10, 60, 0x00, 0x04]));
  assert.equal(out.bpm, 60);
  assert.equal(out.rrIntervals.length, 1);
  assert.ok(Math.abs(out.rrIntervals[0] - 1000) < 0.001);
});

test("hex helpers round-trip", () => {
  const hex = "0123456789abcdef0011223344556677";
  const bytes = HR.hexToBytes(hex);
  assert.equal(bytes.length, 16);
  assert.equal(HR.bytesToHex(bytes), hex);
});

test("hexToBytes rejects malformed keys", () => {
  assert.throws(() => HR.hexToBytes("xyz"));
  assert.throws(() => HR.hexToBytes("0123")); // wrong length for a 16-byte key
});

test("buildHuamiAuthRequestRandom asks for a random number", () => {
  assert.deepEqual(Array.from(HR.buildHuamiAuthRequestRandom()), [0x02, 0x00]);
});

test("buildHuamiAuthResponse prefixes 0x03 0x00 before the ciphertext", () => {
  const cipher = new Uint8Array(16).fill(0xaa);
  const msg = HR.buildHuamiAuthResponse(cipher);
  assert.equal(msg.length, 18);
  assert.deepEqual(Array.from(msg.slice(0, 2)), [0x03, 0x00]);
  assert.deepEqual(Array.from(msg.slice(2)), Array.from(cipher));
});

test("parseHuamiAuthNotification recognises the random-number stage", () => {
  const rnd = Array.from({ length: 16 }, (_, i) => i + 1);
  const out = HR.parseHuamiAuthNotification(dv([0x10, 0x02, 0x01, ...rnd]));
  assert.equal(out.stage, "random");
  assert.equal(out.ok, true);
  assert.deepEqual(Array.from(out.random), rnd);
});

test("parseHuamiAuthNotification recognises auth success and failure", () => {
  assert.equal(HR.parseHuamiAuthNotification(dv([0x10, 0x03, 0x01])).stage, "authok");
  assert.equal(HR.parseHuamiAuthNotification(dv([0x10, 0x03, 0x01])).ok, true);
  const fail = HR.parseHuamiAuthNotification(dv([0x10, 0x03, 0x04]));
  assert.equal(fail.stage, "authfail");
  assert.equal(fail.ok, false);
});

test("encryptAuthBlock matches a known AES-128-ECB test vector (FIPS-197)", async () => {
  // FIPS-197 example: key 000102...0f, plaintext 00112233...ff
  const key = HR.hexToBytes("000102030405060708090a0b0c0d0e0f");
  const pt = HR.hexToBytes("00112233445566778899aabbccddeeff");
  const ct = await HR.encryptAuthBlock(pt, key);
  assert.equal(HR.bytesToHex(ct), "69c4e0d86a7b0430d8cdb78070b4c55a");
});
