/*
 * Breathing programs ported from nafas (https://github.com/sepandhaghighi/nafas).
 *
 * Each program defines a base `unit` (seconds), a `pre` preparation phase, and
 * three difficulty levels. A level provides a `ratio` and a `cycle` count.
 *
 * ratio = [inhale, retain, exhale, sustain, inhale2?]
 *   - inhale  : breathe in
 *   - retain  : hold the breath (lungs full)
 *   - exhale  : breathe out
 *   - sustain : hold the breath (lungs empty)
 *   - inhale2 : optional second "top-up" inhale (the physiological sigh)
 *
 * Actual phase duration in seconds = ratioValue * unit.
 * cycle = number of times the inhale/retain/exhale/sustain sequence repeats.
 *
 * An optional `hint` gives extra "how to" guidance shown under the description
 * (e.g. how to make the humming sound in Bhramari).
 */
const PROGRAMS = [
  {
    id: "simple-mind",
    name: "Simple Mind",
    description: "A short, gentle 1:2 breath to settle the mind.",
    hint: "Breathe through the nose and let the belly rise on the inhale, fall on the exhale. Keep it soft and unforced — the out-breath is simply twice as long as the in-breath.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [1, 0, 2, 0], cycle: 8 },
      medium:   { ratio: [1, 0, 2.5, 0], cycle: 12 },
      advanced: { ratio: [1, 0, 3, 0], cycle: 16 },
    },
  },
  {
    id: "cyclic-sighing",
    name: "Cyclic Sighing",
    description: "A double inhale then a long, slow exhale — the physiological sigh shown to lift mood fastest.",
    hint: "Inhale through the nose to fill the lungs, take a second short sip of air to top them off, then let a long, relaxed exhale flow out through the mouth. Just 5 minutes a day measurably improved mood and lowered anxiety in a 2023 Stanford study — more than box breathing or meditation.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [2, 0, 5, 0, 1], cycle: 12 },
      medium:   { ratio: [2, 0, 5, 0, 1], cycle: 24 },
      advanced: { ratio: [2, 0, 5, 0, 1], cycle: 36 },
    },
  },
  {
    id: "clear-mind",
    name: "Clear Mind",
    description: "Short inhale with a long, slow exhale to clear and settle the mind.",
    hint: "Take a small, easy inhale through the nose, then let the exhale stream out slowly and fully, as if gently fogging a mirror. Don't force the in-breath — the long exhale does the work.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [1, 0, 3, 0], cycle: 35 },
      medium:   { ratio: [1, 0, 4, 0], cycle: 28 },
      advanced: { ratio: [1, 0, 5, 0], cycle: 24 },
    },
  },
  {
    id: "relax1",
    name: "Relax 1",
    description: "Gentle breathing with a sustain after the exhale to relax the body.",
    hint: "After breathing out, rest with the lungs empty and stay relaxed — there's no need to gulp the next breath. Let your shoulders and jaw soften during the pause.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [1, 0, 2, 2], cycle: 28 },
      medium:   { ratio: [1, 0, 2, 3], cycle: 24 },
      advanced: { ratio: [1, 0, 2, 4], cycle: 22 },
    },
  },
  {
    id: "relax2",
    name: "Relax 2 (4-7-8)",
    description: "The classic 4-7-8 pattern: inhale 4, hold 7, exhale 8.",
    hint: "A favourite before sleep. Inhale quietly through the nose, hold gently, then exhale through the mouth with a soft \"whoosh.\" Rest the tip of your tongue behind your upper front teeth throughout.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 7, 8, 0], cycle: 4 },
      medium:   { ratio: [4, 7, 8, 0], cycle: 8 },
      advanced: { ratio: [4, 7, 8, 0], cycle: 12 },
    },
  },
  {
    id: "relax3",
    name: "Relax 3",
    description: "Slow inhale and an even slower exhale for deep relaxation.",
    hint: "Long, smooth breaths with no holds. Draw the inhale in slowly and let the exhale last even longer — keep both unhurried and even, like a calm tide rolling in and out.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [7, 0, 11, 0], cycle: 15 },
      medium:   { ratio: [7, 0, 11, 0], cycle: 20 },
      advanced: { ratio: [7, 0, 11, 0], cycle: 24 },
    },
  },
  {
    id: "calming1",
    name: "Calming 1",
    description: "Balanced holds on both ends of the breath to calm the nerves.",
    hint: "Equal, gentle pauses at the top and bottom of each breath. Stay soft during the holds rather than bracing — let the brief stillness quiet the nervous system.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [1, 2, 1, 2], cycle: 24 },
      medium:   { ratio: [1, 3, 1, 3], cycle: 22 },
      advanced: { ratio: [1, 4, 1, 4], cycle: 20 },
    },
  },
  {
    id: "calming2",
    name: "Calming 2",
    description: "Even inhale and exhale with a sustain to encourage stillness.",
    hint: "Even in- and out-breaths followed by a relaxed pause on empty. Use the hold to release tension in your face and shoulders before drawing the next breath.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [5, 0, 5, 5], cycle: 4 },
      medium:   { ratio: [5, 0, 5, 5], cycle: 6 },
      advanced: { ratio: [5, 0, 5, 5], cycle: 8 },
    },
  },
  {
    id: "calming3",
    name: "Calming 3",
    description: "Extended exhale work that deepens with each level.",
    hint: "Let each exhale stretch longer than the inhale. As the levels add brief holds, keep them easy and unforced — ease off if you ever feel short of breath.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 0, 6, 0], cycle: 6 },
      medium:   { ratio: [6, 1, 8, 4], cycle: 8 },
      advanced: { ratio: [4, 1, 12, 1], cycle: 10 },
    },
  },
  {
    id: "power",
    name: "Power",
    description: "Hold after inhaling to build energy and focus.",
    hint: "Fill the lungs, then hold with the breath in to build energy and focus. Keep your throat and shoulders relaxed during the hold rather than clamping down.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [1, 2, 2, 0], cycle: 28 },
      medium:   { ratio: [1, 3, 2, 0], cycle: 24 },
      advanced: { ratio: [1, 4, 2, 0], cycle: 20 },
    },
  },
  {
    id: "harmony",
    name: "Harmony",
    description: "Holds on both ends with a long retain to find balance.",
    hint: "A longer hold after the inhale with a short pause on empty. Sit tall, keep your face relaxed, and let the breath find an even, balanced rhythm.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [1, 3, 2, 1], cycle: 20 },
      medium:   { ratio: [1, 4, 2, 1], cycle: 18 },
      advanced: { ratio: [1, 5, 2, 1], cycle: 16 },
    },
  },
  {
    id: "anti-stress",
    name: "Anti-Stress",
    description: "Long inhale with a quick exhale to release tension.",
    hint: "Draw a slow, full inhale through the nose, then release it in one quick, easy exhale — letting the body slump a little as you let go of tension.",
    unit: 3,
    pre: 7,
    levels: {
      beginner: { ratio: [3, 0, 0.66, 0], cycle: 20 },
      medium:   { ratio: [4, 0, 0.66, 0], cycle: 17 },
      advanced: { ratio: [5, 0, 0.66, 0], cycle: 14 },
    },
  },
  {
    id: "anti-appetite",
    name: "Anti-Appetite",
    description: "Longer inhale with a sustain to help curb cravings.",
    hint: "Even breaths with a relaxed pause on empty. Practise between meals — the hold on empty helps draw your attention away from a craving until it passes.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [5, 0, 5, 5], cycle: 40 },
      medium:   { ratio: [6, 0, 5, 5], cycle: 38 },
      advanced: { ratio: [7, 0, 5, 5], cycle: 36 },
    },
  },
  {
    id: "cigarette-replace",
    name: "Cigarette Replace",
    description: "A measured four-phase breath to replace the urge to smoke.",
    hint: "A measured four-part breath to ride out a craving. Let the count occupy your hands and attention, and remind yourself the urge will fade within a few rounds.",
    unit: 2,
    pre: 7,
    levels: {
      beginner: { ratio: [2, 1.1, 2.2, 0.8], cycle: 23 },
      medium:   { ratio: [3, 1.1, 2.2, 0.8], cycle: 21 },
      advanced: { ratio: [4, 1.1, 2.2, 0.8], cycle: 19 },
    },
  },
  {
    id: "decision-making",
    name: "Decision-Making",
    description: "Inhale, brief hold, and long exhale to think clearly.",
    hint: "Inhale steadily, pause briefly, then let a long exhale carry out the mental clutter. Use the slow out-breath to settle yourself before making a choice.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [5, 2, 7, 0], cycle: 6 },
      medium:   { ratio: [5, 2, 7, 0], cycle: 10 },
      advanced: { ratio: [5, 2, 7, 0], cycle: 14 },
    },
  },
  {
    id: "balancing",
    name: "Balancing",
    description: "Symmetric breathing with holds that grow with each level.",
    hint: "Match the inhale and exhale evenly, breathing low into the belly. As the levels add equal holds, keep the whole cycle smooth and symmetric.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [6, 0, 6, 0], cycle: 6 },
      medium:   { ratio: [8, 1, 8, 1], cycle: 8 },
      advanced: { ratio: [6, 2, 6, 2], cycle: 10 },
    },
  },
  {
    id: "energizing",
    name: "Energizing",
    description: "Builds retention to wake the body and mind up.",
    hint: "Make the inhale a touch longer than the exhale, adding the holds as the levels build. Sit upright and let the breath wake you up — skip a round if you feel light-headed.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [6, 0, 4, 0], cycle: 6 },
      medium:   { ratio: [6, 4, 6, 1], cycle: 8 },
      advanced: { ratio: [6, 6, 6, 1], cycle: 10 },
    },
  },
  {
    id: "box",
    name: "Box",
    description: "Equal inhale, hold, exhale and hold — the classic box breath.",
    hint: "The square breath used to stay calm under pressure: inhale, hold, exhale, hold — each for the same count. Trace the four equal sides of a box in your mind and keep every side smooth.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 4, 4, 4], cycle: 4 },
      medium:   { ratio: [4, 4, 4, 4], cycle: 8 },
      advanced: { ratio: [4, 4, 4, 4], cycle: 15 },
    },
  },
  {
    id: "coherent",
    name: "Coherent",
    description: "Even 5-and-5 breathing to reach a coherent, steady rhythm.",
    hint: "Breathe an even five in, five out — about six breaths a minute. Breathe low into the belly and let the rhythm become effortless; this is the rate that steadies heart and mind.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [5, 0, 5, 0], cycle: 30 },
      medium:   { ratio: [5, 0, 5, 0], cycle: 50 },
      advanced: { ratio: [5, 0, 5, 0], cycle: 70 },
    },
  },
  {
    id: "bhramari",
    name: "Bhramari (Humming)",
    description: "Humming-bee breath: a silent inhale, then a long humming exhale to soothe the mind.",
    hint: "On each exhale, gently close your lips, relax your jaw, and make a soft, steady low \"mmmm\" — like a humming bee. Keep the sound smooth and even for the whole out-breath, and rest your attention on the gentle vibration in your head and chest. Inhale quietly through the nose.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 0, 6, 0], cycle: 6 },
      medium:   { ratio: [4, 0, 8, 0], cycle: 9 },
      advanced: { ratio: [5, 0, 10, 0], cycle: 12 },
    },
  },
  {
    id: "nadi-shodhana",
    name: "Nadi Shodhana (Alternate Nostril)",
    description: "Alternate-nostril breathing to balance and calm the nervous system.",
    hint: "With the right hand, use the thumb and ring finger to close one nostril at a time. Inhale through the left nostril; close it and exhale through the right. Inhale through the right; close it and exhale through the left — that is one round. Keep the breath smooth, slow and silent.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 0, 4, 0], cycle: 9 },
      medium:   { ratio: [4, 4, 4, 0], cycle: 9 },
      advanced: { ratio: [5, 5, 5, 0], cycle: 9 },
    },
  },
  {
    id: "ujjayi",
    name: "Ujjayi (Ocean Breath)",
    description: "Slow, even breathing with a soft ocean-like sound to steady the mind.",
    hint: "Breathe only through the nose. Slightly constrict the back of the throat so the breath makes a quiet ocean-like \"haaa\" sound on both the in-breath and the out-breath. Keep it smooth, even and unforced, as if gently fogging a mirror with the mouth closed.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [5, 0, 5, 0], cycle: 15 },
      medium:   { ratio: [6, 0, 6, 0], cycle: 18 },
      advanced: { ratio: [6, 2, 8, 0], cycle: 18 },
    },
  },
  {
    id: "dirga",
    name: "Dirga (Three-Part Breath)",
    description: "Deep three-part breathing that fills the belly, ribs and chest to ground and relax.",
    hint: "Inhale in three smooth, continuous stages — first letting the belly rise, then the ribs widen, then the upper chest fill. Exhale in reverse: the chest empties, then the ribs, then the belly draws in last. Keep the whole breath slow and unbroken.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [6, 0, 6, 0], cycle: 10 },
      medium:   { ratio: [7, 0, 7, 0], cycle: 12 },
      advanced: { ratio: [8, 0, 8, 0], cycle: 14 },
    },
  },
  {
    id: "sitali",
    name: "Sitali (Cooling Breath)",
    description: "A cooling inhale through the tongue to ease heat, agitation and stress.",
    hint: "Curl the sides of your tongue into a tube and inhale slowly through it (if you can't curl your tongue, purse your lips instead) — the incoming air feels cool. Then close the mouth and exhale gently through the nose. Cooling and calming when you feel hot or irritated.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 0, 6, 0], cycle: 10 },
      medium:   { ratio: [4, 2, 6, 0], cycle: 12 },
      advanced: { ratio: [5, 2, 7, 0], cycle: 12 },
    },
  },
  {
    id: "triangle",
    name: "Triangle Breathing",
    description: "Equal inhale, hold and exhale — a simpler cousin of box breathing for steady focus.",
    hint: "Three equal sides: breathe in, hold the breath gently in, then breathe out — each for the same count, with no pause at the bottom. Breathe through the nose and keep each side smooth and even.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [4, 4, 4, 0], cycle: 10 },
      medium:   { ratio: [5, 5, 5, 0], cycle: 12 },
      advanced: { ratio: [6, 6, 6, 0], cycle: 14 },
    },
  },
  {
    id: "fire",
    name: "Fire",
    description: "A long sustain after the exhale to stoke inner heat.",
    hint: "After a full exhale, hold with the lungs empty to stoke inner heat. Stay calm and still through the long hold and come out gently — this is advanced, so never push past comfort.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [3, 0, 5, 12], cycle: 10 },
      medium:   { ratio: [3, 0, 5, 12], cycle: 20 },
      advanced: { ratio: [3, 0, 5, 12], cycle: 30 },
    },
  },
  {
    id: "retention",
    name: "Retention",
    description: "Short breaths with a long empty-lung hold to build tolerance.",
    hint: "Short, easy breaths with a long pause on empty to build breath tolerance. Keep your body relaxed during the hold and ease off the moment you feel real air hunger.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [2, 0, 2, 12], cycle: 5 },
      medium:   { ratio: [2, 0, 2, 12], cycle: 10 },
      advanced: { ratio: [2, 0, 2, 12], cycle: 15 },
    },
  },
  {
    id: "swooning",
    name: "Swooning",
    description: "A long retain after inhaling for an advanced, heady practice.",
    hint: "A long hold with the lungs full, so treat it as advanced. Keep your throat and face soft during the retention, and stop if you feel dizzy — best done seated or lying down.",
    unit: 1,
    pre: 7,
    levels: {
      beginner: { ratio: [5, 10, 7, 0], cycle: 7 },
      medium:   { ratio: [5, 10, 7, 0], cycle: 12 },
      advanced: { ratio: [5, 10, 7, 0], cycle: 21 },
    },
  },
];

// Phase metadata: index in the ratio array, label shown on screen, and the word
// the voice speaks. Retain and sustain are both holds but kept distinct so the
// circle can stay expanded (retain) or contracted (sustain).
const PHASE_META = [
  { key: "inhale",  ratioIndex: 0, label: "Inhale", say: "Inhale" },
  { key: "inhale2", ratioIndex: 4, label: "Top up", say: "Sip in" },
  { key: "retain",  ratioIndex: 1, label: "Hold",   say: "Hold" },
  { key: "exhale",  ratioIndex: 2, label: "Exhale", say: "Exhale" },
  { key: "sustain", ratioIndex: 3, label: "Hold",   say: "Hold" },
];

// Gentle, practice-specific closing lines shown and spoken (slowly) at the end
// of a session. Keyed by program id; "_default" covers Custom and saved patterns.
const CLOSINGS = {
  "simple-mind": "Rest here a moment. The mind is quieter now — carry this ease with you.",
  "cyclic-sighing": "Feel the calm settle through you. Let that long, soft exhale stay with you a while.",
  "clear-mind": "Notice the space you've made. Let your thoughts drift by like passing clouds.",
  "relax1": "You are softer now. Let the body stay heavy and at ease a moment longer.",
  "relax2": "Let the stillness deepen. Whenever you're ready, drift gently back — or into sleep.",
  "relax3": "Feel how slow and easy the breath has become. Rest here in this calm.",
  "calming1": "The waters are still now. Sit quietly and let the calm hold you.",
  "calming2": "Let the last of the tension go. You are steady, settled, and at peace.",
  "calming3": "Notice the quiet that has arrived. Let each breath keep it soft and slow.",
  "power": "Feel the steady energy you've gathered. Carry it with you, calm and sure.",
  "harmony": "Everything is in balance now. Rest a moment in this even, gentle rhythm.",
  "anti-stress": "The tension has loosened its grip. Let your shoulders soften, and simply be.",
  "anti-appetite": "Rest here a moment. You are calm, centred, and enough, just as you are.",
  "cigarette-replace": "That craving has passed. Notice how calm and capable you are right now.",
  "decision-making": "Your mind is clearer now. Let the answer come gently, in its own time.",
  "balancing": "Left and right, in and out — all in balance. Rest in this even calm.",
  "energizing": "Feel the fresh, bright energy in you. Step forward gently, awake and alive.",
  "box": "Four steady sides, one calm centre. Carry this composure into whatever comes next.",
  "coherent": "Heart and breath are moving as one. Rest here in this quiet, coherent calm.",
  "bhramari": "Feel the gentle hum still resting within you. Let the mind stay soft and quiet.",
  "nadi-shodhana": "Both channels are clear and balanced now. Sit a moment in this settled calm.",
  "ujjayi": "The ocean of the breath grows still. Rest here, steady and serene.",
  "dirga": "The whole body has breathed, full and slow. Rest now, grounded and at ease.",
  "sitali": "Feel the cool, quiet calm you've made. Let it soothe you a little longer.",
  "triangle": "Steady and even, you've found your focus. Rest a moment in the calm.",
  "fire": "The inner warmth is kindled. Let it settle into a soft, steady glow.",
  "retention": "You met the stillness and stayed. Rest now in that quiet strength.",
  "swooning": "Float here a moment in the softness. Let everything be light and easy.",
  "_default": "Take a gentle moment. Notice how you feel, and rest here as long as you like.",
};
