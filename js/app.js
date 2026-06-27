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
    circle: document.getElementById("breathingCircle"),
    instruction: document.getElementById("instruction"),
    circleCount: document.getElementById("circleCount"),
    progress: document.getElementById("progress"),
    completion: document.getElementById("completionMessage"),
    controlBtn: document.getElementById("controlBtn"),
    resetBtn: document.getElementById("resetBtn"),
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
    recordingList: document.getElementById("recordingList"),
    meditationList: document.getElementById("meditationList"),
    medUnsupported: document.getElementById("medUnsupported"),
    medVoiceNote: document.getElementById("medVoiceNote"),
    nowPlaying: document.getElementById("nowPlaying"),
    npTitle: document.getElementById("npTitle"),
    npLine: document.getElementById("npLine"),
    npBar: document.getElementById("npBar"),
    npStop: document.getElementById("npStop"),
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

  // ---- Audio (ding) ------------------------------------------------------
  let audioContext = null;

  // A soft zen / singing-bowl bell: a fundamental plus a few inharmonic
  // partials, each with its own gentle attack and long exponential decay.
  function playDing() {
    if (!el.dingToggle.checked) return;
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") audioContext.resume();

    const ctx = audioContext;
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

    selectVoiceByUri(wantUri);
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

  function speak(text) {
    if (!ttsSupported || !el.voiceToggle.checked || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    const chosen = voices[el.voiceSelect.value];
    if (chosen) u.voice = chosen;
    u.rate = parseFloat(el.voiceRate.value);
    u.volume = parseFloat(el.voiceVolume.value);
    window.speechSynthesis.speak(u);
  }

  function cancelSpeech() {
    if (ttsSupported) window.speechSynthesis.cancel();
  }

  // ---- Program / level selection ----------------------------------------
  function populatePrograms() {
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
  }

  function getProgram() {
    return PROGRAMS.find((p) => p.id === el.program.value) || null;
  }

  function onProgramChange() {
    const program = getProgram();
    if (!program) {
      // Custom
      document.body.classList.add("custom-mode");
      el.description.textContent = "Set your own inhale, hold, exhale and sustain times.";
      setHint("");
    } else {
      document.body.classList.remove("custom-mode");
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
    const program = getProgram();
    if (!program) {
      return {
        pre: 3,
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
    return {
      pre: program.pre,
      cycles: lvl.cycle,
      durations: {
        inhale: lvl.ratio[0] * unit,
        retain: lvl.ratio[1] * unit,
        exhale: lvl.ratio[2] * unit,
        sustain: lvl.ratio[3] * unit,
      },
    };
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
      steps.push({ key: "prep", label: "Get Ready", say: "Get ready", seconds: settings.pre, cycle: 0 });
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

    el.tabButtons.forEach((b) => {
      const on = b.dataset.tab === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    el.breathePanel.hidden = name !== "breathe";
    el.meditatePanel.hidden = name !== "meditate";
  }

  // ---- Meditate tab: recordings (audio) + guided scripts (TTS) ------------
  // One playback at a time. medState tracks whichever is active so switching
  // tabs, starting another, or pressing Stop can cleanly tear it down.
  const medState = { active: false, type: null, audio: null, timer: null, item: null, idx: 0 };

  // Per-recording loop checkboxes, keyed by recording id.
  const loopToggles = {};

  function renderMeditationLists() {
    RECORDINGS.forEach((r) => el.recordingList.appendChild(makeRecordingRow(r)));
    MEDITATIONS.forEach((m) => el.meditationList.appendChild(makeMedItem(m, "tts")));
    // Only meditations without a pre-rendered file fall back to speech synthesis.
    const needsTts = MEDITATIONS.some((m) => !m.file);
    if (needsTts && !ttsSupported) {
      el.medVoiceNote.hidden = true;
      el.medUnsupported.hidden = false;
    }
  }

  // A recording row = the play button plus a loop toggle beside it.
  function makeRecordingRow(rec) {
    const row = document.createElement("div");
    row.className = "med-row";

    const loop = document.createElement("label");
    loop.className = "med-loop";
    loop.title = "Loop this recording";
    loop.innerHTML = '<input type="checkbox"><span aria-hidden="true">🔁</span>';
    const cb = loop.querySelector("input");
    cb.checked = !!loopPrefs[rec.id];
    cb.addEventListener("change", () => {
      // Apply live if this recording is playing, and remember the choice.
      if (medState.type === "audio" && medState.item === rec && medState.audio) {
        medState.audio.loop = cb.checked;
      }
      loopPrefs[rec.id] = cb.checked;
      savePrefs();
    });
    loopToggles[rec.id] = cb;

    row.append(makeMedItem(rec, "audio"), loop);
    return row;
  }

  function makeMedItem(data, type) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "med-item";
    btn.dataset.medId = data.id;
    const mins = data.minutes ? `${data.minutes} min` : "";
    btn.innerHTML =
      '<span class="med-item-icon">▶</span>' +
      '<span class="med-item-text">' +
        '<span class="med-item-name"></span>' +
        '<span class="med-item-desc"></span>' +
      "</span>" +
      '<span class="med-item-time"></span>';
    btn.querySelector(".med-item-name").textContent = data.name;
    btn.querySelector(".med-item-desc").textContent = data.description || "";
    btn.querySelector(".med-item-time").textContent = mins;
    btn.addEventListener("click", () => {
      if (medState.active && medState.item === data) { stopMeditation(); return; }
      // A pre-rendered narration plays as audio; otherwise fall back to TTS.
      if (data.file) playRecording(data);
      else playGuided(data);
    });
    return btn;
  }

  function playRecording(rec) {
    stopMeditation();
    medState.active = true;
    medState.type = "audio";
    medState.item = rec;
    const audio = new Audio(rec.file);
    audio.loop = !!(loopToggles[rec.id] && loopToggles[rec.id].checked);
    medState.audio = audio;
    acquireWakeLock();
    showNowPlaying(rec.name, "");
    markActiveItem(rec.id);
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
    markActiveItem(med.id);
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

  function markActiveItem(id) {
    document.querySelectorAll(".med-item").forEach((b) => {
      b.classList.toggle("playing", b.dataset.medId === id);
    });
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
    markActiveItem(null);
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

    updateDisplay(Math.ceil(step.seconds));
  }

  // Drive the circle to expand on inhale, contract on exhale, and hold size
  // during retains/sustains. Transition time matches the phase length.
  function setCircleScale(key, seconds) {
    let target = el.circle.style.transform;
    if (key === "inhale") target = "scale(1.5)";
    else if (key === "exhale") target = "scale(1)";
    else if (key === "retain") target = "scale(1.5)";
    else if (key === "sustain") target = "scale(1)";
    else if (key === "prep") target = "scale(1)";

    if (key === "inhale" || key === "exhale") {
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
    // with the visible timer.
    if (el.voiceCountdown.checked && remaining > 0 && remaining !== lastSpokenCount) {
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
    isRunning = false;
    el.controlBtn.textContent = "Start";
    setControlsDisabled(false);
    releaseWakeLock();
    showCompletion();
    speak("Session complete");
  }

  function showCompletion() {
    el.circle.className = "breathing-circle";
    el.circle.style.transform = "scale(1)";
    el.instruction.textContent = "Done";
    el.circleCount.textContent = "✓";
    el.progress.textContent = `Cycle ${totalCycles} / ${totalCycles}`;
    el.completion.classList.add("show");
  }

  function stopSession() {
    stopTimers();
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
    el.levelControl.querySelectorAll("button").forEach((b) => (b.disabled = disabled));
  }

  function toggleControl() {
    if (isRunning) stopSession();
    else startSession();
  }

  // Stop any running session and return the UI to its initial, ready state
  // without reloading the page.
  function resetSession() {
    stopTimers();
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
      program: el.program.value,
      level: level,
      voiceOn: el.voiceToggle.checked,
      voiceUri: currentVoiceUri(),
      countdown: el.voiceCountdown.checked,
      rate: el.voiceRate.value,
      volume: el.voiceVolume.value,
      ding: el.dingToggle.checked,
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

    if (prefs.program) el.program.value = prefs.program;
    if (prefs.level) level = prefs.level;
    if (typeof prefs.voiceOn === "boolean") el.voiceToggle.checked = prefs.voiceOn;
    if (typeof prefs.countdown === "boolean") el.voiceCountdown.checked = prefs.countdown;
    if (prefs.rate) el.voiceRate.value = prefs.rate;
    if (prefs.volume) el.voiceVolume.value = prefs.volume;
    if (typeof prefs.ding === "boolean") el.dingToggle.checked = prefs.ding;
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

  // ---- Init --------------------------------------------------------------
  function init() {
    populatePrograms();
    loadPrefs();

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

    // Warm up the speech engine on the very first user interaction (iOS).
    ["pointerdown", "touchstart", "click"].forEach((evt) =>
      window.addEventListener(evt, warmUpVoices, { once: true, passive: true }));

    // Wiring
    el.controlBtn.addEventListener("click", toggleControl);
    el.resetBtn.addEventListener("click", resetSession);
    el.program.addEventListener("change", onProgramChange);

    // Tabs + Meditate
    renderMeditationLists();
    el.tabButtons.forEach((b) =>
      b.addEventListener("click", () => switchTab(b.dataset.tab)));
    el.npStop.addEventListener("click", stopMeditation);
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
     el.repetitions, el.inhaleTime, el.retainTime, el.exhaleTime, el.sustainTime]
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
