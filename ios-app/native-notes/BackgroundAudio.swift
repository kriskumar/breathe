//
//  BackgroundAudio.swift  (reference — apply inside the generated ios/ project)
//
//  Makes tones / ambient / voice keep playing when the screen locks or the app
//  is backgrounded. Two parts are required:
//
//  1) Info.plist  — add the "audio" background mode:
//
//        <key>UIBackgroundModes</key>
//        <array>
//            <string>audio</string>
//        </array>
//
//     Capacitor also needs the Bluetooth usage strings for the HR feature:
//
//        <key>NSBluetoothAlwaysUsageDescription</key>
//        <string>Soham connects to your heart-rate monitor to show your live pulse.</string>
//        <key>NSBluetoothPeripheralUsageDescription</key>
//        <string>Soham connects to your heart-rate monitor to show your live pulse.</string>
//
//  2) Configure the shared AVAudioSession as a .playback session at launch.
//     Add the call below to AppDelegate.application(_:didFinishLaunchingWithOptions:).
//
//  Once the session category is .playback and the audio background mode is set,
//  the WKWebView's Web Audio output continues while the device is locked.
//

import AVFoundation

enum SohamAudioSession {
    static func activate() {
        let session = AVAudioSession.sharedInstance()
        do {
            // .playback keeps audio alive in the background; .mixWithOthers is
            // optional — drop it if you want Soham to pause other apps' audio.
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Soham: failed to activate audio session: \(error)")
        }
    }
}

// In AppDelegate.swift:
//
//   func application(_ application: UIApplication,
//                    didFinishLaunchingWithOptions launchOptions: ...) -> Bool {
//       SohamAudioSession.activate()
//       return true
//   }
