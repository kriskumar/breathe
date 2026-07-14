# Soham — iOS app (Capacitor)

A native iOS wrapper for the Soham breathing PWA. It **reuses the existing web
app unchanged** (`../index.html`, `../js/*`, `../css/*`, `../mp3/*`) and layers
native capabilities on top through a small shim, so there is a single source of
truth for the app's behaviour.

Nothing in this folder modifies the web app. The build copies the web assets
into `www/` (read-only consumption) and injects one `<script>` tag into the
*copy* only.

## What the native layer adds

The web app can't do three things inside Safari/WKWebView on iOS. The shim
(`src/native/index.js`) transparently fixes all three, with **no edits to
`app.js` or `heartrate.js`**:

| Web API the app uses | iOS problem | Native replacement |
|----------------------|-------------|--------------------|
| `navigator.bluetooth` (heart rate) | Doesn't exist on iOS | `@capacitor-community/bluetooth-le` |
| `navigator.vibrate` (haptic cues) | Ignored on iOS | `@capacitor/haptics` (Taptic Engine) |
| `navigator.wakeLock` (screen awake) | Fallback if absent | `@capacitor-community/keep-awake` |
| Web Audio in background | Suspended on lock | AVAudioSession config + auto-resume |

The Bluetooth shim implements the exact subset of the Web Bluetooth GATT API
that `heartrate.js` calls (`requestDevice` → `gatt.connect` → `getPrimaryService`
→ `getCharacteristic` → `read/write/startNotifications`), so the existing
Standard-monitor **and** Amazfit/Mi-Band auth flows work as-is — and the Heart
Rate tab works on iPhone for the first time.

## Layout

```
ios-app/
├── package.json            Capacitor deps + build scripts
├── capacitor.config.json   App id, name, plugin config
├── scripts/sync-web.mjs    Copies ../ web assets → www/ (read-only), injects shim tag
├── src/native/index.js     The native shim (source; bundled by esbuild)
├── native-notes/           Swift/Info.plist reference for the Mac-only steps
│   ├── BackgroundAudio.swift
│   └── HealthKit.swift
├── www/                    Generated web bundle (gitignored)
└── ios/                    Native Xcode project (generated on a Mac, gitignored)
```

## Build & run (needs a Mac with Xcode for the final step)

Everything except the last two commands runs on any machine:

```bash
cd ios-app
npm install
npm run build          # sync web assets + bundle the native shim -> www/

# --- macOS only, once you have Xcode + CocoaPods ---
npx cap add ios        # generates the native ios/ project
npx cap sync ios       # copies www/ + installs native pods
npx cap open ios       # opens Xcode
```

`npm run build` is safe to re-run any time the web app changes — it re-copies
`../` into `www/`. After that, `npx cap sync ios` pushes it into the native
project. (`npm run cap:sync` does both.)

## Mac-only native steps (once, in Xcode)

These can't be scripted from here — do them in the generated `ios/` project.
Reference code is in `native-notes/`.

1. **Signing** — select your existing Apple Developer team on the app target.
2. **Background audio** — add the `audio` background mode and activate an
   `AVAudioSession` (`.playback`). See `native-notes/BackgroundAudio.swift`.
   This is what keeps tones/voice/ambient playing when the screen locks.
3. **Bluetooth Info.plist strings** — `NSBluetoothAlwaysUsageDescription` /
   `NSBluetoothPeripheralUsageDescription` (snippets in `BackgroundAudio.swift`).
4. **(Optional) HealthKit** — log completed sessions as Mindful Minutes. Enable
   the HealthKit capability, add the usage strings, and add a HealthKit plugin.
   The shim auto-detects it (`installHealthLogging`) with **no app-code edits** —
   it watches the "Session Complete" message the app already shows.

## App Store review notes

- The native BLE + background audio (+ optional HealthKit) are what make this a
  real app rather than a wrapped website — important for Guideline 4.2.
- The web app currently loads **Google Analytics (gtag)**. For a wellness app,
  consider removing it or declaring it in the privacy nutrition label. Because
  the app is served locally from the bundle, you could strip that `<script>`
  from the copy in `scripts/sync-web.mjs` if you'd rather not ship it.
- Keep the existing "wellness guidance, not medical advice" disclaimer visible.

## Why `www/` and `ios/` are gitignored

Both are generated. `www/` is rebuilt from the repo root on every `npm run
build`; `ios/` is created by `npx cap add ios` on a Mac. Committing them would
duplicate the web app and pin machine-specific native project files. The source
of truth stays the web app plus this folder's scripts.
