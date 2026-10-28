import {Chapter8SoundDesign,soundLayers,primaryEffectGain} from './chapter8-sound-design.js';
import {finaleCues,finaleCue,cameras,NEWS_SRC,SCARE_MS,GAME_TITLE_AT_MS} from './chapter8-finale-timing.js';
import {smooth} from './chapter8-puzzle.js';
import {wifePresentation} from './chapter8-presentation.js';

// Driven solely by the existing TV scheduler. No additional timers or RAFs.
export class Chapter8Finale{
 constructor(document,clock,{Player=globalThis.BrookwoodAudio.Player,request,onState}={}){
  this.document=document;this.clock=clock;this.request=request;this.onState=onState;this.state=null;this.entry=null;this.epoch=0;this.blocked=false;this.message='';this.imageReady=false;
  this.player=new Player({id:'chapter8-finale',cues:[...finaleCues.filter(c=>c.src&&c.kind!=='video'),...soundLayers].map(c=>({...c,type:'narration',at:0}))},{externallyDriven:true,canSync:()=>false});
  this.sound=new Chapter8SoundDesign(this.player,()=>this.now());
  const make=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
  this.root=make('div','ch8-finale');this.root.hidden=true;document.getElementById('chapter8TV').appendChild(this.root);
  this.image=make('img','ch8-camera-image');this.image.alt='Brookwood home security camera';this.root.appendChild(this.image);
  this.interference=make('div','ch8-camera-interference');this.interference.setAttribute('aria-hidden','true');this.root.appendChild(this.interference);
  this.label=make('div','ch8-camera-label');this.root.appendChild(this.label);this.timestamp=make('div','ch8-camera-time');this.root.appendChild(this.timestamp);
  this.title=make('div','ch8-finale-title');this.root.appendChild(this.title);
  this.wife=make('section','investigation-scene ch8-wife');this.wife.hidden=true;this.root.appendChild(this.wife);
  this.wifeLight=make('div','ch8-wife-light');this.wife.appendChild(this.wifeLight);
  this.wifeEyebrow=make('p','investigation-eyebrow');this.wifeEyebrow.textContent='BROOKWOOD / HALLOWEEN NIGHT';this.wife.appendChild(this.wifeEyebrow);
  this.microphone=make('div','ch8-wife-microphone');this.microphone.setAttribute('aria-hidden','true');this.microphone.innerHTML='<svg viewBox="0 0 100 130" fill="none" aria-hidden="true"><rect x="33" y="8" width="34" height="70" rx="17" stroke="currentColor" stroke-width="3"/><path d="M22 58v9a28 28 0 0 0 56 0v-9M50 96v20m-19 0h38M42 26h16m-16 12h16m-16 12h16m-16 12h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';this.wife.appendChild(this.microphone);
  this.wifeWave=make('div','investigation-wave ch8-wife-wave');this.wifeWave.setAttribute('aria-hidden','true');for(let i=0;i<25;i++)this.wifeWave.appendChild(make('i',''));this.wife.appendChild(this.wifeWave);
  this.gameTitle=make('h1','investigation-title ch8-wife-game');this.wife.appendChild(this.gameTitle);
  this.breach=make('div','ch8-security-breach');this.breach.hidden=true;this.breach.textContent='SECURITY BREACH';this.breach.setAttribute('role','status');this.root.appendChild(this.breach);
  this.video=make('video','ch8-finale-news');this.video.preload='auto';this.video.playsInline=true;this.video.controls=false;this.video.src=NEWS_SRC;this.root.appendChild(this.video);
  // Only eight photographs; keep decoded images ready for immediate switching.
  this.preloads=Object.entries(cameras).map(([key,src])=>{const img=make('img','');img.src=src;return {key,img};});
 }
 now(){return (this.state?.chapter8.startedAt??0)+this.clock.elapsedNow();}
 update(state,authenticated){
  this.state=state;this.authenticated=authenticated;const c=state?.chapter8,f=c?.finale,cue=c?.step==='finale'?finaleCue(c):null;
  this.sound.update(c,cue);
  if(!cue){this.release();this.root.hidden=true;return;}
  this.root.hidden=false;this.root.dataset.cue=cue.id;
  const elapsed=this.now()-f.phaseAt,expiredScare=cue.visual==='scare'&&elapsed>=SCARE_MS;
  const approachElapsed=f.mediaStartedAt===null?0:this.now()-f.mediaStartedAt;
  const visual=expiredScare?'lost':cue.id==='whistle-approach'&&approachElapsed>=cue.cameraSwitchMs?'living':cue.visual,camera=!!cameras[visual];this.root.dataset.visual=visual;
  this.image.hidden=!camera;this.video.hidden=visual!=='news';this.interference.hidden=!camera&&visual!=='lost';
  if(camera&&this.image.getAttribute('src')!==cameras[visual])this.image.src=cameras[visual];
  // The reveal is abrupt. Other CCTV feed changes use a short fade from black.
  this.image.style.opacity=String(visual==='scare'||cue.id==='living-silence'?1:smooth(elapsed/450));
  this.interference.style.opacity=String(visual==='lost'?.65+(Math.floor(elapsed/70)%3)*.1:.07+(Math.floor(elapsed/1300)%11===0?.07:0));
  this.interference.style.transform=visual==='lost'?'translateY('+(Math.floor(elapsed/65)%9-4)+'px)':'none';
  this.label.hidden=!camera&&visual!=='lost';this.label.textContent=visual==='lost'?'SIGNAL LOST':visual==='grid'?'SECURITY SYSTEM • LIVE':'● REC  /  '+({side:'SIDE PASSAGE',porch:'FRONT PORCH',living:'LIVING ROOM',scare:'LIVING ROOM'}[visual]??visual.toUpperCase());
  if(cue.id==='motion-notification')this.label.textContent='MOTION DETECTED / DRIVEWAY';
  this.timestamp.hidden=!camera;this.timestamp.textContent='2026-10-31  '+new Date(Date.UTC(2026,9,31,22,14,0)+Math.max(0,this.now()-f.startedAt)).toISOString().slice(11,19);
  this.title.hidden=!['party','news-intro','ending'].includes(visual);this.title.textContent=visual==='ending'?'HAPPY HALLOWEEN':visual==='news-intro'?'WESTMAN NEWS':'BROOKWOOD';
  this.title.style.opacity=String(visual==='ending'?1-smooth(Math.max(0,elapsed-1200)/1800):smooth(elapsed/1200));
  const wife=wifePresentation(c,this.now());this.wife.hidden=!wife.visible;this.wife.dataset.mood=wife.mood;this.gameTitle.hidden=!wife.title;this.gameTitle.textContent=wife.title;
  this.wifeEyebrow.textContent=cue.src?.endsWith('security-notification.wav')?'SECURITY MOTION DETECTED':'BROOKWOOD / HALLOWEEN NIGHT';
  this.gameTitle.style.opacity=String(smooth((wife.offset-GAME_TITLE_AT_MS)/500));this.gameTitle.style.transform='translateY('+(1-smooth((wife.offset-GAME_TITLE_AT_MS)/500))*15+'px)';
  const speaking=cue.kind==='narration'&&this.entry?.key===f.id+':'+c.sequence&&!this.entry.ended&&!this.entry.media.paused;
  this.wifeWave.className='investigation-wave ch8-wife-wave'+(speaking?' speaking':'');this.microphone.dataset.speaking=String(!!speaking);this.microphone.style.transform='scale('+(speaking?1+.025*Math.sin(wife.offset/160):1)+')';
  this.wifeLight.style.transform='translate('+Math.sin((this.now()-f.startedAt)/(wife.mood==='warm'?9000:22000))*5+'%, '+Math.cos((this.now()-f.startedAt)/14000)*4+'%)';
  this.breach.hidden=!(f.polishVersion===1&&['garage-alarm-lead','garage-announcement','garage-alarm-release'].includes(cue.id));this.breach.style.opacity=String(.86+.14*(.5+.5*Math.sin(elapsed/650)));
  if(cue.kind==='hold'){
   this.release();
   if(cue.id==='living-silence'&&f.deadline===null&&authenticated){const ready=this.preloads.find(p=>p.key==='living')?.img;if(ready?.complete&&ready.naturalWidth>0&&this.image.complete&&this.image.naturalWidth>0)this.ackReady();}
   return;
  }
  const key=f.id+':'+c.sequence;
  if(this.entry?.key!==key)this.release();
  if(this.entry){const e=this.entry;if(cue.offsetMs!=null&&!e.ended&&e.media.currentTime*1000>=cue.offsetMs+cue.durationMs){e.end();e.media.pause();}const progress=Math.max(0,e.media.currentTime*1000-(cue.offsetMs??0));e.media.volume=primaryEffectGain(cue,progress);if(cue.id==='whistle-approach')this.sound.approach(progress);if(this.entry.ended)this.ack('chapter8-finale-ended');else if(!this.entry.media.paused&&f.mediaStartedAt===null)this.ack('chapter8-finale-playing');return;}
  const media=cue.kind==='video'?this.video:this.player.media.get(cue.id);
  if(!media||media.readyState<2){this.blocked=!!media?.error;this.message=this.blocked?'MEDIA COULD NOT LOAD — RETRY':'PREPARING '+(cue.kind==='video'?'BROADCAST':'AUDIO');return;}
  if(cue.id==='whistle-approach'&&!this.sound.prepareWhistle(media))return;
  const entry={key,cue,media,ended:false,pending:false,attempted:false,acks:new Set(),failed:new Set()};this.entry=entry;
  const offset=f.mediaStartedAt===null?0:Math.max(0,(this.now()-f.mediaStartedAt)/1000);
  media.currentTime=Math.min((cue.offsetMs??0)/1000+offset,Math.max(0,media.duration-.12));media.volume=primaryEffectGain(cue,offset*1000);media.muted=false;media.loop=false;
  entry.playing=()=>{if(this.entry!==entry)return;this.blocked=false;this.message='';if(this.state.chapter8.finale.mediaStartedAt===null)this.ack('chapter8-finale-playing');};
  entry.end=()=>{if(this.entry!==entry)return;entry.ended=true;this.ack('chapter8-finale-ended');};
  entry.pause=()=>{if(this.entry===entry&&!entry.ended&&!media.ended){this.blocked=true;this.message='RESUME FINALE';}};
  entry.error=()=>{if(this.entry===entry){this.blocked=true;this.message='MEDIA COULD NOT LOAD — RETRY';}};
  for(const [name,fn] of [['playing',entry.playing],['ended',entry.end],['pause',entry.pause],['error',entry.error]])media.addEventListener(name,fn);
  if(cue.offsetMs!=null&&offset*1000>=cue.durationMs){entry.ended=true;this.ack('chapter8-finale-ended');return;}
  this.play();
 }
 ackReady(){
  const c=this.state.chapter8,key=c.finale.id+':'+c.sequence;
  if(this.readyKey===key)return;this.readyKey=key;this.send('chapter8-finale-ready').catch(()=>{if(this.readyKey===key){this.blocked=true;this.message='RESUME FINALE';}});
 }
 send(action){const s=this.state,c=s.chapter8,f=c.finale,epoch=this.epoch,sentAt=performance.now();return Promise.resolve(this.request('/api/host',{action,generation:s.generation,chapter8Id:c.id,sequence:c.sequence,finaleId:f.id,cueId:finaleCue(c).id})).then(result=>{if(epoch===this.epoch)this.onState(result.state,{sentAt,receivedAt:performance.now()});});}
 ack(action){
  const e=this.entry,f=this.state?.chapter8?.finale;if(!e||!this.authenticated||e.acks.has(action)||e.failed.has(action))return;
  if(action==='chapter8-finale-ended'&&(f.mediaStartedAt===null||this.now()<f.mediaStartedAt+e.cue.durationMs-250))return;
  e.acks.add(action);this.send(action).catch(()=>{if(this.entry===e){e.failed.add(action);this.blocked=true;this.message='RESUME FINALE TO RETRY';e.media.pause();}}).finally(()=>e.acks.delete(action));
 }
 play(){const e=this.entry;if(!e||e.pending||e.ended||!e.media.paused||e.attempted)return;e.attempted=true;e.pending=true;Promise.resolve(e.media.play()).catch(()=>{if(this.entry===e){this.blocked=true;this.message='ENABLE AUDIO / RESUME';}}).finally(()=>e.pending=false);}
 unlock(){this.sound.unlock();this.readyKey=null;const e=this.entry;if(!e){const cue=finaleCue(this.state?.chapter8),media=cue?.kind==='video'?this.video:this.player.media.get(cue?.id);if(media?.error)media.load();return;}e.failed.clear();e.attempted=false;if(e.media.error){e.media.load();this.release();return;}if(e.ended)this.ack('chapter8-finale-ended');else if(!e.media.paused)e.playing();else this.play();}
 needsUnlock(){return this.blocked||this.sound.blocked;}
 release(){const e=this.entry;if(!e)return;this.entry=null;for(const [name,fn] of [['playing',e.playing],['ended',e.end],['pause',e.pause],['error',e.error]])e.media.removeEventListener(name,fn);e.media.pause();this.blocked=false;this.message='';}
 stop(){this.epoch++;this.release();this.sound.stop();this.player.stop();for(const media of this.player.media.values()){media.removeAttribute('src');media.load();}this.video.pause();this.video.removeAttribute('src');this.video.load();this.state=null;this.root.hidden=true;this.root.remove();for(const {img} of this.preloads)img.removeAttribute('src');this.preloads=[];}
}
