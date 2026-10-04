/* TV only. Every visual is a function of the server's startedAt, not page load. */
(() => {
  const clamp = value => Math.max(0, Math.min(1, value));
  const fade = (t, start, end) => clamp((t - start) / (end - start));
  const hold = (t, enter, entered, leave, left) => fade(t, enter, entered) * (1 - fade(t, leave, left));
  function frameAt(elapsed) {
    const t = elapsed - 4;
    return {
      chapterTime: t,
      title: elapsed >= 0 && elapsed < 4 ? 1 - fade(elapsed, 3.4, 4) : 0,
      date: hold(t, 2, 3, 8, 9) * (t >= 5 && t < 8 ? .985 + .015 * Math.sin(t * 23) : 1),
      farm: hold(t, 8, 10, 19, 20.2),
      farmScale: 1 + .055 * clamp((t - 8) / 12.2),
      farmLabel: hold(t, 12, 13, 19, 20),
      poster: hold(t, 19, 20.2, 24, 25),
      time: hold(t, 24, 25, 29, 32),
      friends: hold(t, 27, 28, 29, 32),
      flash: t >= 32 && t < 32.12 ? 1 : 0,
      group: t >= 32.12 && t < 40 ? (1 - .55 * fade(t, 35, 38)) * (1 - fade(t, 38, 39)) : 0,
      final: hold(t, 38.7, 39.2, 39.5, 40),
      done: t >= 40
    };
  }

  // One future narration file, plus optional effects. Audio never drives the clock.
  class Soundtrack {
    constructor() { this.context = null; this.buffers = new Map(); this.sources = new Map(); this.loading = false; this.lastTime = null; }
    unlock() {
      try {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return;
        this.context ||= new AudioContext();
        this.context.resume().catch(() => {});
        this.load();
      } catch { /* Unsupported or blocked audio leaves a silent cinematic. */ }
    }
    load() {
      if (this.loading || !this.context) return;
      this.loading = true;
      for (const name of ['narration', 'wind', 'creak', 'shutter', 'impact']) {
        fetch(`/assets/chapter1/${name}.mp3`, { signal: AbortSignal.timeout(8000) })
          .then(r => { if (!r.ok) throw new Error('Optional audio unavailable'); return r.arrayBuffer(); })
          .then(data => this.context.decodeAudioData(data))
          .then(buffer => this.buffers.set(name, buffer))
          .catch(() => {});
      }
    }
    play(name, offset = 0, loop = false, volume = 1) {
      if (!this.context || this.context.state !== 'running' || this.sources.has(name)) return;
      const buffer = this.buffers.get(name);
      if (!buffer || (!loop && offset >= buffer.duration)) return;
      try {
        const source = this.context.createBufferSource(), gain = this.context.createGain();
        source.buffer = buffer; source.loop = loop; gain.gain.value = volume;
        source.connect(gain); gain.connect(this.context.destination);
        source.start(0, loop ? offset % buffer.duration : Math.max(0, offset));
        this.sources.set(name, source);
      } catch { /* Missing media, seek, and playback failures are nonfatal. */ }
    }
    sync(t) {
      if (t < 0) return;
      if (t >= 40) { this.stop(); return; }
      this.play('narration', t);
      this.play('wind', t, true, .12);
      // One-shot effects occur only on crossing a cue, never on a late reload.
      if (this.lastTime !== null) for (const [name, cue] of [['creak', 15], ['shutter', 32], ['impact', 38]]) {
        if (this.lastTime < cue && t >= cue && t - cue < .25) this.play(name);
      }
      this.lastTime = t;
    }
    stop() {
      for (const source of this.sources.values()) { try { source.stop(); source.disconnect(); } catch {} }
      this.sources.clear(); this.lastTime = null;
    }
  }

  class Cinematic {
    constructor(document) {
      this.document = document; this.startedAt = null; this.raf = null; this.audio = new Soundtrack();
      for (const id of ['chapterFarm', 'chapterPoster', 'chapterGroup']) {
        const image = document.getElementById(id);
        image.addEventListener('error', event => { event.target.style.visibility = 'hidden'; });
        // The image request can finish before this script's constructor runs.
        if (image.complete && image.naturalWidth === 0) image.style.visibility = 'hidden';
      }
    }
    unlockAudio() { this.audio.unlock(); }
    update(state) {
      const startedAt = Number(state.startedAt);
      if (state.phase !== 'opening' || !Number.isFinite(startedAt) || startedAt <= 0) { this.stop(); return; }
      if (this.startedAt !== startedAt) { this.stop(); this.startedAt = startedAt; this.audio.unlock(); }
      this.paint();
      if (this.raf === null && Date.now() - startedAt < 44000) this.raf = requestAnimationFrame(() => this.tick());
    }
    tick() {
      this.raf = null;
      if (this.startedAt === null) return;
      const frame = this.paint();
      if (!frame.done) this.raf = requestAnimationFrame(() => this.tick());
    }
    paint() {
      const frame = frameAt((Date.now() - this.startedAt) / 1000);
      const d = this.document;
      const layers = { openingTitle: 'title', chapterDate: 'date', chapterFarm: 'farm', chapterFarmLabel: 'farmLabel', chapterPoster: 'poster', chapterTime: 'time', chapterFriends: 'friends', chapterFlash: 'flash', chapterGroup: 'group', chapterFinal: 'final' };
      for (const [id, field] of Object.entries(layers)) d.getElementById(id).style.opacity = frame[field];
      d.getElementById('chapterFarm').style.transform = `scale(${frame.farmScale})`;
      d.getElementById('chapterGrain').style.opacity = frame.chapterTime >= 0 && !frame.done ? .025 : 0;
      this.audio.sync(frame.chapterTime);
      return frame;
    }
    stop() {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      this.raf = null; this.startedAt = null; this.audio.stop();
    }
  }
  globalThis.BrookwoodChapter1 = { frameAt, Cinematic, Soundtrack };
})();
