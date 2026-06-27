# The Research Behind the Breathing Programs

This app's programs (`js/programs.js`) are paced-breathing patterns defined by a
ratio of **inhale : hold (retain) : exhale : hold (sustain)** repeated over a
number of cycles. The specific counts aren't arbitrary — most map onto breathing
techniques that have been studied for their effects on the autonomic nervous
system, heart rate variability (HRV), mood, anxiety, and sleep.

This document summarizes that research and ties it to the app's presets. Every
study below links to its paper. Full citations are in
[references.md](references.md).

> **Note on evidence quality.** Most of these are small acute studies (often
> 15–60 participants, single sessions) measuring physiological markers like HRV.
> They consistently point the same direction, but this is wellness guidance, not
> medical advice. People with cardiovascular or respiratory conditions, or who
> are pregnant, should talk to a clinician before doing long breath-holds.

---

## The one unifying idea: slow breathing shifts you toward "rest and digest"

Almost every program here slows the breath below the ~12–16 breaths/min of
normal rest. Slowing the breath — especially with a longer exhale — increases
**vagal (parasympathetic) activity**, which shows up as higher HRV, lower heart
rate, lower blood pressure, and reduced anxiety.

- A 2025 *Scientific Reports* study,
  [Luo et al., "The effect of slow breathing in regulating anxiety"](https://doi.org/10.1038/s41598-025-92017-5),
  combined paced breathing with an uncertainty-threat task and found slow
  breathing measurably lowered anxiety, with distinct EEG signatures.
- [Iwabe et al. (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12301348) showed
  slow-paced breathing (4 s in / 6 s out) reduced state anxiety and buffered
  people against aversive images afterward.
- The mechanism is laid out in
  [Noble & Hochman (2019)](https://doi.org/10.3389/fphys.2019.01176): breathing
  near 0.1 Hz (~6 breaths/min) drives **baroreflex resonance**, synchronizing
  heart-rate and blood-pressure rhythms and maximizing HRV.
- [Malhotra et al. (2021)](https://www.semanticscholar.org/paper/af9a22d6a5747e4bbf56d748ac77b3535bc72107)
  and [Balint et al. (2025)](https://doi.org/10.1097/PSY.0000000000001354)
  confirm these acute HRV increases hold even in clinical populations (the latter
  in hospitalized COVID-19 pneumonia patients, using a 4 s in / 6 s out pace).

So the broad claim the app rests on is well supported: **slow, paced breathing
acutely calms the nervous system.** The interesting differences are in *how* the
counts are arranged.

---

## Coherent breathing (5-5, ~6 breaths/min) → program: **Coherent**

The app's **Coherent** program uses `[5, 0, 5, 0]` — a 5-second inhale and
5-second exhale, no holds, which is exactly **6 breaths per minute (0.1 Hz)**.
This is the single most-studied rate in the literature, often called *resonance
frequency* or *resonance paced* breathing.

- [Steffen et al. (2017)](https://doi.org/10.3389/fpubh.2017.00222)
  experimentally isolated ~6 breaths/min as the driver of HRV improvement,
  along with better mood and lower systolic blood pressure.
- [Schwerdtfeger et al. (2019)](https://doi.org/10.1016/j.clinph.2019.11.013)
  review why 0.1 Hz oscillations matter for heart–brain coupling.
- A 2024 systematic review,
  [Vukojević, Vater & Laborde](https://doi.org/10.36950/2024.2ciss080)
  (17 studies, 810 participants), reports broad psychological benefits
  (attention, sleep, relaxation, lower anxiety/depression) and physiological ones
  (higher baroreflex gain, lower blood pressure).
- [Bates et al. (2026)](https://doi.org/10.1111/psyp.70263) used fMRI (N=147) to
  show resonance breathing at 0.1 Hz increases connectivity in the brain's
  central autonomic network, especially the insula.

**Takeaway for the app:** Coherent is the best-evidenced preset for raising HRV
and is a safe, general-purpose default. One caveat from
[You, Laborde et al. (2023)](https://doi.org/10.1007/s10484-023-09605-2):
the optimal rate varies per person within roughly **5–7 breaths/min**, so 5-5 is
a sensible center but not magic for everyone.

---

## Extended exhale (exhale longer than inhale) → programs: **Clear Mind, Relax 1, Relax 3, Anti-Stress, Calming 3, Decision-Making**

Several programs deliberately make the **exhale longer than the inhale**:

| Program | Ratio (in-hold-out-hold) | Notes |
|---|---|---|
| Clear Mind | `[1,0,3,0]`→`[1,0,5,0]` | exhale 3–5× the inhale |
| Relax 1 | `[1,0,2,2]` | 1:2 with an empty-lung hold |
| Relax 3 | `[7,0,11,0]` | long inhale, longer exhale |
| Anti-Stress | `[3,0,0.66,0]` | (note: this one is *inhale*-dominant) |
| Decision-Making | `[5,2,7,0]` | exhale > inhale with a brief hold |

The key study here is
[Bae et al. (2021)](https://doi.org/10.1111/psyp.13905): increasing the
**exhale-to-inhale ratio to 2:1 raised vagal HRV markers (RMSSD, HF-HRV) without
even changing the overall breathing rate** — and the effect persisted for
minutes afterward. This directly validates the design choice behind the
extended-exhale programs.

[Röttger et al. (2020)](https://doi.org/10.1007/s10484-020-09485-w) adds nuance
by comparing prolonged exhalation against tactical (box-style) breathing under
stress: prolonged exhalation lowered arousal *and* supported better performance
when active coping was required, while box breathing suited passive coping. In
other words, extended-exhale patterns are a good fit for "calm down and act"
situations — which is essentially what **Decision-Making** targets.

---

## 4-7-8 breathing → program: **Relax 2 (4-7-8)**

**Relax 2** is the classic 4-7-8: inhale 4, hold 7, exhale 8 (`[4,7,8,0]`). It
combines a long exhale *and* a substantial breath-hold, and it's popular as a
sleep aid.

- [Mualifah & Herawati (2026)](https://doi.org/10.24843/mifi.000001111), a
  controlled study of 110 students, found 4-7-8 practiced twice daily for two
  weeks significantly improved sleep quality (large effect size on the PSQI).
- [Zhang & Zhu (2025)](https://doi.org/10.1145/3745034.3745106) measured acute
  drops in heart rate and the LF/HF ratio (toward parasympathetic dominance)
  during 4-7-8 breathing.
- It's also been used for acute pain and anxiety, e.g.
  [Azizah et al. (2025)](https://doi.org/10.17509/jpki.v11i2.85911) on
  postoperative pain.

**Important caveat:** the head-to-head study
[Marchant et al. (2025)](https://doi.org/10.1007/s10484-025-09688-z) found that
while 4-7-8 is effective, **6 breaths/min (Coherent) raised HRV more** — though
6 bpm also carried a higher risk of *over-breathing* (lowering CO₂ too much).
4-7-8's longer hold and exhale may make it gentler on CO₂ levels, which is part
of why it feels settling before sleep.

---

## Box breathing (4-4-4-4) → program: **Box**

**Box** uses equal `[4,4,4,4]` — inhale, hold, exhale, hold, all 4 seconds. It's
the "tactical breathing" used in military and first-responder training.

- [Ovs et al. (2026)](https://doi.org/10.17309/tmfv.2026.1.15) found a 6-week box
  breathing program (with wearable HR feedback) produced large improvements in
  athletes' real-time decision-making and lowered resting heart rate.
- [Jones et al. (2026)](https://doi.org/10.1249/MSS.0000000000003972), an RCT in
  tactical cadets, showed box breathing accelerated parasympathetic
  reactivation (HF-HRV recovery) after maximal exertion.

But two comparison studies temper the enthusiasm for box breathing as a *calming*
tool specifically:

- [Marchant et al. (2025)](https://doi.org/10.1007/s10484-025-09688-z): box
  ("square") breathing raised HRV less than 6 bpm.
- [Kasap & Aydın (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12622787):
  after high-intensity exercise, box breathing produced *higher* post-exercise
  heart rate and perceived exertion than 6 bpm — i.e., the breath-holds add a
  mild stressor.

**Takeaway:** Box is excellent for focus, composure, and performance under
pressure, but if the goal is pure relaxation, Coherent or an extended-exhale
program may edge it out.

---

## Breath retention / holds (kumbhaka) → programs: **Power, Harmony, Calming 1, Calming 2, Fire, Retention, Swooning, Energizing, Anti-Appetite**

Many programs build in **holds**, either after the inhale (lungs full — *retain*)
or after the exhale (lungs empty — *sustain*). Examples: Power `[1,2,2,0]`,
Harmony `[1,3,2,1]`, Swooning `[5,10,7,0]` (a long full-lung hold), Retention
`[2,0,2,12]` and Fire `[3,0,5,12]` (long empty-lung holds).

This is the **least precisely studied** part of the app. Breath retention is
studied mostly under the umbrella of *kumbhaka* pranayama rather than at the
specific counts the app uses:

- [Saisupriya et al. (2020)](https://doi.org/10.4103/ym.ym_21_19) studied a
  1:3:2 inhale:hold:exhale ratio (6:18:12 s) with retention and found it shifted
  participants toward parasympathetic dominance (lower HR, higher RMSSD/HF) — a
  pattern echoing the app's holds-heavy designs.
- [Nivethitha et al. (2017)](https://doi.org/10.4103/0976-3147.193532) found
  breath retention (kumbhaka) and forceful breathing (bhastrika) have **opposite**
  effects on cerebral blood flow — a reminder that holds are physiologically
  active, not neutral pauses.

**Takeaway:** The general principle (holds + slow breathing → parasympathetic
shift, used for energy/focus in shorter forms and deep relaxation in longer
forms) is supported, but the *exact* counts in Power, Fire, Retention, Swooning,
etc. are extrapolations from the broader pranayama tradition rather than
directly validated. Longer empty-lung holds (Fire, Retention) are the most
demanding and least studied — worth a gentle in-app note for beginners.

---

## Structured multi-technique breathwork (zooming out)

A landmark RCT from Stanford,
[Balban et al. (2023) in *Cell Reports Medicine*](https://doi.org/10.1016/j.xcrm.2022.100895),
compared three 5-minute daily breathwork practices against mindfulness
meditation over a month:

1. **Cyclic sighing** (emphasizing prolonged exhalation),
2. **Box breathing** (equal in/hold/out/hold), and
3. **Cyclic hyperventilation with retention**.

All improved mood and lowered arousal, but **exhale-focused cyclic sighing
produced the biggest mood improvement and respiratory-rate reduction** — again
underscoring the recurring theme that **the exhale is where the calming happens**.
This supports the app's emphasis on extended-exhale and long-exhale-with-hold
programs (Clear Mind, Relax 1/2/3, Calming series).

---

## Practical mapping: which program, which goal?

| Goal | Best-supported program(s) | Key evidence |
|---|---|---|
| Raise HRV / general calm | **Coherent** (5-5) | [Steffen 2017](https://doi.org/10.3389/fpubh.2017.00222), [Marchant 2025](https://doi.org/10.1007/s10484-025-09688-z) |
| Reduce anxiety in the moment | **Coherent**, **Clear Mind**, **Relax** series | [Luo 2025](https://doi.org/10.1038/s41598-025-92017-5), [Bae 2021](https://doi.org/10.1111/psyp.13905) |
| Wind down for sleep | **Relax 2 (4-7-8)** | [Mualifah 2026](https://doi.org/10.24843/mifi.000001111), [Zhang 2025](https://doi.org/10.1145/3745034.3745106) |
| Focus / composure under pressure | **Box** (4-4-4-4) | [Ovs 2026](https://doi.org/10.17309/tmfv.2026.1.15), [Jones 2026](https://doi.org/10.1249/MSS.0000000000003972) |
| Think clearly before acting | **Decision-Making**, extended-exhale | [Röttger 2020](https://doi.org/10.1007/s10484-020-09485-w) |
| Recover after exertion | **Coherent** over Box | [Kasap 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12622787) |

---

## Gaps and honest caveats

- **Long breath-holds** (Power, Fire, Retention, Swooning, Energizing) are the
  least directly validated at the app's specific counts — studied mostly as
  generic *kumbhaka* pranayama.
- **Over-breathing risk:** faster or deeper paced breathing (including 6 bpm if
  done with large tidal volumes) can lower CO₂ uncomfortably
  ([Marchant 2025](https://doi.org/10.1007/s10484-025-09688-z)). Encourage gentle,
  not forceful, breaths.
- **Acute vs. lasting effects:** most evidence is for *immediate* effects during
  or just after a session. Durable benefits (sleep, trait anxiety) appear with
  *regular daily practice* over weeks
  ([Mualifah 2026](https://doi.org/10.24843/mifi.000001111),
  [Balban 2023](https://doi.org/10.1016/j.xcrm.2022.100895)).

---

*Compiled from the Semantic Scholar (Asta) research corpus. See
[references.md](references.md) for full citations.*
