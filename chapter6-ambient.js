// Chapter-scoped adapter around the existing cinematic Player's persistent score.
// Its gain ramp advances on the TV's existing scheduler; no extra clock or poller.
export class MazeAmbient{
 constructor(soundtrack){this.track=soundtrack;this.enabled=false;this.active=false;this.stopping=false;}
 update(c,narration){
  if(!this.track)return;
  if(c.step==='complete'){this.stop();return;}
  this.active=c.step!=='takeover';if(!this.active)return;
  this.stopping=false;
  const speaking=!!narration&&!narration.ended&&!narration.audio.paused;
  if(speaking)this.enabled=true;
  this.track.setTarget(speaking?.05:.12);
  if(this.enabled)this.track.start();this.advance();
 }
 unlock(){this.enabled=true;if(this.active)this.track?.start(true);}
 stop(immediate=false){if(!this.track)return;if(immediate){this.active=false;this.enabled=false;this.stopping=false;this.track.target=0;this.track.ramp=null;if(this.track.audio){this.track.audio.volume=0;this.track.audio.pause();}return;}if(this.stopping||(!this.active&&this.track.target===0&&this.track.audio?.paused))return;this.active=false;this.stopping=true;this.track.setTarget(0);this.advance();}
 advance(){if(!this.track)return;this.track.advance();if(this.stopping&&!this.track.ramp){this.track.audio?.pause();this.enabled=false;this.stopping=false;}}
}
