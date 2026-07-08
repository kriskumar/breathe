/* Breathing Timer — engine, voice guidance, and persistence. */

(function () {
  "use strict";

  // ---- DOM ---------------------------------------------------------------
  const el = {
    program: document.getElementById("program"),
    description: document.getElementById("programDescription"),
    hint: document.getElementById("programHint"),
    levelControl: document.getElementById("levelControl"),
    customFields: document.querySelectorAll(".custom-only"),
    repetitions: document.getElementById("repetitions"),
    inhaleTime: document.getElementById("inhaleTime"),
    retainTime: document.getElementById("retainTime"),
    exhaleTime: document.getElementById("exhaleTime"),
    sustainTime: document.getElementById("sustainTime"),
    paceBpm: document.getElementById("paceBpm"),
    statsLine: document.getElementById("statsLine"),
    patternName: document.getElementById("patternName"),
    savePatternBtn: document.getElementById("savePatternBtn"),
    deletePatternBtn: document.getElementById("deletePatternBtn"),
    ambientSelect: document.getElementById("ambientSelect"),
    ambientVolume: document.getElementById("ambientVolume"),
    toneToggle: document.getElementById("toneToggle"),
    vibrateRow: document.getElementById("vibrateRow"),
    vibrateToggle: document.getElementById("vibrateToggle"),
    goalChips: document.getElementById("goalChips"),
    nudge: document.getElementById("nudge"),
    circle: document.getElementById("breathingCircle"),
    instruction: document.getElementById("instruction"),
    circleCount: document.getElementById("circleCount"),
    progress: document.getElementById("progress"),
    completion: document.getElementById("completionMessage"),
    controlBtn: document.getElementById("controlBtn"),
    resetBtn: document.getElementById("resetBtn"),
    themeToggle: document.getElementById("themeToggle"),
    voiceToggle: document.getElementById("voiceToggle"),
    voiceSettings: document.getElementById("voiceSettings"),
    voiceSelect: document.getElementById("voiceSelect"),
    voiceCountdown: document.getElementById("voiceCountdown"),
    voiceRate: document.getElementById("voiceRate"),
    voiceVolume: document.getElementById("voiceVolume"),
    dingToggle: document.getElementById("dingToggle"),
    // Tabs + Meditate
    tabButtons: document.querySelectorAll(".tab-btn"),
    breathePanel: document.getElementById("breathePanel"),
    meditatePanel: document.getElementById("meditatePanel"),
    heartPanel: document.getElementById("heartPanel"),
    meditationSelect: document.getElementById("meditationSelect"),
    meditationDescription: document.getElementById("meditationDescription"),
    medLoopRow: document.getElementById("medLoopRow"),
    medLoop: document.getElementById("medLoop"),
    medPlayBtn: document.getElementById("medPlayBtn"),
    medUnsupported: document.getElementById("medUnsupported"),
    medVoiceNote: document.getElementById("medVoiceNote"),
    nowPlaying: document.getElementById("nowPlaying"),
    npTitle: document.getElementById("npTitle"),
    npLine: document.getElementById("npLine"),
    npBar: document.getElementById("npBar"),
  };

  const PREFS_KEY = "breathe.prefs";
  const ttsSupported = "speechSynthesis" in window;

  // ---- State -------------------------------------------------------------
  let level = "beginner";
  let isRunning = false;
  let schedule = [];      // flat list of phases for the whole session
  let stepIndex = 0;      // index into `schedule`
  let phaseEndTime = 0;   // performance.now() timestamp when current phase ends
  let lastSpokenCount = null;
  let tickTimer = null;
  let totalCycles = 0;
  let currentCycle = 0;
  const loopPrefs = {};   // recording id -> loop on/off, persisted in prefs

  // ---- Audio (ding, ambient, pacing tones) -------------------------------
  let audioContext = null;

  // Lazily create the shared AudioContext (and resume it — iOS starts it
  // suspended until a user gesture).
  function ensureAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  // A soft zen / singing-bowl bell: a fundamental plus a few inharmonic
  // partials, each with its own gentle attack and long exponential decay.
  function playDing() {
    if (!el.dingToggle.checked) return;
    const ctx = ensureAudio();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const base = 432; // a calm, low fundamental
    const partials = [
      { ratio: 1.0,  gain: 1.0,  decay: 3.6 },
      { ratio: 2.01, gain: 0.55, decay: 2.8 },
      { ratio: 2.76, gain: 0.35, decay: 2.0 },
      { ratio: 5.40, gain: 0.18, decay: 1.4 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = base * p.ratio;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  // ---- Pacing tones: a short cue at each phase, as a non-verbal option ----
  // inhale rises, exhale falls, holds are a soft mid note.
  function playPhaseTone(key) {
    if (!el.toneToggle || !el.toneToggle.checked) return;
    if (key === "prep") return;
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    let f0 = 440, f1 = 440;
    if (key === "inhale" || key === "inhale2") { f0 = 392; f1 = 587; }      // rising
    else if (key === "exhale") { f0 = 523; f1 = 330; }                       // falling
    else { f0 = 440; f1 = 440; }                                             // hold: steady
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.linearRampToValueAtTime(f1, now + 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // ---- Ambient soundscape (synthesised, no asset files) ------------------
  // A looping noise/drone bed that plays under a session. Built with Web Audio
  // so it works offline and on iOS (alongside speechSynthesis).
  let ambientNodes = null;

  function makeNoiseBuffer(ctx, kind) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "brown") { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.5; }
      else { d[i] = white; }   // white (for rain)
    }
    return buf;
  }

  function startAmbient() {
    stopAmbient();
    const kind = el.ambientSelect ? el.ambientSelect.value : "none";
    if (!kind || kind === "none") return;
    const ctx = ensureAudio();
    const out = ctx.createGain();
    out.gain.value = (el.ambientVolume ? parseFloat(el.ambientVolume.value) : 0.5) * 0.6;
    out.connect(ctx.destination);
    const nodes = { out: out, list: [] };

    if (kind === "drone") {
      [196, 261.63, 392].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.value = i === 0 ? 0.5 : 0.22;
        o.connect(g); g.connect(out); o.start();
        nodes.list.push(o);
      });
    } else {
      // ocean = brown noise + slow filter swell; rain = brighter white noise
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, kind === "rain" ? "white" : "brown");
      src.loop = true;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = kind === "rain" ? 1800 : 520;
      src.connect(filt); filt.connect(out); src.start();
      nodes.list.push(src);
      if (kind === "ocean") {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.1;          // ~10s swell
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start();
        nodes.list.push(lfo);
      }
    }
    ambientNodes = nodes;
  }

  function stopAmbient() {
    if (!ambientNodes) return;
    ambientNodes.list.forEach((n) => { try { n.stop(); } catch (e) { /* osc/source */ } });
    try { ambientNodes.out.disconnect(); } catch (e) { /* ignore */ }
    ambientNodes = null;
  }

  function setAmbientVolume() {
    if (ambientNodes && el.ambientVolume) {
      ambientNodes.out.gain.value = parseFloat(el.ambientVolume.value) * 0.6;
    }
  }

  // ---- Text-to-speech ----------------------------------------------------
  let voices = [];
  let voicePollsLeft = 0;

  // Rank a voice for ordering: the device's exact locale first, then the same
  // language, then everything else. getVoices() returns an arbitrary order that
  // otherwise buries the user's own-language voices among dozens of others.
  function voiceRank(v) {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const ui = (navigator.language || "en").toLowerCase();
    if (lang === ui) return 0;
    if (lang.split("-")[0] === ui.split("-")[0]) return 1;
    return 2;
  }

  function languageLabel(code) {
    try {
      const dn = new Intl.DisplayNames([navigator.language || "en"], { type: "language" });
      return dn.of(code.split("-")[0]) || "Recommended";
    } catch (e) {
      return "Recommended";
    }
  }

  // Identify the chosen voice by its stable voiceURI (not list position), so the
  // choice survives re-ordering and newly installed voices.
  function currentVoiceUri() {
    const idx = el.voiceSelect.value;
    if (idx !== "" && voices[idx]) return voices[idx].voiceURI;
    return el.voiceSelect.dataset.pendingUri || "";
  }

  // Sensible per-platform default when the user hasn't picked a voice yet:
  // Samantha (en-US) on iPhone/iPad, Google UK English Male on Windows desktop.
  // Returns "" when no match is installed, leaving the top-ranked voice in place.
  function defaultVoiceUri() {
    const ua = navigator.userAgent || "";
    const isIOS = /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isWindows = /Windows/.test(ua);
    let match = null;
    if (isIOS) {
      match = voices.find((v) => /^Samantha\b/i.test(v.name) && /^en[-_]US/i.test(v.lang)) ||
              voices.find((v) => /^Samantha\b/i.test(v.name));
    } else if (isWindows) {
      match = voices.find((v) => /Google UK English Male/i.test(v.name));
    }
    return match ? match.voiceURI : "";
  }

  function selectVoiceByUri(uri) {
    if (!uri) return;
    const i = voices.findIndex((v) => v.voiceURI === uri);
    if (i >= 0) {
      el.voiceSelect.value = String(i);
      el.voiceSelect.dataset.pendingUri = "";
    } else {
      el.voiceSelect.dataset.pendingUri = uri;   // not loaded yet — wait for it
    }
  }

  function loadVoices() {
    if (!ttsSupported) return;
    const raw = window.speechSynthesis.getVoices();
    if (!raw.length) {
      // iOS may not expose named voices yet; show a default so it's not blank.
      if (!el.voiceSelect.options.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "System default voice";
        el.voiceSelect.appendChild(opt);
      }
      return;                            // a later poll/event will fill real voices
    }

    const wantUri = currentVoiceUri();
    // Order: device language first, then same language, then the rest; within
    // each, the system default voice floats up, then alphabetical by name.
    voices = raw.slice().sort((a, b) =>
      voiceRank(a) - voiceRank(b) ||
      ((b.default === true) - (a.default === true)) ||
      a.name.localeCompare(b.name));

    const preferred = voices.filter((v) => voiceRank(v) <= 1);
    const rest = voices.filter((v) => voiceRank(v) > 1);
    el.voiceSelect.innerHTML = "";
    const grouped = preferred.length && rest.length;
    addVoiceOptions(grouped ? languageLabel(navigator.language || "en") : "", preferred);
    addVoiceOptions(grouped ? "Other languages" : "", rest);

    selectVoiceByUri(wantUri || defaultVoiceUri());
  }

  // Append a set of voices, optionally inside a labelled <optgroup>. Option
  // values are indices into the sorted `voices` array.
  function addVoiceOptions(groupLabel, list) {
    if (!list.length) return;
    let parent = el.voiceSelect;
    if (groupLabel) {
      const og = document.createElement("optgroup");
      og.label = groupLabel;
      el.voiceSelect.appendChild(og);
      parent = og;
    }
    list.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = voices.indexOf(v);
      opt.textContent = `${v.name} (${v.lang})`;
      parent.appendChild(opt);
    });
  }

  // Mobile browsers (notably iOS Safari) populate getVoices() asynchronously
  // and don't always fire voiceschanged, so poll for a short while until the
  // list appears.
  function refreshVoices() {
    if (!ttsSupported) return;
    loadVoices();
    if (voices.length) return;
    voicePollsLeft = 20;
    const timer = setInterval(() => {
      loadVoices();
      if (voices.length || --voicePollsLeft <= 0) clearInterval(timer);
    }, 250);
  }

  // iOS only exposes the voice list after the speech engine has been used once
  // inside a user gesture. Warm it up with a silent utterance on the first
  // interaction so the dropdown can fill before a session starts.
  let voicesWarmed = false;
  function warmUpVoices() {
    if (voicesWarmed || !ttsSupported) return;
    voicesWarmed = true;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
    refreshVoices();
  }

  function speak(text, rateOverride) {
    if (!ttsSupported || !el.voiceToggle.checked || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    const chosen = voices[el.voiceSelect.value];
    if (chosen) u.voice = chosen;
    u.rate = rateOverride != null ? rateOverride : parseFloat(el.voiceRate.value);
    u.volume = parseFloat(el.voiceVolume.value);
    window.speechSynthesis.speak(u);
  }

  function cancelSpeech() {
    if (ttsSupported) window.speechSynthesis.cancel();
  }

  // ---- Program / level selection ----------------------------------------
  // ---- Saved custom patterns (on-device) ---------------------------------
  const PATTERNS_KEY = "breathe.patterns";
  let userPatterns = [];

  function loadPatterns() {
    try { userPatterns = JSON.parse(localStorage.getItem(PATTERNS_KEY)) || []; }
    catch (e) { userPatterns = []; }
  }
  function persistPatterns() {
    try { localStorage.setItem(PATTERNS_KEY, JSON.stringify(userPatterns)); } catch (e) { /* ignore */ }
  }
  function getUserPattern(val) {
    const v = val == null ? el.program.value : val;
    if (typeof v !== "string" || v.indexOf("user:") !== 0) return null;
    return userPatterns.find((p) => p.id === v.slice(5)) || null;
  }

  function populatePrograms() {
    const keep = el.program.value;
    el.program.innerHTML = "";
    PROGRAMS.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      el.program.appendChild(opt);
    });
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "Custom";
    el.program.appendChild(custom);
    if (userPatterns.length) {
      const og = document.createElement("optgroup");
      og.label = "My Patterns";
      userPatterns.forEach((p) => {
        const o = document.createElement("option");
        o.value = "user:" + p.id;
        o.textContent = p.name;
        og.appendChild(o);
      });
      el.program.appendChild(og);
    }
    if (keep) el.program.value = keep;
  }

  function getProgram() {
    return PROGRAMS.find((p) => p.id === el.program.value) || null;
  }

  function savePattern() {
    const name = (el.patternName.value || "").trim() || "My pattern";
    const id = "p" + Date.now();
    userPatterns.push({
      id: id,
      name: name,
      durations: {
        inhale: clampNum(el.inhaleTime.value, 0, 60, 4),
        retain: clampNum(el.retainTime.value, 0, 60, 0),
        exhale: clampNum(el.exhaleTime.value, 0, 60, 8),
        sustain: clampNum(el.sustainTime.value, 0, 60, 0),
      },
      cycles: clampInt(el.repetitions.value, 1, 200, 18),
    });
    persistPatterns();
    el.patternName.value = "";
    populatePrograms();
    el.program.value = "user:" + id;
    onProgramChange();
  }

  function deletePattern() {
    const up = getUserPattern();
    if (!up) return;
    userPatterns = userPatterns.filter((p) => p.id !== up.id);
    persistPatterns();
    populatePrograms();
    el.program.value = "custom";
    onProgramChange();
  }

  function onProgramChange() {
    const up = getUserPattern();
    const program = getProgram();
    const isCustom = !program && !up && el.program.value === "custom";

    document.body.classList.toggle("custom-mode", isCustom);
    document.body.classList.toggle("pattern-mode", !!up);
    document.body.classList.toggle("coherent-mode", !!program && program.id === "coherent");

    if (up) {
      const d = up.durations;
      el.description.textContent =
        `Saved pattern · in ${d.inhale}s · hold ${d.retain}s · out ${d.exhale}s · sustain ${d.sustain}s · ${up.cycles} cycles`;
      setHint("");
    } else if (isCustom) {
      el.description.textContent = "Set your own inhale, hold, exhale and sustain times, then save the pattern to reuse it.";
      setHint("");
    } else if (program) {
      el.description.textContent = program.description;
      setHint(program.hint || "");
    }
    savePrefs();
  }

  // Show the optional per-program "how to" hint, or hide it when absent.
  function setHint(text) {
    if (!el.hint) return;
    el.hint.textContent = text;
    el.hint.hidden = !text;
  }

  function setLevel(next) {
    level = next;
    el.levelControl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.level === level);
    });
    savePrefs();
  }

  // Resolve the four phase durations (seconds) and cycle count for the run.
  function resolveSettings() {
    const up = getUserPattern();
    if (up) {
      return {
        pre: 7,
        cycles: up.cycles,
        durations: {
          inhale: up.durations.inhale,
          retain: up.durations.retain,
          exhale: up.durations.exhale,
          sustain: up.durations.sustain,
          inhale2: 0,
        },
      };
    }
    const program = getProgram();
    if (!program) {
      return {
        pre: 7,
        cycles: clampInt(el.repetitions.value, 1, 200, 18),
        durations: {
          inhale: clampNum(el.inhaleTime.value, 0, 60, 4),
          retain: clampNum(el.retainTime.value, 0, 60, 0),
          exhale: clampNum(el.exhaleTime.value, 0, 60, 8),
          sustain: clampNum(el.sustainTime.value, 0, 60, 0),
        },
      };
    }
    const lvl = program.levels[level];
    const unit = program.unit;
    const durations = {
      inhale: lvl.ratio[0] * unit,
      retain: lvl.ratio[1] * unit,
      exhale: lvl.ratio[2] * unit,
      sustain: lvl.ratio[3] * unit,
      inhale2: (lvl.ratio[4] || 0) * unit,
    };
    // Coherent breathing: let the user pick the pace in breaths per minute and
    // split each breath evenly between inhale and exhale.
    if (program.id === "coherent") {
      const bpm = clampNum(el.paceBpm && el.paceBpm.value, 3, 10, 6);
      const half = 60 / bpm / 2;
      durations.inhale = half;
      durations.exhale = half;
      durations.retain = 0;
      durations.sustain = 0;
      durations.inhale2 = 0;
    }
    return { pre: program.pre, cycles: lvl.cycle, durations: durations };
  }

  function clampInt(v, min, max, fallback) {
    const n = parseInt(v, 10);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function clampNum(v, min, max, fallback) {
    const n = parseFloat(v);
    if (isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  // ---- Build the session schedule ---------------------------------------
  function buildSchedule(settings) {
    const steps = [];
    if (settings.pre > 0) {
      steps.push({ key: "prep", label: "Settle in", say: "Find a comfortable seat, or lie down on your back, and settle in.", seconds: settings.pre, cycle: 0 });
    }
    for (let c = 1; c <= settings.cycles; c++) {
      PHASE_META.forEach((meta) => {
        const seconds = settings.durations[meta.key];
        if (seconds > 0) {
          steps.push({
            key: meta.key,
            label: meta.label,
            say: meta.say,
            seconds: seconds,
            cycle: c,
            endsCycle: meta.key === lastPhaseKey(settings.durations),
          });
        }
      });
    }
    return steps;
  }

  // The last non-zero phase in a cycle — used to fire the ding and advance count.
  function lastPhaseKey(durations) {
    let last = null;
    PHASE_META.forEach((meta) => {
      if (durations[meta.key] > 0) last = meta.key;
    });
    return last;
  }

  // ---- Engine ------------------------------------------------------------
  function startSession() {
    const settings = resolveSettings();
    schedule = buildSchedule(settings);
    if (schedule.length === 0) return;

    stopMeditation();  // never overlap a meditation with a breathing session
    totalCycles = settings.cycles;
    currentCycle = 0;
    stepIndex = 0;
    isRunning = true;

    el.completion.classList.remove("show");
    el.controlBtn.textContent = "Stop";
    setControlsDisabled(true);
    acquireWakeLock();
    startAmbient();

    // A user gesture (the Start click) is required to unlock audio on mobile;
    // it's also when iOS first exposes the voice list, so refresh it here.
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      refreshVoices();
    }

    beginBreathing();
  }

  function beginBreathing() {
    if (!isRunning) return;
    enterPhase(schedule[0]);
    tickTimer = setInterval(tick, 100);
  }

  // ---- Tabs --------------------------------------------------------------
  function switchTab(name) {
    // Leaving a tab stops whatever it was doing.
    if (isRunning) stopSession();
    stopMeditation();
    if (name !== "heart" && window.HeartRate) window.HeartRate.onLeaveTab();

    el.tabButtons.forEach((b) => {
      const on = b.dataset.tab === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    el.breathePanel.hidden = name !== "breathe";
    el.meditatePanel.hidden = name !== "meditate";
    if (el.heartPanel) el.heartPanel.hidden = name !== "heart";
  }

  // ---- Meditate tab: a picker + description box, then Play ----------------
  // One playback at a time. medState tracks whichever is active so switching
  // tabs, starting another, or pressing Stop can cleanly tear it down.
  const medState = { active: false, type: null, audio: null, timer: null, item: null, idx: 0 };

  // id -> { data, type } for every chant and guided meditation in the picker.
  const medIndex = {};

  // Build the dropdown (Chants + Guided meditations as optgroups) and show the
  // description for the initial selection.
  function renderMeditationPicker() {
    const groups = [
      { label: "🎧 Chants", items: RECORDINGS, type: "audio" },
      { label: "🧘 Guided meditations", items: MEDITATIONS, type: "tts" },
    ];
    groups.forEach((g) => {
      if (!g.items.length) return;
      const og = document.createElement("optgroup");
      og.label = g.label;
      g.items.forEach((data) => {
        medIndex[data.id] = { data, type: g.type };
        const opt = document.createElement("option");
        opt.value = data.id;
        opt.textContent = data.minutes ? `${data.name} · ${data.minutes} min` : data.name;
        og.appendChild(opt);
      });
      el.meditationSelect.appendChild(og);
    });
    onMeditationChange();

    // Guided meditations ship a pre-rendered file; speech synthesis is only a
    // fallback. Warn only if a file-less meditation exists and TTS is missing.
    const needsTts = MEDITATIONS.some((m) => !m.file);
    if (needsTts && !ttsSupported) {
      el.medVoiceNote.hidden = true;
      el.medUnsupported.hidden = false;
    }
  }

  // Update the description box (and the loop toggle) for the chosen session.
  function onMeditationChange() {
    const entry = medIndex[el.meditationSelect.value];
    if (!entry) return;
    el.meditationDescription.textContent = entry.data.description || "";
    // Loop only makes sense for the repeating chants, not narrated scripts.
    const isAudio = entry.type === "audio";
    el.medLoopRow.hidden = !isAudio;
    if (isAudio) el.medLoop.checked = !!loopPrefs[entry.data.id];
  }

  // The Play button toggles: start the selected session, or stop the running one.
  function toggleMedPlay() {
    if (medState.active) { stopMeditation(); return; }
    const entry = medIndex[el.meditationSelect.value];
    if (!entry) return;
    // A pre-rendered narration (or chant) plays as audio; otherwise fall to TTS.
    if (entry.data.file) playRecording(entry.data);
    else playGuided(entry.data);
  }

  function setPlayingState(on) {
    el.medPlayBtn.textContent = on ? "⏹ Stop" : "▶ Play";
    el.medPlayBtn.classList.toggle("is-playing", on);
  }

  function playRecording(rec) {
    stopMeditation();
    medState.active = true;
    medState.type = "audio";
    medState.item = rec;
    const audio = new Audio(rec.file);
    // Loop applies only to chants (the loop row is visible for them).
    audio.loop = !el.medLoopRow.hidden && !!el.medLoop.checked;
    medState.audio = audio;
    acquireWakeLock();
    showNowPlaying(rec.name, "");
    setPlayingState(true);
    // Scope callbacks to this audio instance so a late `ended`/rejected play()
    // from a superseded recording can't tear down a newer session.
    const isCurrent = () => medState.audio === audio;
    audio.addEventListener("timeupdate", () => {
      if (isCurrent() && audio.duration) setMedProgress(audio.currentTime / audio.duration);
    });
    audio.addEventListener("ended", () => { if (isCurrent()) finishMeditation(); });
    const played = audio.play();
    if (played && played.catch) played.catch(() => { if (isCurrent()) finishMeditation(); });
  }

  function playGuided(med) {
    if (!ttsSupported) return;
    stopMeditation();
    medState.active = true;
    medState.type = "tts";
    medState.item = med;
    medState.idx = 0;
    acquireWakeLock();
    // A Start-style user gesture got us here; refresh the iOS voice list.
    window.speechSynthesis.cancel();
    refreshVoices();
    showNowPlaying(med.name, "");
    setPlayingState(true);
    speakSegment();
  }

  // Speak one script line, then wait its `pause` seconds before the next.
  function speakSegment() {
    if (!medState.active || medState.type !== "tts") return;
    const med = medState.item;
    if (medState.idx >= med.segments.length) { finishMeditation(); return; }

    const seg = med.segments[medState.idx];
    el.npLine.textContent = seg.say;
    setMedProgress(medState.idx / med.segments.length);

    const u = new SpeechSynthesisUtterance(seg.say);
    const chosen = voices[el.voiceSelect.value];
    if (chosen) u.voice = chosen;
    u.rate = parseFloat(el.voiceRate.value);
    u.volume = parseFloat(el.voiceVolume.value);
    u.onend = () => {
      if (!medState.active || medState.type !== "tts") return;
      medState.timer = setTimeout(() => {
        medState.idx++;
        speakSegment();
      }, (seg.pause || 0) * 1000);
    };
    window.speechSynthesis.speak(u);
  }

  function showNowPlaying(title, line) {
    el.npTitle.textContent = title;
    el.npLine.textContent = line || "";
    setMedProgress(0);
    el.nowPlaying.hidden = false;
  }

  function setMedProgress(fraction) {
    const pct = Math.max(0, Math.min(1, fraction)) * 100;
    el.npBar.style.width = pct + "%";
  }

  // Reached the natural end of a recording or script.
  function finishMeditation() {
    setMedProgress(1);
    teardownMeditation();
  }

  // Stop early (tab switch, Stop button, starting another, breathing session).
  function stopMeditation() {
    teardownMeditation();
  }

  function teardownMeditation() {
    if (medState.timer) { clearTimeout(medState.timer); medState.timer = null; }
    if (medState.audio) { medState.audio.onended = null; medState.audio.pause(); medState.audio = null; }
    if (ttsSupported) window.speechSynthesis.cancel();
    const wasActive = medState.active;
    medState.active = false;
    medState.type = null;
    medState.item = null;
    medState.idx = 0;
    setPlayingState(false);
    el.nowPlaying.hidden = true;
    if (wasActive && !isRunning) releaseWakeLock();
  }

  // ---- Screen Wake Lock --------------------------------------------------
  // Keep the screen awake during a session so iOS doesn't auto-lock and
  // suspend the timers, audio and speech. (Manual power-button locks can't
  // be overridden.)
  let wakeLock = null;

  async function acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) { /* denied (e.g. low battery / not visible) — ignore */ }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
  }

  function enterPhase(step) {
    lastSpokenCount = null;
    phaseEndTime = performance.now() + step.seconds * 1000;

    if (step.cycle > 0) currentCycle = step.cycle;

    // Visuals
    el.circle.className = "breathing-circle phase-" + step.key;
    setCircleScale(step.key, step.seconds);
    el.instruction.textContent = step.label;

    // Flush any speech still queued from the previous phase so the voice can't
    // fall behind the on-screen timer, then announce this phase by name.
    if (ttsSupported) window.speechSynthesis.cancel();
    speak(step.say);
    playPhaseTone(step.key);
    vibratePhase(step.key);

    updateDisplay(Math.ceil(step.seconds));
  }

  // Haptic cue at each phase start (Android/desktop; iOS Safari has no
  // Vibration API, so the toggle is hidden there and this is a no-op).
  function vibratePhase(key) {
    if (!el.vibrateToggle || !el.vibrateToggle.checked || !("vibrate" in navigator)) return;
    if (key === "prep") return;
    if (key === "inhale" || key === "inhale2" || key === "exhale") navigator.vibrate(45);
    else navigator.vibrate(18);   // holds: a faint tap
  }

  // Drive the circle to expand on inhale, contract on exhale, and hold size
  // during retains/sustains. Transition time matches the phase length.
  function setCircleScale(key, seconds) {
    let target = el.circle.style.transform;
    if (key === "inhale") target = "scale(1.5)";
    else if (key === "inhale2") target = "scale(1.65)";   // the top-up sip
    else if (key === "exhale") target = "scale(1)";
    else if (key === "retain") target = "scale(1.5)";
    else if (key === "sustain") target = "scale(1)";
    else if (key === "prep") target = "scale(1)";

    if (key === "inhale" || key === "exhale" || key === "inhale2") {
      el.circle.style.transition = `transform ${seconds}s ease-in-out`;
    } else {
      el.circle.style.transition = "transform 0.3s ease-in-out";
    }
    // Force the new transition to apply before changing transform.
    requestAnimationFrame(() => { el.circle.style.transform = target; });
  }

  function tick() {
    const remainingMs = phaseEndTime - performance.now();
    const remaining = Math.max(0, Math.ceil(remainingMs / 1000));

    updateDisplay(remaining);

    // Speak the countdown once per integer second, keeping it in lock-step
    // with the visible timer. Skip it during "Settle in" so the spoken
    // settling cue isn't interrupted by numbers.
    const curKey = schedule[stepIndex] && schedule[stepIndex].key;
    if (el.voiceCountdown.checked && curKey !== "prep" && remaining > 0 && remaining !== lastSpokenCount) {
      lastSpokenCount = remaining;
      speak(String(remaining));
    }

    if (remainingMs <= 0) advance();
  }

  function advance() {
    const finished = schedule[stepIndex];
    if (finished.endsCycle) playDing();

    stepIndex++;
    if (stepIndex >= schedule.length) {
      completeSession();
      return;
    }
    enterPhase(schedule[stepIndex]);
  }

  function updateDisplay(remaining) {
    el.circleCount.textContent = remaining;
    if (currentCycle > 0) {
      el.progress.textContent = `Cycle ${currentCycle} / ${totalCycles}`;
    } else {
      el.progress.textContent = "Preparing…";
    }
  }

  function completeSession() {
    stopTimers();
    stopAmbient();
    isRunning = false;
    el.controlBtn.textContent = "Start";
    setControlsDisabled(false);
    releaseWakeLock();
    recordSession({
      t: Date.now(),
      program: el.program.value,
      level: level,
      cycles: totalCycles,
      sec: schedule.reduce((s, st) => s + st.seconds, 0),
    });
    const msg = closingMessage();
    showCompletion(msg);
    // Spoken slowly and gently as a calm close to the practice.
    speak(msg, 0.8);
  }

  // A gentle, practice-specific closing line (falls back for Custom / saved).
  function closingMessage() {
    const map = (typeof CLOSINGS !== "undefined") ? CLOSINGS : null;
    return (map && map[el.program.value]) || (map && map._default) || "Take a gentle moment. Notice how you feel, and rest here as long as you like.";
  }

  function showCompletion(msg) {
    el.circle.className = "breathing-circle";
    el.circle.style.transform = "scale(1)";
    el.instruction.textContent = "Done";
    el.circleCount.textContent = "✓";
    el.progress.textContent = `Cycle ${totalCycles} / ${totalCycles}`;
    el.completion.textContent = msg || "";
    el.completion.classList.add("show");
  }

  function stopSession() {
    stopTimers();
    stopAmbient();
    releaseWakeLock();
    cancelSpeech();
    isRunning = false;
    el.circle.className = "breathing-circle";
    el.circle.style.transform = "scale(1)";
    el.instruction.textContent = "Paused";
    el.controlBtn.textContent = "Start";
    setControlsDisabled(false);
  }

  function stopTimers() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  function setControlsDisabled(disabled) {
    el.program.disabled = disabled;
    el.repetitions.disabled = disabled;
    el.inhaleTime.disabled = disabled;
    el.retainTime.disabled = disabled;
    el.exhaleTime.disabled = disabled;
    el.sustainTime.disabled = disabled;
    [el.paceBpm, el.ambientSelect, el.toneToggle, el.vibrateToggle,
     el.patternName, el.savePatternBtn, el.deletePatternBtn]
      .forEach((n) => { if (n) n.disabled = disabled; });
    el.levelControl.querySelectorAll("button").forEach((b) => (b.disabled = disabled));
    if (el.goalChips) el.goalChips.querySelectorAll(".goal-chip").forEach((c) => (c.disabled = disabled));
  }

  function toggleControl() {
    if (isRunning) stopSession();
    else startSession();
  }

  // Stop any running session and return the UI to its initial, ready state
  // without reloading the page.
  function resetSession() {
    stopTimers();
    stopAmbient();
    releaseWakeLock();
    cancelSpeech();
    isRunning = false;
    schedule = [];
    stepIndex = 0;
    currentCycle = 0;
    totalCycles = 0;
    lastSpokenCount = null;
    el.circle.className = "breathing-circle";
    el.circle.style.transform = "scale(1)";
    el.instruction.textContent = "Ready";
    el.circleCount.textContent = "--";
    el.progress.textContent = "Cycle 0 / 0";
    el.completion.classList.remove("show");
    el.controlBtn.textContent = "Start";
    setControlsDisabled(false);
  }

  // ---- Preferences -------------------------------------------------------
  function savePrefs() {
    const prefs = {
      theme: themePref,
      program: el.program.value,
      level: level,
      voiceOn: el.voiceToggle.checked,
      voiceUri: currentVoiceUri(),
      countdown: el.voiceCountdown.checked,
      rate: el.voiceRate.value,
      volume: el.voiceVolume.value,
      ding: el.dingToggle.checked,
      tone: el.toneToggle ? el.toneToggle.checked : false,
      vibrate: el.vibrateToggle ? el.vibrateToggle.checked : false,
      ambient: el.ambientSelect ? el.ambientSelect.value : "none",
      ambientVol: el.ambientVolume ? el.ambientVolume.value : "0.5",
      paceBpm: el.paceBpm ? el.paceBpm.value : "6",
      loops: loopPrefs,
      custom: {
        reps: el.repetitions.value,
        inhale: el.inhaleTime.value,
        retain: el.retainTime.value,
        exhale: el.exhaleTime.value,
        sustain: el.sustainTime.value,
      },
    };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) { /* storage may be unavailable */ }
  }

  function loadPrefs() {
    let prefs = null;
    try {
      prefs = JSON.parse(localStorage.getItem(PREFS_KEY));
    } catch (e) { /* ignore */ }
    if (!prefs) return;

    if (prefs.theme && THEMES.indexOf(prefs.theme) !== -1) themePref = prefs.theme;
    if (prefs.program) el.program.value = prefs.program;
    if (prefs.level) level = prefs.level;
    if (typeof prefs.voiceOn === "boolean") el.voiceToggle.checked = prefs.voiceOn;
    if (typeof prefs.countdown === "boolean") el.voiceCountdown.checked = prefs.countdown;
    if (prefs.rate) el.voiceRate.value = prefs.rate;
    if (prefs.volume) el.voiceVolume.value = prefs.volume;
    if (typeof prefs.ding === "boolean") el.dingToggle.checked = prefs.ding;
    if (typeof prefs.tone === "boolean" && el.toneToggle) el.toneToggle.checked = prefs.tone;
    if (typeof prefs.vibrate === "boolean" && el.vibrateToggle) el.vibrateToggle.checked = prefs.vibrate;
    if (prefs.ambient && el.ambientSelect) el.ambientSelect.value = prefs.ambient;
    if (prefs.ambientVol && el.ambientVolume) el.ambientVolume.value = prefs.ambientVol;
    if (prefs.paceBpm && el.paceBpm) el.paceBpm.value = prefs.paceBpm;
    if (prefs.loops) Object.assign(loopPrefs, prefs.loops);
    if (prefs.voiceUri) el.voiceSelect.dataset.pendingUri = prefs.voiceUri;
    if (prefs.custom) {
      el.repetitions.value = prefs.custom.reps ?? el.repetitions.value;
      el.inhaleTime.value = prefs.custom.inhale ?? el.inhaleTime.value;
      el.retainTime.value = prefs.custom.retain ?? el.retainTime.value;
      el.exhaleTime.value = prefs.custom.exhale ?? el.exhaleTime.value;
      el.sustainTime.value = prefs.custom.sustain ?? el.sustainTime.value;
    }
  }

  function syncVoiceSettingsVisibility() {
    el.voiceSettings.classList.toggle("hidden", !el.voiceToggle.checked);
  }

  // ---- Theme (auto / light / dark) --------------------------------------
  const THEMES = ["auto", "light", "dark"];
  let themePref = "auto";
  const darkMq = window.matchMedia("(prefers-color-scheme: dark)");

  function resolvedTheme() {
    return themePref === "auto" ? (darkMq.matches ? "dark" : "light") : themePref;
  }

  function applyTheme() {
    const r = resolvedTheme();
    document.documentElement.setAttribute("data-theme", r);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", r === "dark" ? "#1a1726" : "#667eea");
    if (el.themeToggle) {
      el.themeToggle.textContent = themePref === "auto" ? "🌗" : themePref === "dark" ? "🌙" : "☀️";
      el.themeToggle.title = "Theme: " + themePref;
    }
  }

  function cycleTheme() {
    themePref = THEMES[(THEMES.indexOf(themePref) + 1) % THEMES.length];
    applyTheme();
    savePrefs();
  }

  darkMq.addEventListener("change", () => { if (themePref === "auto") applyTheme(); });

  // ---- Local history & streaks (private, on-device only) -----------------
  const HISTORY_KEY = "breathe.history";

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch (e) { return []; }
  }

  function recordSession(entry) {
    const hist = loadHistory();
    hist.push(entry);
    if (hist.length > 1000) hist.splice(0, hist.length - 1000);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch (e) { /* ignore */ }
    renderStats();
    renderNudge();
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  // Count consecutive days ending today (or yesterday if nothing logged today yet).
  function computeStreak(days) {
    let streak = 0;
    const d = new Date();
    if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d.getTime()))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function renderStats() {
    if (!el.statsLine) return;
    const hist = loadHistory();
    if (!hist.length) { el.statsLine.hidden = true; return; }
    const sessions = hist.length;
    const minutes = Math.round(hist.reduce((s, e) => s + (e.sec || 0), 0) / 60);
    const streak = computeStreak(new Set(hist.map((e) => dayKey(e.t))));
    const parts = [];
    if (streak > 1) parts.push("🔥 " + streak + "-day streak");
    parts.push(sessions + (sessions === 1 ? " session" : " sessions"));
    parts.push(minutes + " min");
    el.statsLine.textContent = parts.join("  ·  ");
    el.statsLine.hidden = false;
  }

  // A gentle, honest in-app nudge based on local history (no notifications,
  // no backend — reliable and private). Reliable daily push reminders would
  // need a push server, which we deliberately avoid.
  function renderNudge() {
    if (!el.nudge) return;
    const hist = loadHistory();
    if (!hist.length) { el.nudge.hidden = true; return; }
    const practicedToday = hist.some((e) => dayKey(e.t) === dayKey(Date.now()));
    const streak = computeStreak(new Set(hist.map((e) => dayKey(e.t))));
    let msg;
    if (practicedToday) msg = "🌿 You've practised today — lovely. Another round whenever you like.";
    else if (streak > 1) msg = "🔥 " + streak + "-day streak — a few breaths will keep it going.";
    else msg = "🌿 Welcome back — ready for a few breaths?";
    el.nudge.textContent = msg;
    el.nudge.hidden = false;
  }

  // ---- Init --------------------------------------------------------------
  function init() {
    loadPatterns();
    populatePrograms();
    loadPrefs();
    applyTheme();

    // Hide voice options entirely if the browser has no speech synthesis.
    if (!ttsSupported) {
      el.voiceToggle.checked = false;
      el.voiceToggle.disabled = true;
      document.getElementById("voiceUnsupported").style.display = "block";
    } else {
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    onProgramChange();
    setLevel(level);
    syncVoiceSettingsVisibility();
    renderStats();
    renderNudge();
    if ("vibrate" in navigator && el.vibrateRow) el.vibrateRow.hidden = false;

    // Warm up the speech engine on the very first user interaction (iOS).
    ["pointerdown", "touchstart", "click"].forEach((evt) =>
      window.addEventListener(evt, warmUpVoices, { once: true, passive: true }));

    // Wiring
    el.controlBtn.addEventListener("click", toggleControl);
    el.resetBtn.addEventListener("click", resetSession);
    if (el.themeToggle) el.themeToggle.addEventListener("click", cycleTheme);
    if (el.savePatternBtn) el.savePatternBtn.addEventListener("click", savePattern);
    if (el.deletePatternBtn) el.deletePatternBtn.addEventListener("click", deletePattern);
    if (el.ambientVolume) el.ambientVolume.addEventListener("input", setAmbientVolume);
    if (el.ambientSelect) el.ambientSelect.addEventListener("change", () => { if (isRunning) startAmbient(); });
    if (el.goalChips) {
      el.goalChips.querySelectorAll(".goal-chip").forEach((c) =>
        c.addEventListener("click", () => {
          if (isRunning) return;
          const id = c.dataset.program;
          if (Array.prototype.some.call(el.program.options, (o) => o.value === id)) {
            el.program.value = id;
            onProgramChange();
          }
        }));
    }
    el.program.addEventListener("change", onProgramChange);

    // Tabs + Meditate
    renderMeditationPicker();
    el.tabButtons.forEach((b) =>
      b.addEventListener("click", () => switchTab(b.dataset.tab)));
    el.meditationSelect.addEventListener("change", () => {
      // Switching the picker shouldn't keep the previous session playing.
      if (medState.active) stopMeditation();
      onMeditationChange();
    });
    el.medPlayBtn.addEventListener("click", toggleMedPlay);
    el.medLoop.addEventListener("change", () => {
      const entry = medIndex[el.meditationSelect.value];
      if (entry) loopPrefs[entry.data.id] = el.medLoop.checked;
      // Apply live if that chant is currently playing.
      if (medState.type === "audio" && medState.audio) medState.audio.loop = el.medLoop.checked;
      savePrefs();
    });
    el.levelControl.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => setLevel(b.dataset.level));
    });
    el.voiceToggle.addEventListener("change", () => {
      syncVoiceSettingsVisibility();
      if (el.voiceToggle.checked) refreshVoices();
      else cancelSpeech();
      savePrefs();
    });
    [el.voiceSelect, el.voiceCountdown, el.voiceRate, el.voiceVolume, el.dingToggle,
     el.toneToggle, el.vibrateToggle, el.ambientSelect, el.ambientVolume, el.paceBpm,
     el.repetitions, el.inhaleTime, el.retainTime, el.exhaleTime, el.sustainTime]
      .filter(Boolean)
      .forEach((node) => node.addEventListener("change", savePrefs));

    // The "see the research ↓" link inside Help opens the (collapsed) Research
    // section and scrolls to it.
    const toResearch = document.getElementById("toResearch");
    const researchSection = document.getElementById("researchSection");
    if (toResearch && researchSection) {
      toResearch.addEventListener("click", (e) => {
        e.preventDefault();
        researchSection.open = true;
        researchSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // iOS releases the wake lock when the tab is hidden; re-acquire it when the
    // user returns mid-session.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && (isRunning || medState.active) && !wakeLock) {
        acquireWakeLock();
      }
    });
  }

  // Register the service worker for offline use.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* offline unavailable */ });
    });
  }

  init();
})();
