// ── Audio System ────────────────────────────────────────────────
// Background music via phonk.mp3 — no procedural audio.
import phonkSrc from './assets/phonk.mp3';

export function createAudio() {
  let audio = null;
  let started = false;
  let muted = false;
  let musicOn = false;

  function init() {
    if (started) return;
    audio = new Audio(phonkSrc);
    audio.loop = true;
    audio.volume = 0.5;
    started = true;
  }

  function resume() {
    if (!audio) init();
    if (audio) {
      audio.play().catch(() => {});
    }
  }

  return {
    get started() { return started; },
    get muted() { return muted; },
    get musicOn() { return musicOn; },
    init,
    resume,

    toggleMute() {
      muted = !muted;
      if (audio) audio.muted = muted;
      return muted;
    },

    toggleMusic() {
      musicOn = !musicOn;
      if (audio) {
        if (musicOn) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }
      return musicOn;
    },

    playCrash() {},

    update() {},

    dispose() {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio = null;
      }
    },
  };
}
