import {NarratorScreen} from './narrator-screen.js';
import {cameraFrame} from './chapter8-camera.js';
import {Chapter8SoundDesign,soundLayers,primaryEffectGain} from './chapter8-sound-design.js';
import {allFinaleCues,finaleCue,cameras,NEWS_SRC,SCARE_MS,GAME_TITLE_AT_MS} from './chapter8-finale-timing.js';
import {smooth} from './chapter8-puzzle.js';
import {wifePresentation} from './chapter8-presentation.js';
import {GREETING,greetingFrame,COLLECTOR_SRC} from './chapter8-ending.js';
import {creditPhotos,creditFrame,Chapter8CreditsAudio,SHUTDOWN_SRC} from './chapter8-credits.js';

// Driven solely by the existing TV scheduler. No additional timers or RAFs.
export class Chapter8Finale{
 constructor(document,clock,{Player=globalThis.BrookwoodAudio.Player,request,onState}={}){
  this.document=document;this.clock=clock;this.request=request;this.onState=onState;this.state=null;this.entry=null;this.epoch=0;this.blocked=false;this.message='';this.imageReady=false;
  this.player=new Player({id:'chapter8-finale',cues:[...new Map([...allFinaleCues.filter(c=>c.src&&c.kind!=='video'),...soundLayers].map(c=>[c.id,c])).values()].map(c=>({...c,type:'narration',at:0}))},{externallyDriven:true,canSync:()=>false});
  this.sound=new Chapter8SoundDesign(this.player,()=>this.now());
  const make=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
  this.root=make('div','ch8-finale');this.root.hidden=true;document.getElementById('chapter8TV').appendChild(this.root);
  this.gridCanvas=make('div','ch8-camera-grid');this.gridImage=make('img','');this.gridImage.src=cameras.grid;this.gridImage.alt='Complete six-camera surveillance grid';this.gridCanvas.appendChild(this.gridImage);this.root.appendChild(this.gridCanvas);
  this.image=make('img','ch8-camera-image');this.image.alt='Brookwood home security camera';this.root.appendChild(this.image);
  this.interference=make('div','ch8-camera-interference');this.interference.setAttribute('aria-hidden','true');this.root.appendChild(this.interference);
  this.label=make('div','ch8-camera-label');this.root.appendChild(this.label);this.timestamp=make('div','ch8-camera-time');this.root.appendChild(this.timestamp);
  this.title=make('div','ch8-finale-title');this.root.appendChild(this.title);
  this.greeting=make('div','ch8-halloween-words');this.greeting.setAttribute('aria-label',GREETING);this.letters=[];
  for(const word of GREETING.split(' ')){const line=make('div','ch8-halloween-line');for(const letter of word){const span=make('span','ch8-halloween-letter');span.textContent=letter;span.setAttribute('aria-hidden','true');span.style.setProperty?.('--letter',this.letters.length);line.appendChild(span);this.letters.push(span);}this.greeting.appendChild(line);}
  this.narrator=new NarratorScreen(document,{theme:'wife'});this.wife=this.narrator.root;this.microphone=this.narrator.microphone;this.wifeWave=this.narrator.wave;this.gameTitle=this.narrator.title;this.root.appendChild(this.wife);
  this.breach=make('div','ch8-security-breach');this.breach.hidden=true;this.breach.textContent='SECURITY BREACH';this.breach.setAttribute('role','status');this.root.appendChild(this.breach);
  this.video=make('video','ch8-finale-news');this.video.preload='auto';this.video.playsInline=true;this.video.controls=false;this.video.src=NEWS_SRC;this.root.appendChild(this.video);
  this.collector=make('video','ch8-finale-news');this.collector.preload='auto';this.collector.playsInline=true;this.collector.controls=false;this.collector.src=COLLECTOR_SRC;this.collector.hidden=true;this.root.appendChild(this.collector);
  this.shutdown=make('video','ch8-finale-news');this.shutdown.preload='auto';this.shutdown.playsInline=true;this.shutdown.controls=false;this.shutdown.src=SHUTDOWN_SRC;this.shutdown.hidden=true;this.root.appendChild(this.shutdown);
  this.photoPaper=make('figure','ch8-credit-paper');this.creditPhoto=make('img','ch8-credit-photo');this.creditPhoto.alt='';this.photoPaper.appendChild(this.creditPhoto);this.photoPaper.hidden=true;this.root.appendChild(this.photoPaper);
  this.finalImage=make('img','ch8-final-image');this.finalImage.src=creditPhotos[8].src;this.finalImage.alt='Happy Halloween';this.finalImage.hidden=true;this.root.appendChild(this.finalImage);
  this.creditsAudio=new Chapter8CreditsAudio(this.player.media.get('final-song'),()=>this.ackReady());
  // Only eight photographs; keep decoded images ready for immediate switching.
  this.preloads=[...Object.entries(cameras),...creditPhotos.map(p=>['credit-'+p.number,p.src])].map(([key,src])=>{const img=make('img','');img.src=src;return {key,img};});
 }
 now(){return (this.state?.chapter8.startedAt??0)+this.clock.elapsedNow();}
 update(state,authenticated){
  this.state=state;this.authenticated=authenticated;const c=state?.chapter8,f=c?.finale,cue=c?.step==='finale'||c?.step==='complete'&&f?.polishVersion>=7?finaleCue(c):null;
  this.sound.update(c,cue);
  if(!cue){this.release();this.creditsAudio.stop();this.root.hidden=true;return;}
  this.root.hidden=false;this.root.dataset.cue=cue.id;
  const elapsed=this.now()-f.phaseAt,expiredScare=cue.visual==='scare'&&elapsed>=cue.durationMs;
  const approachElapsed=f.mediaStartedAt===null?0:this.now()-f.mediaStartedAt;
  const waitingForVoice=cue.syncVisualToAudio&&!(this.entry?.key===f.id+':'+c.sequence&&this.entry.started);
  const visual=waitingForVoice?'black':expiredScare?(f.polishVersion>=4?'black':'lost'):cue.id==='whistle-approach'&&approachElapsed>=cue.cameraSwitchMs?'living':cue.visual,camera=!!cameras[visual];this.root.dataset.visual=visual;
  this.gridCanvas.hidden=!(visual==='grid'||cue.zoom);
  this.image.hidden=!camera||visual==='grid';this.video.hidden=visual!=='news';this.collector.hidden=visual!=='collector';this.interference.hidden=!camera&&visual!=='lost';
  this.shutdown.hidden=visual!=='shutdown';this.photoPaper.hidden=visual!=='credit-photo';this.finalImage.hidden=visual!=='final9';
  const creditPhoto=creditPhotos.find(p=>p.number===cue.photo),creditView=this.document.defaultView;
  if(creditPhoto&&this.creditPhoto.getAttribute('src')!==creditPhoto.src)this.creditPhoto.src=creditPhoto.src;
  const credit=creditFrame(cue,elapsed,{width:creditView?.innerWidth??1920,height:creditView?.innerHeight??1080,armed:f.deadline!==null&&(!cue.photo||this.creditPhoto.complete&&this.creditPhoto.naturalWidth>0),reduced:creditView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false});
  this.photoPaper.style.width=credit.width+'px';this.photoPaper.style.padding=credit.padding+'px';this.photoPaper.style.opacity=String(credit.opacity);this.photoPaper.style.transform='translate(-50%, -50%) translate('+credit.x+'px,'+credit.y+'px) rotate('+credit.angle+'deg) scale('+credit.scale+')';
  this.finalImage.style.opacity=String(c.step==='complete'?1:f.deadline===null?0:smooth(elapsed/1200));
  if(cue.credits||cue.id==='final-image'&&f.polishVersion>=8)this.release();
  const creditReady=this.preloads.find(p=>p.key==='credit-1')?.img;this.creditsAudio.update(c,cue,this.now(),{ready:!!creditReady?.complete&&creditReady.naturalWidth>0,authenticated});
  if(camera&&this.image.getAttribute('src')!==cameras[visual])this.image.src=cameras[visual];
  // The reveal is abrupt. Other CCTV feed changes use a short fade from black.
  const frame=cameraFrame(cue,elapsed,f.deadline!==null,(this.document.defaultView?.innerWidth??1920)/(this.document.defaultView?.innerHeight??1080));
  this.image.style.opacity=String(cue.zoom?frame.feedOpacity:f.polishVersion>=2?1:visual==='scare'||cue.id==='living-silence'?1:smooth(elapsed/450));
  this.gridCanvas.style.transformOrigin=frame.origin;this.gridCanvas.style.transform='translate(-50%, -50%) translate('+frame.x+'%, '+frame.y+'%) scale('+frame.scale+')';
  this.interference.style.opacity=String(visual==='lost'?.65+(Math.floor(elapsed/70)%3)*.1:.07+(Math.floor(elapsed/1300)%11===0?.07:0));
  this.interference.style.transform=visual==='lost'?'translateY('+(Math.floor(elapsed/65)%9-4)+'px)':'none';
  this.label.hidden=!camera&&visual!=='lost';this.label.textContent=visual==='lost'?'SIGNAL LOST':visual==='grid'?'SECURITY SYSTEM • LIVE':'● REC  /  '+({driveway:'DRIVEWAY',front:'FRONT DOOR',side:'SIDE PASSAGE',porch:'FRONT PORCH',living:'LIVING ROOM',scare:'LIVING ROOM'}[visual]??visual.toUpperCase());
  if(cue.motion)this.label.textContent='MOTION DETECTED';
  this.root.dataset.motion=String(!!cue.motion&&visual==='grid');
  this.timestamp.hidden=!camera;this.timestamp.textContent='2026-10-31  '+new Date(Date.UTC(2026,9,31,22,14,0)+Math.max(0,this.now()-f.startedAt)).toISOString().slice(11,19);
  const revisedEnding=f.polishVersion>=6&&visual==='ending';
  this.title.hidden=!['party','news-intro','ending','credits-intro'].includes(visual);if(!revisedEnding)this.title.textContent=visual==='credits-intro'?'TO BE CONTINUED...':visual==='ending'?'HAPPY HALLOWEEN':visual==='news-intro'?'WESTMAN NEWS':'BROOKWOOD';
  this.title.classList.toggle('ch8-continued',visual==='credits-intro');
  this.title.style.opacity=String(visual==='ending'?1-smooth(Math.max(0,elapsed-1200)/1800):smooth(elapsed/1200));
  if(visual==='credits-intro')this.title.style.opacity=String(credit.opacity);
  this.title.classList.toggle('ch8-halloween',revisedEnding);
  if(revisedEnding){
   if(this.greeting.parentNode!==this.title)this.title.replaceChildren(this.greeting);
   const frame=greetingFrame(cue,elapsed);this.title.dataset.glitch=String(frame.stage);this.title.dataset.black=String(frame.black);this.title.style.opacity=String(frame.opacity);this.greeting.style.transform='translateX('+frame.tear+'px)';
   for(let n=0;n<this.letters.length;n++)this.letters[n].dataset.gone=String(frame.gone.has(n));
  }else this.title.dataset.glitch='0';
  const wife=wifePresentation(c,this.now()),speaking=cue.kind==='narration'&&this.entry?.key===f.id+':'+c.sequence&&!this.entry.ended&&!this.entry.media.paused;
  this.narrator.update({...wife,speaking,title:wife.title||'BROOKWOOD FARM',eyebrow:'BROOKWOOD FARM · CASE FILE 1996',subtitle:wife.title?'':'THE QUESTIONS REMAIN.',titleOpacity:wife.title?smooth((wife.offset-GAME_TITLE_AT_MS)/500):1});
  this.breach.hidden=!(f.polishVersion>=1&&['garage-alarm-lead','garage-announcement','garage-alarm-release'].includes(cue.id));this.breach.style.opacity=String(.86+.14*(.5+.5*Math.sin(elapsed/650)));
  const prepareImpact=['handoff','wife-01','wife-02','wife-03','wife-04','wife-05','wife-06','wife-07','wife-08','wife-09','wife-10','wife-11','whistle-approach','living-silence'].includes(cue.id);
  const impactReady=prepareImpact&&f.polishVersion>=4?this.sound.prepareImpact():true;
  if(cue.kind==='hold'){
   this.release();
   if(c.step==='finale'&&cue.id!=='credits-intro'&&(cue.id==='living-silence'||cue.readyImage)&&f.deadline===null&&authenticated&&impactReady){const ready=this.preloads.find(p=>p.key===(cue.readyImage??'living'))?.img,display=cue.photo?this.creditPhoto:cue.visual==='final9'?this.finalImage:this.image;if(ready?.complete&&ready.naturalWidth>0&&display.complete&&display.naturalWidth>0)this.ackReady();}
   return;
  }
  const key=f.id+':'+c.sequence;
  if(this.entry?.key!==key)this.release();
  if(this.entry){const e=this.entry;if(cue.offsetMs!=null&&!e.ended&&e.media.currentTime*1000>=cue.offsetMs+cue.durationMs){e.end();e.media.pause();}const progress=Math.max(0,e.media.currentTime*1000-(cue.offsetMs??0));e.media.volume=primaryEffectGain(cue,progress);if(cue.id==='whistle-approach')this.sound.approach(progress);if(this.entry.ended)this.ack('chapter8-finale-ended');else if(!this.entry.media.paused&&f.mediaStartedAt===null)this.ack('chapter8-finale-playing');return;}
  const media=this.mediaFor(cue);
  if(!media||media.readyState<2){this.blocked=!!media?.error;this.message=this.blocked?'MEDIA COULD NOT LOAD — RETRY':'PREPARING '+(cue.kind==='video'?'BROADCAST':'AUDIO');return;}
  if(cameras[cue.visual]&&(!this.image.complete||!this.image.naturalWidth))return;
  if(cue.id==='whistle-approach'&&!this.sound.prepareWhistle(media))return;
  const entry={key,cue,media,ended:false,pending:false,attempted:false,acks:new Set(),failed:new Set()};this.entry=entry;
  const offset=f.mediaStartedAt===null?0:Math.max(0,(this.now()-f.mediaStartedAt)/1000);
  media.currentTime=Math.min((cue.offsetMs??0)/1000+offset,Math.max(0,media.duration-.12));media.volume=primaryEffectGain(cue,offset*1000);media.muted=false;media.loop=false;
  entry.playing=()=>{if(this.entry!==entry)return;entry.started=true;if(cue.syncVisualToAudio){this.root.dataset.visual='lost';this.label.textContent='SIGNAL LOST';this.label.hidden=false;this.interference.hidden=false;this.interference.style.opacity='.75';}this.blocked=false;this.message='';if(this.state.chapter8.finale.mediaStartedAt===null)this.ack('chapter8-finale-playing');};
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
 mediaFor(cue){return cue?.kind==='video'?cue.id==='collector-reveal'?this.collector:cue.id==='shutdown'?this.shutdown:this.video:this.player.media.get(cue?.id);}
 unlock(){this.sound.unlock();this.creditsAudio.unlock();this.readyKey=null;const e=this.entry;if(!e){const media=this.mediaFor(finaleCue(this.state?.chapter8));if(media?.error)media.load();return;}e.failed.clear();e.attempted=false;if(e.media.error){e.media.load();this.release();return;}if(e.ended)this.ack('chapter8-finale-ended');else if(!e.media.paused)e.playing();else this.play();}
 needsUnlock(){return this.blocked||this.sound.blocked||this.creditsAudio.blocked;}
 release(){const e=this.entry;if(!e)return;this.entry=null;for(const [name,fn] of [['playing',e.playing],['ended',e.end],['pause',e.pause],['error',e.error]])e.media.removeEventListener(name,fn);e.media.pause();this.blocked=false;this.message='';}
 stop(){this.epoch++;this.release();this.sound.stop();this.creditsAudio.destroy();this.player.stop();for(const media of [...this.player.media.values(),this.video,this.collector,this.shutdown]){media.pause();media.removeAttribute('src');media.load();}this.creditPhoto.removeAttribute('src');this.finalImage.removeAttribute('src');this.state=null;this.root.hidden=true;this.root.remove();for(const {img} of this.preloads)img.removeAttribute('src');this.preloads=[];}
}
