# Heart Rate tab — connecting a sensor

The **❤️ Heart Rate** tab reads live heart rate from a Bluetooth sensor using
[Web Bluetooth](https://developer.mozilla.org/docs/Web/API/Web_Bluetooth_API).

## Where it works

Web Bluetooth is only available in **Chromium browsers over HTTPS**:

| Platform | Works? |
|---|---|
| Chrome / Edge on desktop (Win, macOS, Linux, ChromeOS) | ✅ |
| Chrome on Android | ✅ |
| Safari (iPhone/iPad/macOS) | ❌ not supported |
| Firefox | ❌ not supported |

On unsupported browsers the tab shows a short explanation instead of the
controls.

## Two modes

### 1. Standard HR monitor (plug & play)

Any device that implements the Bluetooth SIG **Heart Rate Service** (`0x180D`):
chest straps (Polar H10/H9, Wahoo Tickr, Garmin HRM-Dual/Pro), and many rings
and watches. Pick **Standard HR monitor**, press **Connect**, choose the device
in the browser prompt. No key, no setup.

You get live BPM, a rough HRV (RMSSD) reading when the sensor reports
RR-intervals, sensor-contact quality, and battery level where exposed.

### 2. Amazfit / Mi Band (needs an auth key)

The **Amazfit Band 5** (a Huami device, essentially a Mi Band 5) does **not**
stream heart rate to a browser out of the box. It speaks a proprietary protocol
and requires an encrypted **AES challenge/response handshake** using a
**device-specific auth key** before it will send anything. This is the same key
[Gadgetbridge](https://gadgetbridge.org/gadgets/wearables/amazfit/#device__amazfit_band_5)
asks for.

Once you have the key, pick **Amazfit / Mi Band**, paste the 32-hex-character
key, and press **Connect**.

> **Important:** a band can only be connected to one app at a time. The Band 5
> must be **un-paired / removed from the Zepp (or Mi Fit / Zepp Life) app** on
> your phone before the browser can connect to it. Re-pairing to Zepp later can
> rotate the key.

## How to get the auth key

The key is created the first time the band pairs with the official vendor app.
You extract it once, then reuse it.

### Option A — `huami-token` (no root)

The community tool [`huami-token`](https://codeberg.org/argrento/huami-token)
logs into your Amazfit/Zepp/Mi Fit **account** and prints the auth keys for the
devices on it.

1. Pair the Band 5 with the **Zepp** (or Zepp Life / Mi Fit) app as normal, so
   the account holds a key for it.
2. Run `huami-token` with your account credentials (see its README; supports
   Amazfit and Xiaomi/Mi accounts, email or region login).
3. It prints an **auth key** like `0x` followed by 32 hex characters. Copy the
   32 hex characters (the tool may show them with or without the `0x` — either
   is fine; the app strips `0x`).

### Option B — Android backup / logcat (rooted or debuggable)

If you use **Gadgetbridge**, it stores/needs the same key. On rooted devices
the key can be pulled from the vendor app's data, or captured from `logcat`
during pairing. This is more involved — `huami-token` is the easier path.

### Sanity check

A valid key is exactly **16 bytes = 32 hex characters**, e.g.
`0123456789abcdef0123456789abcdef`. The app rejects anything else before it
tries to connect.

## What "other information" is realistic

Over standard Web Bluetooth you can get:

- **Heart rate (BPM)** — live.
- **RR-intervals → HRV (RMSSD)** — when the sensor reports them (most chest
  straps do; wrist bands often don't).
- **Sensor contact** quality — for straps that report it.
- **Battery %** — where the device exposes the Battery Service.

Steps, sleep, SpO₂ and stress are **not** available this way — those live behind
the phone app's own sync and are out of scope for a browser page.

## Troubleshooting

- **"Band rejected the auth key."** Wrong key, or the band re-paired to Zepp and
  rotated it. Re-extract with `huami-token`.
- **"Auth timed out." / can't find the band.** It's probably still bonded to the
  Zepp app — remove it there, then retry. Make sure the band is awake and near.
- **Nothing happens on iPhone.** Web Bluetooth isn't available in iOS Safari;
  use Chrome/Edge on desktop or Chrome on Android.
- **The handshake connects but no BPM.** Opcodes can vary by firmware family;
  the relevant reference is Gadgetbridge's Huami/Mi Band support classes.

## For developers

The pure logic (HR-measurement parsing, hex helpers, Huami auth-message
building, the AES step) lives in `js/heartrate.js` and is unit-tested:

```
node --test
```

The Web Bluetooth glue needs a real device and a Chromium browser, so it's
verified by hand.
