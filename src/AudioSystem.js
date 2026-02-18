// ── Audio System ────────────────────────────────────────────────
// Elevator music (bossa nova-style) via Web Audio API — no SFX.
// Gentle melodic loop with chord pad + melody line, toggleable.

export function createAudio() {
  let ctx = null;
  let started = false;
  let muted = false;
  let musicOn = false;

  let masterGain;

  // Chord pad (4 sine oscs per chord → lowpass → reverb-ish delay → gain)
  let padOscs = [];
  let padFilter, padGain;

  // Melody (single sine osc → lowpass → gain)
  let melodyOsc, melodyFilter, melodyGain;

  // Bass line (triangle osc → lowpass → gain)
  let bassOsc, bassFilter, bassGain;

  // Timing
  let beatTimer = 0;
  let beatIndex = 0;
  let chordIndex = 0;
  const BPM = 110;
  const BEAT_DUR = 60 / BPM;

  // ── Chord progression: Cmaj7 → Am7 → Dm7 → G7 (classic bossa) ──
  const CHORDS = [
    [130.81, 164.81, 196.0, 246.94],  // Cmaj7 (C3 E3 G3 B3)
    [110.0, 130.81, 164.81, 196.0],   // Am7   (A2 C3 E3 G3)
    [146.83, 174.61, 220.0, 261.63],  // Dm7   (D3 F3 A3 C4)
    [98.0, 123.47, 146.83, 174.61],   // G7    (G2 B2 D3 F3)
  ];

  // ── Melody notes (pentatonic-ish, one per beat, 16-beat loop) ──
  const MELODY = [
    523.25, 0, 493.88, 440.0,     // C5, rest, B4, A4
    392.0, 0, 440.0, 523.25,      // G4, rest, A4, C5
    587.33, 0, 523.25, 493.88,    // D5, rest, C5, B4
    440.0, 392.0, 0, 349.23,      // A4, G4, rest, F4
  ];

  // ── Bass notes (root of each chord, one per 4 beats) ──
  const BASS = [65.41, 55.0, 73.42, 49.0]; // C2, A1, D2, G1

  function init() {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }

    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    // ════════════════════════════════════════════════════════
    // PAD — 4 sine oscs → lowpass → gain (warm chord bed)
    // ════════════════════════════════════════════════════════
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 600;
    padFilter.Q.value = 0.3;

    padGain = ctx.createGain();
    padGain.gain.value = 0;
    padFilter.connect(padGain);
    padGain.connect(masterGain);

    const chord = CHORDS[0];
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = chord[i];
      osc.connect(padFilter);
      osc.start();
      padOscs.push(osc);
    }

    // ════════════════════════════════════════════════════════
    // MELODY — single sine osc → lowpass → gain
    // ════════════════════════════════════════════════════════
    melodyOsc = ctx.createOscillator();
    melodyOsc.type = 'sine';
    melodyOsc.frequency.value = 523.25;

    melodyFilter = ctx.createBiquadFilter();
    melodyFilter.type = 'lowpass';
    melodyFilter.frequency.value = 1200;
    melodyFilter.Q.value = 0.5;

    melodyGain = ctx.createGain();
    melodyGain.gain.value = 0;

    melodyOsc.connect(melodyFilter);
    melodyFilter.connect(melodyGain);
    melodyGain.connect(masterGain);
    melodyOsc.start();

    // ════════════════════════════════════════════════════════
    // BASS — triangle osc → lowpass → gain
    // ════════════════════════════════════════════════════════
    bassOsc = ctx.createOscillator();
    bassOsc.type = 'triangle';
    bassOsc.frequency.value = 65.41;

    bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 200;
    bassFilter.Q.value = 0.5;

    bassGain = ctx.createGain();
    bassGain.gain.value = 0;

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(masterGain);
    bassOsc.start();

    beatTimer = 0;
    beatIndex = 0;
    chordIndex = 0;
    started = true;
  }

  function resume() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function advanceBeat() {
    if (!ctx || !musicOn) return;
    const t = ctx.currentTime;

    // ── Melody note ──
    const note = MELODY[beatIndex % MELODY.length];
    if (note === 0) {
      // rest — fade out
      melodyGain.gain.setTargetAtTime(0, t, 0.05);
    } else {
      melodyOsc.frequency.setTargetAtTime(note, t, 0.02);
      melodyGain.gain.setTargetAtTime(0.07, t, 0.02);
      // gentle decay
      melodyGain.gain.setTargetAtTime(0.03, t + BEAT_DUR * 0.6, 0.08);
    }

    // ── Chord change every 4 beats ──
    if (beatIndex % 4 === 0) {
      chordIndex = Math.floor(beatIndex / 4) % CHORDS.length;
      const chord = CHORDS[chordIndex];
      for (let i = 0; i < padOscs.length; i++) {
        padOscs[i].frequency.setTargetAtTime(chord[i], t, 0.3);
      }
      // Bass note
      const bassNote = BASS[chordIndex];
      bassOsc.frequency.setTargetAtTime(bassNote, t, 0.08);
      bassGain.gain.setTargetAtTime(0.06, t, 0.02);
      bassGain.gain.setTargetAtTime(0.025, t + BEAT_DUR * 0.5, 0.15);
    }

    beatIndex = (beatIndex + 1) % 16;
  }

  return {
    get started() { return started; },
    get muted() { return muted; },
    get musicOn() { return musicOn; },
    init,
    resume,

    toggleMute() {
      muted = !muted;
      if (masterGain) masterGain.gain.value = muted ? 0 : 1;
      return muted;
    },

    toggleMusic() {
      musicOn = !musicOn;
      if (ctx) {
        const t = ctx.currentTime;
        const vol = musicOn ? 0.06 : 0;
        if (padGain) padGain.gain.setTargetAtTime(vol, t, 0.3);
        if (melodyGain) melodyGain.gain.setTargetAtTime(musicOn ? 0.05 : 0, t, 0.3);
        if (bassGain) bassGain.gain.setTargetAtTime(musicOn ? 0.04 : 0, t, 0.3);
        if (!musicOn) beatIndex = 0;
      }
      return musicOn;
    },

    // No-op stubs (SFX removed)
    playCrash() {},

    update() {
      if (!started || !ctx || !musicOn) return;

      // Advance beats based on frame timing
      beatTimer += 1 / 60;
      if (beatTimer >= BEAT_DUR) {
        beatTimer -= BEAT_DUR;
        advanceBeat();
      }
    },

    dispose() {
      if (ctx) {
        try { ctx.close(); } catch {}
      }
    },
  };
}
