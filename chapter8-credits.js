import {smooth} from './chapter8-puzzle.js';
import {FINAL_SONG_VOLUME} from './chapter8-ending.js';

export const creditPhotos=Object.freeze([
 [1,1671,941],[2,1671,941],[3,1672,941],[4,1671,941],[5,1536,1024],
 [6,1669,942],[7,1669,942],[8,1672,941],[9,1669,942]
].map(([number,width,height])=>Object.freeze({number,width,height,src:'/assets/chapter8/final'+number+'.png'})));
export const CREDITS_INTRO_MS=5500,PHOTO_MS=11000,MUSIC_OUT_MS=2500;
export const SHUTDOWN_SRC='/assets/chapter8/shutdown.mp4';
export const SHUTDOWN_MS=5258.34375;
export function creditFrame(cue,elapsed,{width=1920,height=1080,armed=true,reduced=false}={}){
 const t=Math.max(0,elapsed),photo=creditPhotos.find(p=>p.number===cue.photo);
 if(!photo)return {opacity:armed?smooth(t/500)*(1-smooth((t-4500)/1000)):0};
 const holdEnd=cue.durationMs-1100;
 const enter=smooth(t/900),exit=smooth((t-holdEnd)/900),angle=(photo.number%2?-2.4:2.4)+(reduced?0:.5*(1-enter));
 const a=3*Math.PI/180,ratio=photo.width/photo.height,pad=Math.max(5,Math.min(11,width*.0055));
 const frameWidth=Math.min(width*.88/(Math.cos(a)+Math.sin(a)/ratio),height*.88/(Math.sin(a)+Math.cos(a)/ratio))/1.025;
 return {width:frameWidth,padding:pad,opacity:armed?enter*(1-exit):0,
  x:reduced?0:18*(1-enter)+(photo.number%2?-24:24)*exit,
  y:reduced?0:22*(1-enter)-3*Math.sin(enter*Math.PI),angle,
  scale:reduced?1:.985+.035*smooth(t/holdEnd)};
}
export const creditsVolume=(cue,elapsed)=>FINAL_SONG_VOLUME*(cue.id==='credits-music-out'?1-smooth(elapsed/MUSIC_OUT_MS):1);

// Borrows the existing Player element and TV scheduler; no extra media loop/clock.
export class Chapter8CreditsAudio{
 constructor(media,onReady){this.media=media;this.onReady=onReady;this.run=null;this.epoch=0;this.started=false;this.attempted=false;this.pending=false;this.blocked=false;
  this.playing=()=>{if(this.run){this.started=true;this.blocked=false;}};
  this.error=()=>{if(this.run)this.blocked=true;};
  this.ended=()=>{if(this.run){this.finished=true;this.blocked=false;}};
  for(const event of ['playing','error','pause','ended'])media.addEventListener(event,event==='playing'?this.playing:event==='ended'?this.ended:this.error);
 }
 update(c,cue,now,{ready=true,authenticated=false}={}){
  const continuing=c?.finale?.polishVersion>=8&&['shutdown','final-image'].includes(cue?.id);
  if(!(cue?.credits||continuing)||!(c.step==='finale'||c.step==='complete'&&continuing)){if(this.run)this.stop();return;}
  const f=c.finale,anchor=f.soundAnchors?.credits;
  if(this.run!==f.id){this.stop();this.run=f.id;}
  this.media.muted=continuing&&cue.id==='shutdown';this.media.volume=creditsVolume(cue,now-f.phaseAt);this.media.loop=false;
  if(this.media.volume===0&&f.polishVersion<8){this.stop();return;}
  if(this.media.error){this.blocked=true;return;}
  if(this.media.readyState<2||!ready)return;
  if(this.finished||anchor!=null&&this.media.duration>0&&now-anchor>=this.media.duration*1000){this.finished=true;return;}
  if(!this.attempted){this.attempted=true;this.pending=true;const epoch=this.epoch;this.media.currentTime=anchor==null?0:Math.max(0,(now-anchor)/1000);
   Promise.resolve(this.media.play()).catch(()=>{if(this.epoch===epoch)this.blocked=true;}).finally(()=>{if(this.epoch===epoch)this.pending=false;});
  }
  if(cue.id==='credits-intro'&&f.deadline===null&&this.started&&!this.media.paused&&authenticated&&!this.readyRequested){this.readyRequested=true;this.onReady();}
 }
 unlock(){this.blocked=false;this.readyRequested=false;if(this.media.error)this.media.load();if(this.media.paused&&!this.pending)this.attempted=false;}
 stop(){this.epoch++;this.finished=false;this.readyRequested=false;this.started=false;this.attempted=false;this.pending=false;this.run=null;this.blocked=false;this.media.pause();this.blocked=false;}
 destroy(){this.stop();for(const event of ['playing','error','pause','ended'])this.media.removeEventListener(event,event==='playing'?this.playing:event==='ended'?this.ended:this.error);}
}
