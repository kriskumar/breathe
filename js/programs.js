/*
 * Breathing programs ported from nafas (https://github.com/sepandhaghighi/nafas).
 *
 * Each program defines a base `unit` (seconds), a `pre` preparation phase, and
 * three difficulty levels. A level provides a `ratio` and a `cycle` count.
 *
 * ratio = [inhale, retain, exhale, sustain]
 *   - inhale  : breathe in
 *   - retain  : hold the breath (lungs full)
 *   - exhale  : breathe out
 *   - sustain : hold the breath (lungs empty)
 *
 * Actual phase duration in seconds = ratioValue * unit.
 * cycle = number of times the inhale/retain/exhale/sustain sequence repeats.
 */
const PROGRAMS = [
  {
    id: "simple-mind",
    name: "Simple Mind",
    description: "A short, gentle 1:2 breath to settle the mind, closing with Aum.",
    unit: 3,
    pre: 3,
    levels: {
      beginner: { ratio: [1, 0, 2, 0], cycle: 10 },
      medium:   { ratio: [1, 0, 2, 0], cycle: 10 },
      advanced: { ratio: [1, 0, 2, 0], cycle: 10 },
    },
  },
  {
    id: "clear-mind",
    name: "Clear Mind",
    description: "Short inhale with a long, slow exhale to clear and settle the mind.",
    unit: 3,
    pre: 3,
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
    unit: 3,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 3,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 3,
    pre: 3,
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
    unit: 3,
    pre: 3,
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
    unit: 3,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 2,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
    levels: {
      beginner: { ratio: [5, 0, 5, 0], cycle: 30 },
      medium:   { ratio: [5, 0, 5, 0], cycle: 50 },
      advanced: { ratio: [5, 0, 5, 0], cycle: 70 },
    },
  },
  {
    id: "fire",
    name: "Fire",
    description: "A long sustain after the exhale to stoke inner heat.",
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
    unit: 1,
    pre: 3,
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
  { key: "retain",  ratioIndex: 1, label: "Hold",   say: "Hold" },
  { key: "exhale",  ratioIndex: 2, label: "Exhale", say: "Exhale" },
  { key: "sustain", ratioIndex: 3, label: "Hold",   say: "Hold" },
];
