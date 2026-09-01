/*
 * Tiny synthesised sound effects, shared by every game.
 *
 * No audio files: everything is generated with the Web Audio API, so there's
 * nothing extra to download and nothing to host. Browsers block audio until
 * the user has interacted with the page, so the context is created lazily —
 * by the time anything plays, they've clicked START.
 */

const Sound = (function () {
  /* A pentatonic run, so a long chain climbs without ever sounding wrong. */
  const CHAIN_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  let ctx = null;
  let muted = Prefs.read('muted', false);

  function audio() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    /* Safari and Chrome can hand back a suspended context. */
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /**
   * @param {number} freq     Hz
   * @param {number} duration seconds
   * @param {number} [volume] 0-1
   * @param {string} [type]   oscillator waveform
   * @param {number} [delay]  seconds to wait before playing
   */
  function tone(freq, duration, volume = 0.14, type = 'sine', delay = 0) {
    if (muted) return;
    const a = audio();
    if (!a) return;

    const at = a.currentTime + delay;
    const osc = a.createOscillator();
    const gain = a.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);

    /* Quick attack, exponential decay — a soft blip rather than a beep. */
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  return {
    /** Rises with each link, so a long chain is audibly a bigger deal. */
    chain(link) {
      const note = CHAIN_NOTES[Math.min(link - 1, CHAIN_NOTES.length - 1)];
      tone(note, 0.18, 0.14);
      if (link >= 3) tone(note * 1.5, 0.22, 0.08, 'triangle', 0.05);
    },

    place() { tone(196, 0.07, 0.05, 'triangle'); },

    gameOver() {
      tone(392, 0.16, 0.10, 'sine', 0);
      tone(311, 0.16, 0.10, 'sine', 0.13);
      tone(233, 0.34, 0.10, 'sine', 0.26);
    },

    isMuted() { return muted; },

    setMuted(value) {
      muted = value;
      Prefs.write('muted', muted);
    },
  };
})();
