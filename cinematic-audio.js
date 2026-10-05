/* Persistent score and synchronized cues; the visual resolver stays pure. */
(() => {
  const NARRATION_VOLUME = 1;
  const tvSoundtrack = { src: '/assets/chapter1/audio/brookwood-background.wav', lobbyVolume: .18,
    fadeMs: 350, duckMs: 200 };
  class Soundtrack {
    constructor(config) {
      this.config = config; this.target = 0; this.ramp = null; this.pending = false;
      this.attempted = false; this.unavailable = false;
      try {
        this.audio = new Audio(config.src); this.audio.preload = 'auto';
        this.audio.loop = true; this.audio.volume = 0;
        this.audio.addEventListener('error', () => {
          this.unavailable = true; console.warn('Brookwood soundtrack unavailable');
        });
        this.audio.load();
      } catch (error) { this.unavailable = true; console.warn('Brookwood soundtrack preload failed', error); }
    }
    start(gesture = false) {
      if (this.unavailable || this.pending || !this.audio.paused || (this.attempted && !gesture)) return;
      this.attempted = true; this.pending = true;
      // A blocked first attempt may have finished its ramp silently. Fade in
      // when permission arrives, without seeking the persistent musical clock.
      this.audio.volume = 0;
      this.ramp = { at: Date.now(), from: 0, to: this.target, duration: this.config.fadeMs };
      try {
        Promise.resolve(this.audio.play()).catch(error => {
          this.audio.pause();
          console.warn('Brookwood soundtrack playback blocked or failed; retry on interaction', error);
        }).finally(() => { this.pending = false; });
      } catch (error) { this.pending = false; console.warn('Brookwood soundtrack playback failed', error); }
    }
    setTarget(target) {
      if (!this.audio || this.unavailable || target === this.target) return;
      this.advance(); this.target = target;
      this.ramp = { at: Date.now(), from: this.audio.volume, to: target,
        duration: target < this.audio.volume ? this.config.duckMs : this.config.fadeMs };
    }
    advance() {
      if (!this.ramp) return;
      const progress = Math.min(1, Math.max(0, (Date.now() - this.ramp.at) / this.ramp.duration));
      this.audio.volume = this.ramp.from + (this.ramp.to - this.ramp.from) * progress;
      if (progress === 1) this.ramp = null;
    }
  }
  class Player {
    constructor(timeline, options = {}) {
      this.timeline = timeline;
      this.cues = timeline.cues.filter(c => c.type === 'narration');
      this.sfxCues = timeline.cues.filter(c => c.type === 'sfx');
      this.activeSfx = new Map();
      this.soundtrack = options.soundtrack ? new Soundtrack(options.soundtrack) : null;
      this.media = new Map(); this.unavailable = new Set(); this.handled = new Set();
      this.startedAt = null; this.raf = null; this.active = null; this.run = 0;
      for (const cue of [...this.cues, ...this.sfxCues]) {
        try {
          const audio = new Audio(cue.src);
          audio.preload = 'auto'; audio.volume = cue.type === 'narration' ? NARRATION_VOLUME : cue.volume;
          audio.addEventListener('loadedmetadata', () => this.sync());
          audio.addEventListener('canplay', () => this.sync());
          audio.addEventListener('error', () => {
            this.unavailable.add(cue.id);
            console.warn(`Audio asset unavailable: ${cue.id}`);
          });
          this.media.set(cue.id, audio); audio.load();
        } catch (error) {
          this.unavailable.add(cue.id);
          console.warn(`Audio preload failed: ${cue.id}`, error);
        }
      }
    }
    unlock() {
      // Called synchronously by the host's Start click, before its API await.
      this.unlockBackground();
      for (const [id, audio] of this.media) {
        if (this.unavailable.has(id)) continue;
        try {
          audio.muted = true;
          const promise = audio.play();
          audio.pause(); audio.muted = false;
          Promise.resolve(promise).catch(error => {
            // Pausing a priming attempt normally rejects with AbortError.
            if (error?.name !== 'AbortError') console.warn(`Narration priming blocked: ${id}`, error);
          });
        } catch (error) { audio.muted = false; console.warn(`Narration priming failed: ${id}`, error); }
      }
    }
    unlockBackground() { this.soundtrack?.start(true); this.schedule(); }
    update(state) {
      const startedAt = Number(state.startedAt);
      if (state.phase !== 'opening' || !Number.isFinite(startedAt) || startedAt <= 0) {
        this.stop(); this.mixScore(); this.schedule(); return;
      }
      if (this.startedAt !== startedAt) { this.stop(); this.startedAt = startedAt; }
      this.sync();
      this.schedule();
    }
    schedule() { if (this.raf === null && this.needsFrame()) this.raf = requestAnimationFrame(() => this.tick()); }
    needsFrame() {
      return Boolean(this.soundtrack?.ramp) || (this.startedAt !== null && Date.now() - this.startedAt < Math.max(0, ...[...this.cues, ...this.sfxCues].map(c => c.at + c.durationMs)));
    }
    sync() {
      if (this.startedAt === null) return;
      const elapsed = Date.now() - this.startedAt;
      // Pause the previous clip before any new clip starts: no late-load overlap.
      if (this.active && elapsed >= this.active.cue.at + this.active.cue.durationMs) {
        this.active.audio.pause(); this.active = null;
      }
      for (const cue of this.cues) {
        if (this.handled.has(cue.id) || elapsed < cue.at) continue;
        if (elapsed >= cue.at + cue.durationMs || this.unavailable.has(cue.id)) { this.handled.add(cue.id); continue; }
        const audio = this.media.get(cue.id);
        if (!audio || audio.readyState < 1) continue; // Seek from the live clock when loaded.
        this.handled.add(cue.id); // Includes pending/rejected play promises; never retry per frame.
        const run = this.run;
        try {
          if (this.active) this.active.audio.pause();
          audio.currentTime = (elapsed - cue.at) / 1000;
          this.active = { cue, audio };
          Promise.resolve(audio.play()).then(() => {
            // A delayed load/play must not move subsequent cues later.
            if (run !== this.run || this.active?.cue.id !== cue.id) return;
            const offset = (Date.now() - this.startedAt - cue.at) / 1000;
            if (offset >= cue.durationMs / 1000) { audio.pause(); this.active = null; }
            else if (Math.abs(audio.currentTime - offset) > .1) audio.currentTime = offset;
          }).catch(error => {
            console.warn(`Narration playback blocked or failed: ${cue.id}`, error);
            if (run === this.run && this.active?.cue.id === cue.id) { audio.pause(); this.active = null; }
          });
        } catch (error) { console.warn(`Narration seek/play failed: ${cue.id}`, error); audio.pause(); this.active = null; }
      }
      this.syncSfx(elapsed);
      this.mixScore(elapsed);
    }
    syncSfx(elapsed) {
      for (const [id, entry] of this.activeSfx) {
        if (elapsed >= entry.cue.at + entry.cue.durationMs) { entry.audio.pause(); this.activeSfx.delete(id); }
      }
      for (const cue of this.sfxCues) {
        if (this.handled.has(cue.id) || elapsed < cue.at) continue;
        if (elapsed >= cue.at + cue.durationMs || this.unavailable.has(cue.id)) { this.handled.add(cue.id); continue; }
        const audio = this.media.get(cue.id);
        if (!audio || audio.readyState < 1) continue;
        this.handled.add(cue.id);
        const run = this.run;
        try {
          audio.currentTime = (elapsed - cue.at) / 1000;
          this.activeSfx.set(cue.id, { cue, audio });
          Promise.resolve(audio.play()).then(() => {
            if (run !== this.run || !this.activeSfx.has(cue.id)) return;
            const offset = (Date.now() - this.startedAt - cue.at) / 1000;
            if (offset >= cue.durationMs / 1000) { audio.pause(); this.activeSfx.delete(cue.id); }
            else if (Math.abs(audio.currentTime - offset) > .1) audio.currentTime = offset;
          }).catch(error => {
            console.warn(`SFX playback blocked or failed: ${cue.id}`, error);
            if (run === this.run && this.activeSfx.has(cue.id)) { audio.pause(); this.activeSfx.delete(cue.id); }
          });
        } catch (error) { console.warn(`SFX seek/play failed: ${cue.id}`, error); audio.pause(); this.activeSfx.delete(cue.id); }
      }
    }
    mixScore(elapsed = null) {
      if (!this.soundtrack) return;
      const mix = this.timeline.scoreMix;
      let target = this.soundtrack.config.lobbyVolume;
      if (this.startedAt !== null && mix) {
        const window = mix.windows?.find(w => elapsed >= w.at && elapsed < w.end);
        target = window ? window.volume : this.active && !this.active.audio.paused ? mix.narrationVolume :
          elapsed < Math.min(...this.cues.map(c => c.at)) ? mix.openingVolume : mix.gapVolume;
      }
      this.soundtrack.start(); this.soundtrack.setTarget(target); this.soundtrack.advance();
    }
    tick() { this.raf = null; if (this.startedAt !== null) this.sync(); else this.mixScore(); this.schedule(); }
    stop() {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      for (const audio of this.media.values()) { try { audio.pause(); } catch {} }
      this.raf = null; this.startedAt = null; this.active = null; this.handled.clear(); ++this.run;
      this.activeSfx.clear(); // The persistent soundtrack is never paused or rewound here.
    }
  }
  globalThis.BrookwoodAudio = { Player, NARRATION_VOLUME, tvSoundtrack };
})();
