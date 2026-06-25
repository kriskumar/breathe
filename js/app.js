/* Breathing Timer — engine, voice guidance, and persistence. */

(function () {
  "use strict";

  // ---- DOM ---------------------------------------------------------------
  const el = {
    program: document.getElementById("program"),
    description: document.getElementById("programDescription"),
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
    aumBtn: document.getElementById("aumBtn"),
    voiceToggle: document.getElementById("voiceToggle"),
    voiceSettings: document.getElementById("voiceSettings"),
    voiceSelect: document.getElementById("voiceSelect"),
    voiceCountdown: document.getElementById("voiceCountdown"),
    voiceRate: document.getElementById("voiceRate"),
    voiceVolume: document.getElementById("voiceVolume"),
    dingToggle: document.getElementById("dingToggle"),
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
  let aumAudio = null;    // ~59s Aum chant played via the manual Aum button

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

  function loadVoices() {
    if (!ttsSupported) return;
    const list = window.speechSynthesis.getVoices();
    if (!list.length) {
      // iOS may not expose named voices yet; show a default so it's not blank.
      if (!el.voiceSelect.options.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "System default voice";
        el.voiceSelect.appendChild(opt);
      }
      return;                            // a later poll/event will fill real voices
    }
    voices = list;
    const saved = el.voiceSelect.value || el.voiceSelect.dataset.pending;
    el.voiceSelect.innerHTML = "";
    voices.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${v.name} (${v.lang})`;
      el.voiceSelect.appendChild(opt);
    });
    if (saved && voices[saved]) el.voiceSelect.value = saved;
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
    } else {
      document.body.classList.remove("custom-mode");
      el.description.textContent = program.description;
    }
    savePrefs();
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

    stopAum();  // cancel a closing Aum from a previous session if still playing
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

  // ---- Aum chant (manual, standalone) ------------------------------------
  // A dedicated button plays/stops the ~59s Aum independently of the breathing
  // session, so the audio never queues against the spoken cues.
  let aumPlaying = false;

  function toggleAum() {
    if (aumPlaying) { stopAum(); return; }
    if (!aumAudio) aumAudio = new Audio("mp3/aum.mp3");
    aumAudio.currentTime = 0;
    aumPlaying = true;
    updateAumButton();
    if (!isRunning) acquireWakeLock();   // keep the screen on for the chant
    aumAudio.onended = endAum;
    const played = aumAudio.play();
    if (played && played.catch) played.catch(endAum);
  }

  function stopAum() {
    if (aumAudio) {
      aumAudio.onended = null;
      aumAudio.pause();
    }
    endAum();
  }

  function endAum() {
    aumPlaying = false;
    updateAumButton();
    if (!isRunning) releaseWakeLock();
  }

  function updateAumButton() {
    if (!el.aumBtn) return;
    el.aumBtn.textContent = aumPlaying ? "⏹ Stop Aum" : "🕉️ Aum";
    el.aumBtn.classList.toggle("playing", aumPlaying);
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
    stopAum();
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
    stopAum();
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
      voiceIndex: el.voiceSelect.value,
      countdown: el.voiceCountdown.checked,
      rate: el.voiceRate.value,
      volume: el.voiceVolume.value,
      ding: el.dingToggle.checked,
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
    if (prefs.voiceIndex) el.voiceSelect.dataset.pending = prefs.voiceIndex;
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
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
        const pending = el.voiceSelect.dataset.pending;
        if (pending && voices[pending]) el.voiceSelect.value = pending;
      };
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
    el.aumBtn.addEventListener("click", toggleAum);
    el.program.addEventListener("change", onProgramChange);
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

    // iOS releases the wake lock when the tab is hidden; re-acquire it when the
    // user returns mid-session.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && isRunning && !wakeLock) {
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
