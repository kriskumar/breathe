# Soham / Prana — Competitive Analysis & Enhancement Report

_Prepared for pranaapp.org — a free, private, offline breathing/pranayama PWA._
_Date: 2026-06. Competitive data reflects 2024–2025 sourcing (see Sources); store prices/features drift, so figures are directional._

---

## 1. Executive summary

Our app is a free, account-free, fully offline breathing timer built on the **nafas / Prana Breath pranayama lineage** (it literally shares program names — Clear Mind, Harmony, Anti-Appetite, Cigarette Replace — with Prana Breath, which has **2M+ users**). That validates the category and our content.

Three findings shape the recommendations:

1. **The entire paid market shares one fatal weakness: subscriptions and billing dark patterns.** Calm, Headspace, Breathwrk, Wim Hof, Othership, and Open _all_ have their single loudest complaint be price, hard-to-cancel flows, surprise charges, or content that got re-locked behind a paywall. A genuinely free, no-account, no-tracking app is not a "lite" version of these — it's a categorically different, more trustworthy product. **This is our moat. Protect it.**

2. **We're missing a handful of cheap table-stakes features** that nearly every competitor — even the minimalist free ones — has: session history/streaks, reminders, dark mode, ambient sound, and an accessibility pass. None require a backend.

3. **The strongest recent science points to two techniques we should feature prominently:** _cyclic sighing / the physiological sigh_ (best mood RCT, Stanford 2023) and _coherent breathing at ~6 breaths/min_ (best HRV/baroreflex mechanism). We already have "Coherent"; we lack a physiological-sigh program.

We should **lean into "free, private, evidence-based, no dark patterns,"** add the cheap table-stakes features, and **avoid** the things that are impossible or dishonest on a free iOS web app (HRV biofeedback, wearables, accounts).

---

## 2. Where Soham sits today

**What we already do well**

| Area | Status |
|---|---|
| Programs | 20 pranayama programs + **Simple Mind** (default) + Custom, with Beginner/Medium/Advanced levels |
| Engine | 4-phase cycle (inhale / hold / exhale / sustain) + preparation, fractional-second support |
| Visual guidance | Expanding/contracting circle with per-phase colors |
| Voice guidance | Browser TTS phase cues + spoken countdown, **kept in sync** with the timer; voice picker, rate, volume |
| Audio | Zen singing-bowl chime; manual **🕉️ Aum** chant button |
| Stay-awake | **Screen Wake Lock** during sessions |
| Offline / install | **PWA**, **network-first** service worker, installable, iOS Home-Screen support, app icon (Ganesh Yantra) |
| Persistence | Preferences saved to `localStorage` |
| Cost / privacy | **100% free, no account, no tracking, no ads, no paywall** |

**Gaps vs. the market**

- ❌ No **session history / streaks / stats** (almost everyone has this)
- ❌ No **reminders / habit nudges**
- ❌ No **dark mode** (we're a light card on a purple gradient)
- ❌ No **ambient/background sound** option (we're silent unless TTS/chime)
- ❌ No **physiological sigh** program (the best-evidenced technique)
- ❌ **Coherent breathing** exists but isn't framed/selectable by **breaths-per-minute**
- ❌ No **saved/named custom patterns** or **favorites/quick-start**
- ❌ **Accessibility** is partial (reduced-motion only on button hovers; no ARIA live cues; text cue not always shown)
- ❌ No **haptics** (impossible on iOS, but possible on Android)
- ❌ No **technique education** (what each practice does / when to use it)

---

## 3. The competitive landscape

### 3a. Premium "studio" apps (subscription, content-led)

| App | Breathing model | Standout | Price (≈) | Loudest complaint |
|---|---|---|---|---|
| **Calm** | "Breathe Bubble," 6 goal presets, 4/6/8 bpm, haptics, indep. volumes | Sleep Stories, huge library | $70/yr | Billing/cancel pain; **breathwork is thin** — users ask for more |
| **Headspace** | Box, 4-4-6, counting; animated + **wrist-haptic** breathing; SOS | "Ebb" AI companion; Apple Watch | $13/mo, $70/yr | Repetitive; paywall; bugs on screen-lock |
| **Breathwrk** | 50+ techniques, visual+audio+**haptic** pacing, classes | Streaks/levels, reminders, Apple Health | ~$50–70/yr | **Subscriptions/cancel**; shrinking free tier; wants dark mode + offline |
| **Wim Hof** | WHM rounds + retention timer, custom "bubble," haptics, HRV | Cold-exposure tracking, challenges, Apple Watch | ~$6/mo, $43/yr | "**$/mo for a stopwatch**"; one-time buyers forced to subscribe |
| **Othership** | Music-paced guided journeys (Pranayama, Wim Hof, coherent…) | Cinematic; 500+ sessions; facilitators | $18/mo, $130/yr | **Too expensive**; music drowns voice; forced downloads |
| **Open** | Class/journey-based breathwork | **Camera-based HR/HRV biofeedback**; James Blake sound | $20/mo, $150/yr | Premium price; iOS-only; hard to find monthly |

**Takeaway:** these win on production value, libraries, and habit systems — and **all** lose on price/billing trust. None is a great _simple paced-timer_; Calm users explicitly ask for deeper breathwork.

### 3b. Minimalist timers — **our actual category**

| App | Presets | Custom timing | Guidance | History | Health | Price |
|---|---|---|---|---|---|---|
| **Prana Breath** (Android, 2M+) | 8 free (same names as us) + 50+ paid | Full ratios + **dynamic ramp** (paid) | visual + vibrate + sound | rich stats (paid) | loose Google Fit | Free + "Guru" unlock |
| **iBreathe** (iOS) | Box, 4-7-8, Ujjayi | Yes | visual + text + sound | mindful min | HealthKit, **Watch**, widget, **dark mode**, iCloud | Free + tip; **ad-heavy** |
| **Breathe+** (iOS) | build-your-own | 1–32s per phase | visual + many sounds | **graphs + streaks** | HealthKit | Free + IAP (themes/sounds) |
| **Awesome Breathing** (iOS/Android) | Box, Equal, Triangle… + **save custom** | Yes | visual + **voice cues** + **vibration** | mindful min | HealthKit, reminders, **keep-awake** | **Free, voluntary tips** |
| **Paced Breathing** (Android/iOS) | configurable | Yes + **ramp** | visual + audio + **vibrate** | streaks/goals (paid) | **BT HRV strap** (paid) | Free + PB+ |

**Takeaway:** in our category, the recurring low-cost features are **custom patterns (savable), reminders, simple history/streaks, haptics (Android), HealthKit mindful-minutes, dark mode, and keep-screen-awake.** The most-loved free model (Awesome Breathing) is _"always free, voluntary tips, no paywall"_ — exactly our posture.

### 3c. Platform built-ins (free with hardware)

- **Apple Mindfulness/Breathe (Watch):** set **4–10 bpm**, 1–5 min, expanding-flower visual, **wrist haptics** (None/Minimal/Prominent), logs Mindful Minutes. Simple, free, beloved — but **requires a Watch**.
- **Fitbit/Google "Relax":** 2/5-min, **HR-personalized pace**, orb visual + **haptics**, post-session alignment score. Requires a tracker; recently degraded on newer devices.

**Takeaway:** wrist **haptics + a calm single visual + tight "mindful minutes" logging** are the gold standard for "quick reset." We can't touch the wrist, but the _design language_ (one calm visual, optional haptics, log the minutes) is worth emulating on phone.

### 3d. Free web tools (our direct alternatives)

- **xhalr.com** — best **custom-pattern** entry; free, no login (the feature people love).
- **Calm Breathe Bubble (web)** — iconic visual, 4/6/8 bpm, free teaser.
- **QuietKit** — cleanest single-purpose box-breathing visual.
- **OSS PWAs:** `trentmwillis/deepbreathing` and `nfreear/breath` are clean offline-installable references; `nfreear/breath` focuses on **resonant/coherent** breathing.

**Takeaway / gap to own:** _"Few combine custom timings + a polished orb + (Android) haptics + PWA/offline + dark mode in one minimalist, no-login package."_ We're already most of the way there — and we add **authentic pranayama programs + voice guidance + Aum**, which the web tools lack.

---

## 4. What the market teaches us

**Table-stakes (have-or-look-unfinished):** a calm primary visual, preset + custom patterns, optional audio cues, **dark mode**, **session history/streaks**, **reminders**, offline, keep-screen-awake. _We have ~half._

**Premium differentiators (mostly not worth chasing for us):** giant guided libraries, celebrity/music production, AI companions, HRV biofeedback, wearable apps. These need money, content teams, or native/hardware access.

**The universal weakness = our opening:** every subscription app's top complaint is **price + billing dark patterns + re-locked features**. The free apps that people _trust_ (Awesome Breathing, iBreathe-minus-ads, Prana Breath free tier) win precisely by _not_ doing that. Our positioning writes itself.

---

## 5. Strategic positioning

> **"The free, private, no-account breathing app. Authentic pranayama, evidence-based techniques, works offline, no subscription, no tracking, no dark patterns."**

Concrete commitments that double as marketing:
- **No account, ever.** All data stays on-device.
- **No ads, no paywall, no upsell.** (Keep the single, honest Himalayan Institute donate link.)
- **Works fully offline** once installed.
- **Evidence-based**, with sources cited in-app.
- **Accessible** (reduced-motion, screen-reader, non-audio cues).

Every roadmap item below is checked against: _does it keep this moat intact and need no backend?_

---

## 6. Evidence-based technique recommendations

| Technique | Evidence | Action |
|---|---|---|
| **Cyclic sighing / physiological sigh** (double inhale + long exhale) | **Strongest recent RCT** (Stanford/Huberman, *Cell Reports Medicine* 2023): best improvement in mood & biggest drop in respiratory rate over 28 days, beating box breathing, cyclic hyperventilation, and mindfulness | **Add as a featured program.** Requires a small engine tweak for the **double inhale** (a second short inhale before the long exhale) |
| **Coherent / resonant breathing ~6 bpm (0.1 Hz)** | **Best-established mechanism** (HRV, baroreflex). True resonance is individual (~4.5–6.5 bpm) | We have "Coherent" — **add a breaths-per-minute selector (5/5.5/6) and label the benefit.** Optionally a guided "find your resonance" mode |
| **Extended-exhale / 4-7-8** | Positive but smaller/lower-quality evidence | Keep (Relax 2 ≈ 4-7-8); present as a supported alternative |
| **Box breathing (4-4-4-4)** | Familiar, effective on-ramp | We have **Box** — keep as the easy default for "focus" |

Pair these with **short default sessions (3–5 min)**, which is what the studies actually tested and what drives adherence.

---

## 7. Technical feasibility (iOS-first, no backend)

Our primary platform is iOS Home-Screen PWA, which is the most restrictive. This determines what's worth building:

| Capability | iOS Safari PWA | Verdict for us |
|---|---|---|
| **Web Audio** (tones, ambient) | ✅ (must `resume()` on a gesture; muted by ringer switch) | **Build** — ambient sound & pacing tones |
| **Screen Wake Lock** | ✅ iOS 16.4+ (PWA bug fixed 18.4) | **Done** — keep |
| **localStorage / IndexedDB** (history/streaks) | ✅ | **Build** — local history |
| **Media Session** (lock-screen metadata) | ✅ partial | Nice-to-have for the Aum/ambient |
| **Web Push reminders** | ⚠️ Only installed PWAs, iOS 16.4+; local scheduling unreliable | **Build cautiously**, with honest fallback messaging |
| **Vibration / haptics** | ❌ Not on iOS | **Android-only** progressive enhancement |
| **HealthKit** (mindful minutes) | ❌ No web API | **Skip** |
| **Web Bluetooth** (HRV strap) | ❌ Not on iOS | **Skip** |
| **Camera HR/HRV** | ⚠️ HR ok, **HRV unreliable**; needs good light | **Skip** (or Android/desktop experiment only) |
| **prefers-reduced-motion / color-scheme** | ✅ | **Build** — dark mode + reduced motion |

---

## 8. Prioritized roadmap

Effort: S = hours, M = a day or two, L = several days. Each item lists the competitor gap it closes.

### P0 — High impact, low effort, fully feasible, on-brand

1. **Dark mode** (`prefers-color-scheme` + toggle). _S._ Closes a frequent complaint (Breathwrk users beg for it); trivial CSS. 
2. **Accessibility + full reduced-motion pass.** _M._ ARIA live region announcing phases, labeled controls, **always-available text cue** ("Inhale 4 · Hold 7 · Exhale 8"), static/low-motion option. Inclusivity + correctness; nobody in this space does it well.
3. **Local session history + streaks** (IndexedDB; simple calendar + total minutes + current streak). _M._ Biggest table-stakes gap; privacy-preserving; drives adherence. Mirror Apple's "Mindful Minutes" idea without HealthKit.
4. **Cyclic Sighing (Physiological Sigh) program**, featured. _M._ Best evidence; small engine extension for the double inhale. Differentiator vs. most apps.
5. **Coherent breathing: breaths-per-minute selector + benefit label.** _S._ Leverages existing Coherent program; evidence-backed; matches Apple/Calm's bpm framing.

### P1 — Medium effort, strong value

6. **Ambient background sound** (looping pad/ocean via Web Audio or audio file, with its own volume). _M._ Calming; closes our "silent unless TTS" gap; works on iOS.
7. **Non-verbal pacing tones** (Web Audio) as an alternative to TTS for eyes-closed practice. _M._ Several apps' best-loved mode.
8. **Save & name custom patterns + favorites / quick-start.** _M._ "xhalr's most-loved feature"; turns our Custom mode into a keeper.
9. **Daily reminder** (installed-PWA Web Push, iOS 16.4+) with honest limitations + Android local notifications. _M–L._ Adherence; the one habit feature we lack.
10. **Android haptics** (Vibration API) for inhale/exhale, gracefully absent on iOS. _S._ Eyes-closed cue.

### P2 — Depth & polish

11. **Technique intros / "why & when"** per program (cite the science). _M._ Education like Othership "BRAIN"; builds trust; supports our evidence-based claim.
12. **Goal-based onboarding** ("Calm / Sleep / Focus / Energy" → recommend a program). _M._ Every studio app personalizes the first run.
13. **Multi-language TTS voice** (we already enumerate system voices). _S._
14. **Retention/breath-hold UI polish** (clear hold countdown, optional longer holds). _S._

### P3 — Avoid or defer (be honest about limits)

- **HRV biofeedback:** not feasible on a free iOS web app (no Bluetooth/HealthKit; camera HRV unreliable). Open/Paced/Wim Hof can do it because they're native or use straps. _Don't fake it._ Optional: a clearly-labeled **camera heart-rate (not HRV)** experiment on Android/desktop only.
- **Wearable / Apple Watch app:** impossible from a PWA.
- **Accounts / cloud sync:** would break the privacy moat and require a backend. Offer **export/import of local history (JSON)** instead.

---

## 9. Accessibility plan (P0 detail)

- **Reduced motion:** when `prefers-reduced-motion: reduce`, replace the scaling circle with a static ring + large phase text and a gentle opacity fade; no looping pulse. (WCAG 2.2 requires pause/stop/hide for >5s motion.)
- **Redundant cues:** never rely on color/animation alone — always pair the visual with **text** ("Inhale… Hold… Exhale") and optional audio/tone; ≥2 channels.
- **Color-blind safe:** distinguish phases by **text/shape/position**, not just hue; maintain 4.5:1 contrast.
- **Screen readers:** label every control (name/role/value), announce phase changes and start/finish via an `aria-live="polite"` region.
- **Targets/keyboard:** ≥44px tap targets, full keyboard operability, visible focus.

---

## 10. Recommended next 3 shippable PRs

1. **PR A — Dark mode + accessibility/reduced-motion pass** (P0 #1, #2). Small, high-trust, no risk.
2. **PR B — Local history & streaks** (P0 #3) with optional JSON export.
3. **PR C — Cyclic Sighing program + coherent-breathing bpm selector** (P0 #4, #5), including the small double-inhale engine extension.

These three close the most-visible gaps, are 100% feasible on iOS, need no backend, and reinforce the "free, private, evidence-based" positioning — without touching the moat.

---

## 11. Sources (selected)

**Science:** Stanford/Huberman cyclic sighing RCT — cell.com/cell-reports-medicine/fulltext/S2666-3791(22)00474-8 ; pubmed.ncbi.nlm.nih.gov/36630953 ; med.stanford.edu/news/insights/2023/02/cyclic-sighing-can-help-breathe-away-anxiety.html · Coherent/resonance breathing & HRV — Laborde 2022 (onlinelibrary.wiley.com/doi/10.1111/psyp.13952); nature.com/articles/s41598-021-87867-8 · 4-7-8 review — pmc.ncbi.nlm.nih.gov/articles/PMC10622034 · HRV biofeedback — ncbi.nlm.nih.gov/pmc/articles/PMC7596654

**Web APIs:** MDN Web Audio best practices; progressier.com/pwa-capabilities (vibration, wake lock); magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide; qvik.com (iOS web push); developer.apple.com/documentation/healthkit; MDN prefers-reduced-motion; web.dev/learn/accessibility/motion; W3C WCAG 2.2

**Apps:** Calm Help Center (support.calm.com); headspace.com + businesswire Ebb; breathwrk.com + choosingtherapy.com/breathwrk-app-review; wimhofmethod.com app page + justuseapp reviews; othership.us/app + t3.com review; o-p-e-n.com + selfpause.com/resources/open-breathwork; Apple Support apd371dfe3d7 (Mindfulness); Google Health support answer/14237928 (Relax); jadelizardsoftware.com/ibreathe; apps.apple.com Breathe+ (id1106998959) & Awesome Breathing (id1453087953); pranabreath.info; pacedbreathing.com; xhalr.com; calm.com/breathe; quietkit.com/box-breathing; github.com/trentmwillis/deepbreathing; github.com/nfreear/breath

> Sourcing caveat: most app-store, official, and review pages return HTTP 403 to automated fetching, so app figures (especially exact prices and star counts) come from search-result extracts and should be re-verified on live listings before quoting publicly.
