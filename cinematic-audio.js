/* Narration only. The pure visual resolver has no playback side effects. */
(() => {
  const NARRATION_VOLUME = 1;
  class Player {
    constructor(timeline) {
      this.cues = timeline.cues.filter(c => c.type === 'narration');
      this.media = new Map(); this.unavailable = new Set(); this.handled = new Set();
      this.startedAt = null; this.raf = null; this.active = null; this.run = 0;
      for (const cue of this.cues) {
        try {
          const audio = new Audio(cue.src);
          audio.preload = 'auto'; audio.volume = NARRATION_VOLUME;
          audio.addEventListener('loadedmetadata', () => this.sync());
          audio.addEventListener('canplay', () => this.sync());
          audio.addEventListener('error', () => {
            this.unavailable.add(cue.id);
            console.warn(`Narration asset unavailable: ${cue.id}`);
          });
          this.media.set(cue.id, audio); audio.load();
        } catch (error) {
          this.unavailable.add(cue.id);
          console.warn(`Narration preload failed: ${cue.id}`, error);
        }
      }
    }
    unlock() {
      // Called synchronously by the host's Start click, before its API await.
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
    update(state) {
      const startedAt = Number(state.startedAt);
      if (state.phase !== 'opening' || !Number.isFinite(startedAt) || startedAt <= 0) { this.stop(); return; }
      if (this.startedAt !== startedAt) { this.stop(); this.startedAt = startedAt; }
      this.sync();
      if (this.raf === null && this.needsFrame()) this.raf = requestAnimationFrame(() => this.tick());
    }
    needsFrame() {
      return this.startedAt !== null && Date.now() - this.startedAt < Math.max(0, ...this.cues.map(c => c.at + c.durationMs));
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
    }
    tick() { this.raf = null; this.sync(); if (this.needsFrame()) this.raf = requestAnimationFrame(() => this.tick()); }
    stop() {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      for (const audio of this.media.values()) { try { audio.pause(); } catch {} }
      this.raf = null; this.startedAt = null; this.active = null; this.handled.clear(); ++this.run;
    }
  }
  globalThis.BrookwoodAudio = { Player, NARRATION_VOLUME };
})();
