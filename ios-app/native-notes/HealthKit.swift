//
//  HealthKit.swift  (reference — optional)
//
//  Logs each completed breathing session to Apple Health as a Mindful Minutes
//  entry. This is optional, but it's the single best "native value-add" for App
//  Store review (Guideline 4.2): it makes the app more than a wrapped website.
//
//  Two ways to wire it up:
//
//  A) Use a community plugin (fastest):
//        npm i @perfood/capacitor-healthkit
//     …then expose a `saveMindfulSession({ startDate, endDate })` bridge. The
//     JS shim (src/native/index.js -> installHealthLogging) already calls
//     Capacitor.Plugins.HealthKit.saveMindfulSession when it exists.
//
//  B) Write a tiny custom Capacitor plugin using the snippet below.
//
//  Either way you must:
//   - Enable the HealthKit capability on the app target in Xcode.
//   - Add usage strings to Info.plist:
//
//        <key>NSHealthShareUsageDescription</key>
//        <string>Soham reads nothing — this is only used to log mindful minutes.</string>
//        <key>NSHealthUpdateUsageDescription</key>
//        <string>Soham logs your completed breathing sessions as mindful minutes.</string>
//

import HealthKit
import Capacitor

@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin {
    let store = HKHealthStore()

    private var mindful: HKCategoryType {
        HKObjectType.categoryType(forIdentifier: .mindfulSession)!
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit unavailable"); return
        }
        store.requestAuthorization(toShare: [mindful], read: []) { ok, err in
            if let err = err { call.reject(err.localizedDescription) }
            else { call.resolve(["granted": ok]) }
        }
    }

    @objc func saveMindfulSession(_ call: CAPPluginCall) {
        // startDate / endDate arrive as epoch milliseconds from the JS shim.
        let start = Date(timeIntervalSince1970: call.getDouble("startDate", 0) / 1000)
        let end = Date(timeIntervalSince1970: call.getDouble("endDate", 0) / 1000)
        let sample = HKCategorySample(
            type: mindful,
            value: HKCategoryValue.notApplicable.rawValue,
            start: start, end: end
        )
        store.save(sample) { ok, err in
            if let err = err { call.reject(err.localizedDescription) }
            else { call.resolve(["saved": ok]) }
        }
    }
}
