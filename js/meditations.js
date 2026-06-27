/*
 * Meditations — content for the Meditate tab.
 *
 * Two kinds of sessions:
 *
 *   RECORDINGS  — pre-recorded audio (mp3). Streamed on demand; the first one
 *                 played is cached by the service worker for later offline use.
 *
 *   MEDITATIONS — voice-guided scripts read aloud with the browser's speech
 *                 synthesis, using the same voice settings as the Breathe tab.
 *                 Each script is a list of segments:
 *                   { say: "<spoken line>", pause: <seconds of silence after> }
 *                 The `minutes` field is a rough length estimate for display.
 */

const RECORDINGS = [
  {
    id: "aum",
    name: "Aum Chant",
    description: "A continuous Aum (Om) to rest the mind.",
    minutes: 1,
    file: "mp3/aum.mp3",
  },
];

const MEDITATIONS = [
  {
    id: "breath-awareness",
    name: "Breath Awareness",
    description: "A short settling practice — simply following the natural breath.",
    minutes: 3,
    segments: [
      { say: "Find a comfortable position, and let your eyes gently close.", pause: 4 },
      { say: "Allow your body to settle, feeling its weight supported beneath you.", pause: 6 },
      { say: "Take a slow breath in through the nose. And a long breath out.", pause: 6 },
      { say: "There's nothing to do here, and nowhere to be. Just this breath.", pause: 6 },
      { say: "Bring your attention to the feeling of the breath as it enters your body.", pause: 8 },
      { say: "Notice the cool air at the tip of the nose as you breathe in.", pause: 5 },
      { say: "And the gentle warmth as you breathe out.", pause: 8 },
      { say: "There's no need to change the breath. Simply let it be natural.", pause: 8 },
      { say: "If your mind wanders, that's okay. Gently guide it back to the breath.", pause: 10 },
      { say: "Rest here, following each breath in, and out.", pause: 12 },
      { say: "Feel the soft rise of the body as you breathe in.", pause: 6 },
      { say: "And the easy release as you breathe out.", pause: 10 },
      { say: "Stay with this quiet rhythm for a few more breaths.", pause: 14 },
      { say: "When you're ready, let your awareness widen to the space around you.", pause: 6 },
      { say: "Gently open your eyes, and carry this calm with you.", pause: 2 },
    ],
  },
  {
    id: "body-scan",
    name: "Body Scan",
    description: "Release tension by moving attention slowly through the body.",
    minutes: 5,
    segments: [
      { say: "Lie down or sit comfortably, and allow your eyes to close.", pause: 4 },
      { say: "Take a few slow breaths, letting each exhale soften your body a little more.", pause: 8 },
      { say: "Bring your attention down to your feet. Notice any sensation there.", pause: 8 },
      { say: "As you breathe out, let your feet relax and grow heavy.", pause: 8 },
      { say: "Move your attention up into your legs.", pause: 6 },
      { say: "Let the muscles of your legs soften and release.", pause: 10 },
      { say: "Bring awareness to your belly and lower back.", pause: 6 },
      { say: "Feel them rise and fall with the breath, and let them ease.", pause: 10 },
      { say: "Notice your chest, and the gentle beating of your heart.", pause: 8 },
      { say: "Let your shoulders drop away from your ears.", pause: 8 },
      { say: "Soften your arms, all the way down to your hands and fingers.", pause: 10 },
      { say: "Relax your neck, your jaw, and the small muscles around your eyes.", pause: 10 },
      { say: "Let your whole face become smooth and still.", pause: 8 },
      { say: "Now sense your entire body at once, resting, supported, at ease.", pause: 12 },
      { say: "Breathe here for a few moments, whole and calm.", pause: 14 },
      { say: "When you're ready, wiggle your fingers and toes, and gently return.", pause: 3 },
    ],
  },
  {
    id: "loving-kindness",
    name: "Loving-Kindness",
    description: "Offer warm, kind wishes to yourself and others.",
    minutes: 4,
    segments: [
      { say: "Settle into a comfortable position, and let your eyes close.", pause: 4 },
      { say: "Take a few easy breaths, and let your heart soften.", pause: 8 },
      { say: "Bring to mind a sense of yourself, just as you are.", pause: 6 },
      { say: "Silently offer yourself these wishes.", pause: 3 },
      { say: "May I be happy.", pause: 5 },
      { say: "May I be healthy.", pause: 5 },
      { say: "May I be at peace.", pause: 7 },
      { say: "Now picture someone you care about, sitting in front of you.", pause: 6 },
      { say: "Offer them the same kindness.", pause: 3 },
      { say: "May you be happy. May you be healthy. May you be at peace.", pause: 8 },
      { say: "Let this warmth widen to include all those around you.", pause: 6 },
      { say: "May all beings be happy. May all beings be at peace.", pause: 8 },
      { say: "Rest for a moment in this feeling of goodwill.", pause: 12 },
      { say: "When you're ready, let your eyes open, and carry this kindness forward.", pause: 2 },
    ],
  },
];
