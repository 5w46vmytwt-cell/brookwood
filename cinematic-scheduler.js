/**
 * Reusable ESM scheduler; independent of chapter content and server endpoints.
 * getServerState resolves {phase, startedAt, serverNow}; server timestamps and
 * every elapsed/duration value are milliseconds. now() is monotonic, not UTC.
 * Cues {id, at, ...metadata} are one-shots per non-null startedAt run.
 * Normal crossing is previous < at <= current. Reconstruction consumes at < E;
 * at === E is eligible on the next frame, without replaying existing history.
 * start() / sync() resolve true on success, false on failed/obsolete responses.
 * start/stop own one RAF loop; frame() can be driven explicitly without RAF.
 * resyncMs controls frame-driven polling and suspended-frame detection.
 * Consumers can also request sync({hard:true}) on visibility/reconnect events.
 * External pollers may use autoSync:false and acceptState(state, timing).
 */
export const MAX_FORWARD_CORRECTION_MS = 250;
export const MAX_BACKWARD_CORRECTION_MS = 100;
export const HARD_RESYNC_THRESHOLD_MS = 1500;

const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
};
const nonnegative = (value, name) => {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must be nonnegative`);
  return value;
};
const positive = (value, name) => {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
  return value;
};

export class AbsoluteCueScheduler {
  constructor({ getServerState, onElapsed = () => {}, onCue = () => {}, onPhaseChange = () => {},
    onSyncError = () => {}, now = () => globalThis.performance.now(),
    requestFrame = cb => globalThis.requestAnimationFrame(cb),
    cancelFrame = id => globalThis.cancelAnimationFrame(id), resyncMs = 5000, autoSync = true } = {}) {
    if (autoSync && typeof getServerState !== 'function') throw new TypeError('getServerState is required');
    this.autoSync = autoSync;
    this.getServerState = getServerState; this.onElapsed = onElapsed; this.onCue = onCue;
    this.onPhaseChange = onPhaseChange; this.onSyncError = onSyncError;
    this.now = now; this.requestFrame = requestFrame; this.cancelFrame = cancelFrame;
    this.resyncMs = positive(resyncMs, 'resyncMs');
    this.cues = []; this.fired = new Set(); this.startedAt = null; this.phase = null;
    this.anchorElapsed = null; this.anchorNow = 0; this.previous = 0; this.boundary = null;
    this.running = false; this.frameId = null; this.pending = null;
    this.epoch = 0; this.lastSyncAt = -Infinity; this.lastFrameAt = null;
    this.recovering = false; this.pendingHard = false;
  }
  setCues(cues) {
    const ids = new Set();
    const ordered = cues.map((cue, index) => {
      if (typeof cue.id !== 'string' || !cue.id || ids.has(cue.id)) throw new TypeError('Cue IDs must be unique nonempty strings');
      nonnegative(cue.at, 'cue.at'); ids.add(cue.id);
      return { cue: { ...cue }, index };
    }).sort((a,b) => a.cue.at - b.cue.at || a.index - b.index);
    this.cues = ordered.map(entry => entry.cue);
    if (this.anchorElapsed !== null) this.reconstruct(this.elapsedNow());
  }
  elapsedNow() {
    if (this.anchorElapsed === null) return 0;
    return Math.max(0, this.anchorElapsed + finite(this.now(), 'clock') - this.anchorNow);
  }
  reconstruct(elapsed) {
    nonnegative(elapsed, 'elapsed');
    this.anchorElapsed = elapsed; this.anchorNow = finite(this.now(), 'clock');
    // Strict history: a cue exactly at E remains eligible on the next frame.
    // Keeping existing history means backward reconstruction never rearms it.
    for (const cue of this.cues) if (cue.at < elapsed) this.fired.add(cue.id);
    this.previous = elapsed; this.boundary = elapsed;
    this.onElapsed(elapsed, { reconstruct: true });
  }
  frame() {
    if (this.anchorElapsed === null || this.recovering) return;
    const elapsed = this.elapsedNow(), previous = this.previous, boundary = this.boundary;
    this.previous = elapsed; this.boundary = null;
    this.onElapsed(elapsed, { reconstruct: false });
    for (const cue of this.cues) {
      if (this.fired.has(cue.id)) continue;
      if ((previous < cue.at && cue.at <= elapsed) || (cue.at === boundary && cue.at <= elapsed)) {
        this.fired.add(cue.id); // Mark before dispatch, including reentrant callbacks.
        this.onCue(cue, { elapsed, startedAt: this.startedAt });
      }
    }
  }
  sync({ hard = false } = {}) {
    if (this.pending) { this.pendingHard ||= hard; return this.pending; }
    this.pendingHard = hard;
    const epoch = this.epoch, sent = finite(this.now(), 'clock');
    this.lastSyncAt = sent;
    const task = (async () => {
      let state, received;
      try {
        state = await this.getServerState(); received = finite(this.now(), 'clock');
      } catch (error) {
        if (epoch === this.epoch) this.onSyncError(error);
        return false; // A failed request leaves the clock anchor/history intact.
      }
      if (epoch !== this.epoch) return false; // Stopped/restarted while awaiting response.
      return this.acceptState(state, {sentAt:sent, receivedAt:received, hard:this.pendingHard});
    })();
    this.pending = task;
    // Do not let an obsolete request clear a newer run's pending request.
    task.then(() => { if (this.pending === task) this.pending = null; }, () => { if (this.pending === task) this.pending = null; });
    return task;
  }
  // External pollers supply their actual monotonic request/response times.
  // This applies the same correction policy without creating a second poller.
  acceptState(state, {sentAt=this.now(), receivedAt=this.now(), hard=false} = {}) {
      let serverElapsed;
      try {
        finite(sentAt,'sentAt'); finite(receivedAt,'receivedAt');
        if (!state || typeof state.phase !== 'string') throw new TypeError('Invalid server phase');
        finite(state.serverNow,'serverNow');
        if (state.startedAt !== null) positive(state.startedAt,'startedAt');
        serverElapsed = state.startedAt === null ? 0 : Math.max(0, finite(state.serverNow + Math.max(0, receivedAt-sentAt)/2 - state.startedAt,'server elapsed'));
      } catch (error) { this.onSyncError(error); return false; }
      const reconstruct = hard || this.recovering || (!this.autoSync && this.anchorElapsed !== null && receivedAt-this.lastSyncAt>this.resyncMs);
      this.recovering = false; this.lastSyncAt = receivedAt;
      const newRun = state.startedAt !== this.startedAt;
      if (newRun) { this.startedAt = state.startedAt; this.fired.clear(); }
      const oldPhase = this.phase; this.phase = state.phase;
      if (oldPhase !== state.phase) this.onPhaseChange(state.phase, oldPhase, state);
      if (state.startedAt === null) {
        this.anchorElapsed = null; this.previous = 0; this.boundary = null;
        this.onElapsed(0, { reconstruct: true });
        return true;
      }
      const local = this.elapsedNow(), error = serverElapsed - local;
      if (newRun || this.anchorElapsed === null || reconstruct || Math.abs(error) > HARD_RESYNC_THRESHOLD_MS) {
        this.reconstruct(serverElapsed);
      } else {
        const correction = Math.min(MAX_FORWARD_CORRECTION_MS, Math.max(-MAX_BACKWARD_CORRECTION_MS, error));
        this.anchorElapsed = Math.max(0, local + correction); this.anchorNow = receivedAt;
        this.frame();
      }
      return true;
  }
  start() {
    if (this.running) return this.pending || Promise.resolve(true);
    this.running = true; ++this.epoch; this.lastFrameAt = finite(this.now(), 'clock');
    // Supersede any manual sync from an older lifecycle. Until reconstruction
    // returns, a retained old anchor must not emit missed cues on restart.
    this.pending = null; this.recovering = true;
    const epoch = this.epoch;
    this.schedule();
    if (!this.autoSync) { this.recovering = this.anchorElapsed !== null; return Promise.resolve(true); }
    const task = this.sync({ hard: true });
    task.then(() => { if (epoch === this.epoch) this.recovering = false; }, () => { if (epoch === this.epoch) this.recovering = false; });
    return task;
  }
  schedule() {
    if (this.running && this.frameId === null) this.frameId = this.requestFrame(() => this.tick());
  }
  tick() {
    this.frameId = null;
    if (!this.running) return;
    const time = finite(this.now(), 'clock');
    // A suspended RAF loop waits for authoritative reconstruction rather than
    // emitting missed events. Explicit frame() still supports large normal jumps.
    if (this.lastFrameAt !== null && time - this.lastFrameAt > this.resyncMs) {
      this.recovering = true;
      if (this.autoSync) {
      const epoch = this.epoch;
      this.sync({ hard: true }).then(success => {
        if (epoch !== this.epoch) return;
        this.recovering = false;
        // If offline on resume, consume history at the existing interpolated
        // position, without changing the authoritative anchor.
        if (!success && this.anchorElapsed !== null) {
          const elapsed = this.elapsedNow();
          for (const cue of this.cues) if (cue.at < elapsed) this.fired.add(cue.id);
          this.previous = elapsed; this.boundary = elapsed;
          this.onElapsed(elapsed, { reconstruct: true });
        }
      }).catch(error => { if (epoch === this.epoch) { this.recovering = false; this.onSyncError(error); } });
      }
    }
    this.lastFrameAt = time;
    this.frame();
    if (this.autoSync && !this.pending && time - this.lastSyncAt >= this.resyncMs) this.sync().catch(this.onSyncError);
    this.schedule();
  }
  stop() {
    this.running = false; ++this.epoch;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null; this.pending = null; this.recovering = false; this.lastFrameAt = null;
  }
}

// Pure helpers use milliseconds, never DOM/audio/clock access.
export function resolveAutomationValue(elapsed, segments, fallback) {
  finite(elapsed, 'elapsed'); finite(fallback, 'fallback');
  let value = fallback;
  const ordered = segments.map((segment,index) => ({segment,index})).sort((a,b) => a.segment.at-b.segment.at || a.index-b.index);
  for (const {segment:s} of ordered) {
    nonnegative(s.at,'segment.at'); positive(s.duration,'segment.duration'); finite(s.from,'segment.from'); finite(s.to,'segment.to');
    if (s.curve && s.curve !== 'linear') throw new TypeError('Unsupported automation curve');
    if (elapsed < s.at) break;
    const progress = Math.min(1, Math.max(0, (elapsed-s.at)/s.duration));
    value = s.from + (s.to-s.from)*progress;
  }
  return value;
}
export function classifyFiniteCue(elapsed, start, duration) {
  finite(elapsed,'elapsed'); nonnegative(start,'start'); positive(duration,'duration');
  return elapsed < start ? 'future' : elapsed < start+duration ? 'active' : 'expired';
}
export function finiteCueOffset(elapsed, start, duration) {
  return classifyFiniteCue(elapsed,start,duration) === 'active' ? elapsed-start : null;
}
export function resolveLoopOffset(elapsed, start, duration) {
  finite(elapsed,'elapsed'); nonnegative(start,'start'); positive(duration,'duration');
  return elapsed < start ? 0 : (elapsed-start)%duration;
}
