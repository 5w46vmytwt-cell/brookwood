// Chapter-scoped adapter around the existing cinematic Player's persistent score.
// Its gain ramp advances on the TV's existing scheduler; no extra clock or poller.
export class MazeAmbient{
 constructor(soundtrack){this.track=soundtrack;this.enabled=false;this.active=false;this.stopping=false;}
 update(c,narration){
  if(!this.track)return;

  if(c.pacingVersion===1)this.enabled=true;
  this.active=c.pacingVersion===1||c.step!=='takeover'||this.active;if(!this.active)return;
  this.stopping=false;
  const speaking=!!narration&&!narration.ended&&!narration.audio.paused;
  if(speaking)this.enabled=true;
  this.track.setTarget(speaking?.05:.12);
  if(this.enabled)this.track.start();this.advance();
 }
 updateCast(state,elapsed,startAt,narration){
  if(!this.track)return;const c=state.chapter5,run=c.startedAt+':'+c.castStartedAt;
  if(this.castRun!==run){this.stop(true);this.castRun=run;}
  if(c.castStartedAt===null||elapsed<c.castStartedAt-c.startedAt+startAt)return;
  this.enabled=true;this.update({step:'cast-transition'},narration);
 }
 needsUnlock(){return this.active&&this.track?.attempted&&!this.track.pending&&!this.track.unavailable&&this.track.audio?.paused;}
 unlock(){this.enabled=true;if(this.active)this.track?.start(true);}
 stop(immediate=false){if(!this.track)return;if(immediate){this.castRun=null;this.track.cancel?.();this.active=false;this.enabled=false;this.stopping=false;this.track.target=0;this.track.ramp=null;if(this.track.audio){this.track.audio.volume=0;this.track.audio.pause();}return;}if(this.stopping||(!this.active&&this.track.target===0&&this.track.audio?.paused))return;this.active=false;this.stopping=true;this.track.setTarget(0);this.advance();}
 advance(){if(!this.track)return;this.track.advance();if(this.stopping&&!this.track.ramp){this.track.audio?.pause();this.enabled=false;this.stopping=false;}}
}
