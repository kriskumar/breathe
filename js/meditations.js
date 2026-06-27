/*
 * Meditations — content for the Meditate tab.
 *
 * Two kinds of sessions:
 *
 *   RECORDINGS  — pre-recorded audio (mp3). Streamed on demand; the first one
 *                 played is cached by the service worker for later offline use.
 *
 *   MEDITATIONS — voice-guided sessions. Each has a `file` (a pre-rendered
 *                 narration, generated from its `segments` via ElevenLabs) that
 *                 plays when tapped. If `file` is absent, the `segments` are
 *                 read aloud with the browser's speech synthesis as a fallback.
 *                 Each segment is { say: "<line>", pause: <seconds of silence
 *                 after> }; the `segments` also serve as the source script for
 *                 regenerating the audio. `minutes` is a rough length for display.
 */

const RECORDINGS = [
  {
    id: "aum",
    name: "Aum Chant",
    description: "A continuous Aum (Om) to rest the mind.",
    minutes: 1,
    file: "mp3/aum.mp3",
  },
  {
    id: "omkar-21",
    name: "Omkar — 21 Aums",
    description: "Aum chanted twenty-one times.",
    minutes: 8,
    file: "mp3/omkar-21.mp3",
  },
];

const MEDITATIONS = [
  {
    id: "breath-awareness",
    name: "Breath Awareness",
    description: "A short settling practice — simply following the natural breath.",
    minutes: 3,
    file: "mp3/breath-awareness.mp3",
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
    minutes: 3,
    file: "mp3/body-scan.mp3",
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
    minutes: 2,
    file: "mp3/loving-kindness.mp3",
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
  {
    id: "so-ham",
    name: "So Ham — Breath Mantra",
    description: "The breath's own sound — \"I am that.\" Fits the app's name.",
    minutes: 2,
    file: "mp3/so-ham.mp3",
  },
  {
    id: "sleep",
    name: "Drifting to Sleep",
    description: "A soft body-relaxation to let you fall asleep.",
    minutes: 2,
    file: "mp3/sleep.mp3",
  },
  {
    id: "gratitude",
    name: "Gratitude",
    description: "Resting in thankfulness for the small and the large.",
    minutes: 2,
    file: "mp3/gratitude.mp3",
  },
  {
    id: "mountain",
    name: "The Mountain",
    description: "Grounding and stability — becoming steady and unmoving.",
    minutes: 2,
    file: "mp3/mountain.mp3",
  },
  {
    id: "calm-anxiety",
    name: "Calm in Anxiety",
    description: "Settling the nervous system when worry rises.",
    minutes: 2,
    file: "mp3/calm-anxiety.mp3",
  },
  {
    id: "morning",
    name: "Morning Intention",
    description: "A fresh, open start to the day.",
    minutes: 2,
    file: "mp3/morning.mp3",
  },
  {
    id: "letting-go",
    name: "Letting Go",
    description: "Releasing what you've been holding.",
    minutes: 2,
    file: "mp3/letting-go.mp3",
  },
  {
    id: "self-compassion",
    name: "Self-Compassion",
    description: "Meeting your own struggles with kindness.",
    minutes: 2,
    file: "mp3/self-compassion.mp3",
  },
  {
    id: "safe-place",
    name: "A Safe and Peaceful Place",
    description: "A guided visualization of calm and safety.",
    minutes: 2,
    file: "mp3/safe-place.mp3",
  },
  {
    id: "stillness",
    name: "Inner Stillness",
    description: "Resting in the quiet center beneath thought.",
    minutes: 2,
    file: "mp3/stillness.mp3",
  },
  {
    id: "focus",
    name: "Focus & Concentration",
    description: "Single-pointed attention to steady a scattered mind.",
    minutes: 2,
    file: "mp3/focus.mp3",
  },
  {
    id: "grounding-senses",
    name: "Five Senses Grounding",
    description: "A 5-4-3-2-1 practice to return to the present when overwhelmed.",
    minutes: 2,
    file: "mp3/grounding-senses.mp3",
  },
  {
    id: "forgiveness",
    name: "Forgiveness",
    description: "Setting down resentment, for your own freedom.",
    minutes: 2,
    file: "mp3/forgiveness.mp3",
  },
  {
    id: "evening",
    name: "Evening Unwind",
    description: "Releasing the day as it comes to a close.",
    minutes: 2,
    file: "mp3/evening.mp3",
  },
  {
    id: "energize",
    name: "Energize & Awaken",
    description: "Drawing in fresh energy and clarity.",
    minutes: 2,
    file: "mp3/energize.mp3",
  },
  {
    id: "sound",
    name: "Awareness of Sound",
    description: "Resting as the open space in which sounds come and go.",
    minutes: 2,
    file: "mp3/sound.mp3",
  },
  {
    id: "emotions",
    name: "Working with Difficult Emotions",
    description: "Meeting a hard feeling with recognition and kindness.",
    minutes: 2,
    file: "mp3/emotions.mp3",
  },
  {
    id: "open-awareness",
    name: "Open Awareness",
    description: "Resting as spacious awareness, letting everything drift through.",
    minutes: 2,
    file: "mp3/open-awareness.mp3",
  },
  {
    id: "compassion",
    name: "Compassion",
    description: "Wishing ease for others, and for all who suffer.",
    minutes: 2,
    file: "mp3/compassion.mp3",
  },
  {
    id: "quick-calm",
    name: "A Moment of Calm",
    description: "A short reset you can use anytime, anywhere.",
    minutes: 1,
    file: "mp3/quick-calm.mp3",
  },
];
