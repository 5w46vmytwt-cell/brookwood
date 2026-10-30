import test from 'node:test';
import assert from 'node:assert/strict';
import {Chapter8Finale} from '../chapter8-finale.js';
import {version6FinaleCues as finaleCues,finaleCues as creditCues,SCARE_MS} from '../chapter8-finale-timing.js';
const flush=()=>new Promise(r=>setImmediate(r));
function harness(id='wife-05',{offset=0,started=null,deny=false,authenticated=true,version=6}={}){
 let now=100000+offset;
 class Media{
  constructor(){this.listeners=new Map();this.style={};this.dataset={};this.children=[];this.hidden=false;this.complete=true;this.naturalWidth=1536;this.readyState=4;this.duration=70;this.currentTime=0;this.paused=true;this.plays=0;this.volume=1;}
  attachShadow(){return new Media();}replaceChildren(...nodes){this.children=nodes;}get classList(){return {toggle:(name,on)=>{this.className=(this.className??'').split(' ').filter(c=>c&&c!==name).concat(on?[name]:[]).join(' ');}};}cloneNode(){return new Media();}querySelectorAll(){return [];}querySelector(selector){this.parts??=new Map();if(!this.parts.has(selector))this.parts.set(selector,new Media());return this.parts.get(selector);}
  setAttribute(k,v){this[k]=v;}getAttribute(k){return this[k];}removeAttribute(k){delete this[k];}appendChild(n){this.children.push(n);}remove(){this.removed=true;}
  addEventListener(n,fn){if(!this.listeners.has(n))this.listeners.set(n,new Set());this.listeners.get(n).add(fn);}removeEventListener(n,fn){this.listeners.get(n)?.delete(fn);}emit(n){for(const fn of this.listeners.get(n)??[])fn();}load(){}
  play(){this.plays++;if(deny)return Promise.reject(Error('Autoplay'));this.paused=false;queueMicrotask(()=>this.emit('playing'));return Promise.resolve();}pause(){this.paused=true;}
 }
 class Player{constructor(t){this.media=new Map(t.cues.map(c=>[c.id,Object.assign(new Media(),{src:c.src})]));}stop(){for(const a of this.media.values())a.pause();}}
 const root=new Media(),doc={createElement:()=>new Media(),getElementById:()=>root},calls=[];
 const index=(version===7?creditCues:finaleCues).findIndex(c=>c.id===id),state={generation:'g',chapter8:{id:'c',startedAt:100000,step:'finale',sequence:index,finale:{id:'f',polishVersion:version,startedAt:100000,index,phaseAt:100000,deadline:null,mediaStartedAt:started}}};
 const view=new Chapter8Finale(doc,{elapsedNow:()=>now-100000},{Player,request:async(_p,b)=>{calls.push(b);if(b.action==='chapter8-finale-playing')state.chapter8.finale.mediaStartedAt??=now;return {state};},onState(){}});
 return {view,state,calls,update:()=>view.update(state,authenticated),at:n=>now=100000+n,allow:()=>deny=false,media:()=>view.entry?.media};
}

test('single scheduler updates never duplicate narration; exact native end and full volume survive rerenders',async()=>{
 const h=harness();h.update();await flush();const m=h.media();assert.equal(m.plays,1);assert.equal(m.volume,1);assert.equal(m.currentTime,0);
 for(let n=0;n<20;n++)h.update();await flush();assert.equal(m.plays,1);assert.equal(h.calls.filter(c=>c.action==='chapter8-finale-playing').length,1);
 h.state.chapter8.finale.mediaStartedAt=100000;h.at(finaleCues[h.state.chapter8.finale.index].durationMs);m.emit('ended');m.emit('ended');await flush();assert.equal(h.calls.filter(c=>c.action==='chapter8-finale-ended').length,1);
});

test('refresh seeks narration/news, never plays other voices and only native ended advances news',async()=>{
 for(const id of ['wife-09','breaking-news']){const h=harness(id,{offset:16000,started:100000});h.update();await flush();const m=h.media();assert.equal(m.currentTime,16);assert.equal(m.volume,1);assert.equal(h.calls.length,0);h.at(100000);h.update();assert.equal(h.calls.length,0);assert([...h.view.player.media.values()].filter(a=>!a.paused).length<=(id==='breaking-news'?0:1));m.emit('ended');await flush();assert.equal(h.calls[0].action,'chapter8-finale-ended');h.view.stop();assert(m.paused);}
});

test('autoplay failure requires existing unlock gesture, retry reuses same element and keeps speech full-volume',async()=>{
 const h=harness('wife-01',{deny:true});h.update();await flush();assert(h.view.needsUnlock());const m=h.media();for(let i=0;i<10;i++)h.update();assert.equal(m.plays,1);h.allow();h.view.unlock();await flush();assert.equal(m.plays,2);assert(!m.paused);assert.equal(m.volume,1);
});

test('empty-room silence is visually ready before its persisted timer; no media plays; scare expires without replay',async()=>{
 const h=harness('living-silence');h.view.image.complete=false;h.update();assert.equal(h.calls.length,0);assert([...h.view.player.media.values()].every(a=>a.paused));h.view.image.complete=true;h.update();await flush();assert.equal(h.calls.length,1);assert.equal(h.calls[0].action,'chapter8-finale-ready');for(let i=0;i<10;i++)h.update();assert.equal(h.calls.length,1);
 h.state.chapter8.finale.index++;h.state.chapter8.sequence++;h.at(0);h.update();assert.equal(h.view.root.dataset.visual,'scare');h.at(SCARE_MS);h.update();assert.equal(h.view.root.dataset.visual,'black');h.at(SCARE_MS+1000);h.update();assert.equal(h.view.root.dataset.visual,'black');
});

test('SIGNAL LOST and complete wife-12 start on the same native playing event, including autoplay recovery and refreshed warning',async()=>{
 const blocked=harness('wife-12',{deny:true});blocked.update();await flush();assert.equal(blocked.view.root.dataset.visual,'black');assert.equal(blocked.view.label.hidden,true);
 blocked.allow();blocked.view.unlock();await flush();assert.equal(blocked.view.root.dataset.visual,'lost');assert.equal(blocked.view.label.textContent,'SIGNAL LOST');assert.equal(blocked.view.label.hidden,false);assert.equal(blocked.media().volume,1);
 for(let n=0;n<10;n++)blocked.update();assert.equal(blocked.media().plays,2);assert.equal(blocked.view.root.dataset.visual,'lost');
 const restored=harness('wife-12',{offset:2000,started:100000});restored.update();assert.equal(restored.view.label.hidden,true);await flush();assert.equal(restored.media().currentTime,2);assert.equal(restored.view.root.dataset.visual,'lost');restored.at(4600);restored.update();assert.equal(restored.view.root.dataset.visual,'lost');
});

test('suspense is armed only after the sting has silently decoded and completed its initial seek',async()=>{
 const h=harness('living-silence'),sting=h.view.player.media.get('scare-impact');sting.readyState=1;sting.seeking=true;h.update();assert.equal(h.calls.length,0);assert.equal(sting.currentTime,.2);assert.equal(sting.plays,0);
 sting.readyState=4;h.update();assert.equal(h.calls.length,0);sting.seeking=false;h.update();await flush();assert.equal(h.calls[0].action,'chapter8-finale-ready');assert.equal(sting.plays,0);
});

test('read-only TV cannot acknowledge or arm scenes, and cleanup stops/unloads all media and removes handlers',async()=>{
 const h=harness('wife-01',{authenticated:false});h.update();await flush();assert.equal(h.calls.length,0);const e=h.view.entry,m=e.media;h.view.stop();assert(m.paused);assert(!m.src);assert(h.view.video.paused);assert(!h.view.video.src);assert(h.view.root.removed);assert(!m.listeners.get('ended').size);assert(h.view.player.media.values().every(a=>a.paused));assert.equal(h.view.state,null);
 const silence=harness('living-silence',{authenticated:false});silence.update();assert.equal(silence.calls.length,0);
});

test('feed rendering contains actual images without cropping and hides all camera overlays over news',()=>{
 const h=harness('breaking-news');h.update();assert.equal(h.view.video.hidden,false);assert.equal(h.view.image.hidden,true);assert.equal(h.view.label.hidden,true);assert.equal(h.view.interference.hidden,true);assert.equal(h.view.timestamp.hidden,true);assert.equal(h.view.title.hidden,true);
});

test('one whistle element crosses the camera switch without restarting, seeks its source window on refresh and skips an expired excerpt',async()=>{
 const h=harness('whistle-approach');h.update();await flush();const media=h.media();assert.equal(media.currentTime,2.8);assert.equal(h.view.root.dataset.visual,'living');assert.equal(media.plays,1);
 h.at(4000);media.currentTime=6.8;h.update();assert.equal(h.view.root.dataset.visual,'living');assert.equal(media.currentTime,6.8);assert.equal(media.plays,1);
 h.at(11410);media.currentTime=14.21;h.update();await flush();assert(media.paused);assert.equal(h.calls.filter(c=>c.action==='chapter8-finale-ended').length,1);
 const refreshed=harness('whistle-approach',{offset:5000,started:100000});refreshed.update();await flush();assert.equal(refreshed.media().currentTime,7.8);assert.equal(refreshed.view.root.dataset.visual,'living');assert.equal(refreshed.media().plays,1);
 const expired=harness('whistle-approach',{offset:12000,started:100000});expired.update();await flush();assert.equal(expired.media().plays,0);assert.equal(expired.calls.filter(c=>c.action==='chapter8-finale-ended').length,1);
});

test('wife screen shows the real game title and speaking waveform, returns cold, and both doorbells and breach keep the grid',async()=>{
 const h=harness('wife-02',{offset:2500,started:100000});h.update();await flush();h.update();assert.equal(h.view.wife.hidden,false);assert.equal(h.view.wife.dataset.mood,'warm');assert.equal(h.view.gameTitle.textContent,'THE GREAT HALLOWEEN PARTY RESCUE');assert(h.view.wifeWave.className.includes('speaking'));assert(h.view.wifeWave.className.includes('speaking'));
 h.media().pause();h.update();assert(!h.view.wifeWave.className.includes('speaking'));
 const cold=harness('wife-14');cold.update();assert.equal(cold.view.wife.dataset.mood,'cold');assert.equal(cold.view.wife.hidden,false);
 for(const id of ['doorbell-before','garage-announcement']){const r=harness(id);r.update();assert.equal(r.view.root.dataset.visual,'grid');assert.equal(r.view.breach.hidden,id!=='garage-announcement');}
});

test('Collector refresh seeks one video, native ended alone advances, and cleanup unloads both videos',async()=>{
 const h=harness('collector-reveal',{offset:30000,started:100000});h.view.collector.duration=104.022;h.update();await flush();const m=h.media();assert.equal(m,h.view.collector);assert.equal(m.currentTime,30);assert.equal(m.volume,1);assert.equal(m.loop,false);assert(!m.hidden);assert(h.view.video.hidden);assert(h.view.image.hidden);for(let i=0;i<10;i++)h.update();assert.equal(m.plays,1);assert.equal(h.calls.length,0);
 h.at(104022);m.emit('ended');await flush();assert.equal(h.calls[0].action,'chapter8-finale-ended');h.view.stop();assert(m.paused);assert(!m.src);assert(!h.view.video.src);
});

test('main final song is a single nonlooping full-volume music cue on black; refresh and autoplay recovery retain the same element',async()=>{
 const h=harness('final-song',{offset:60000,started:100000,deny:true});h.view.player.media.get('final-song').duration=251.6;h.update();await flush();assert(h.view.needsUnlock());assert.equal(h.view.root.dataset.visual,'black');assert(h.view.title.hidden);assert(h.view.collector.hidden);assert.equal(h.media().currentTime,60);assert.equal(h.media().volume,.8);assert.equal(h.media().loop,false);h.allow();h.view.unlock();await flush();for(let n=0;n<10;n++)h.update();assert.equal(h.media().plays,2);assert.equal([...h.view.player.media.values()].filter(m=>!m.paused).length,1);h.view.stop();assert([...h.view.player.media.values()].every(m=>m.paused));
});

test('HTML greeting removes the saved letter groups after refresh without showing any wife or camera background',()=>{
 for(const [id,count] of [['ending',0],['ending-glitch-1',3],['ending-glitch-3',9],['ending-glitch-5',14]]){const h=harness(id,{offset:200});h.update();assert.equal(h.view.letters.filter(n=>n.dataset.gone==='true').length,count);assert(h.view.wife.hidden);assert(h.view.image.hidden);assert(h.view.video.hidden);assert(h.view.collector.hidden);assert.equal(h.view.title.dataset.glitch,String(finaleCues[h.state.chapter8.finale.index].glitch??0));h.view.stop();}
});

test('credits start the existing song once; native playing and decoded photograph arm the intro, with no restarted audio on photo entry',async()=>{
 const h=harness('credits-intro',{version:7});h.update();assert.equal(h.calls.length,0);await flush();h.update();await flush();assert.equal(h.calls[0].action,'chapter8-finale-ready');assert.equal(h.view.player.media.get('final-song').plays,1);assert.equal(h.view.title.textContent,'TO BE CONTINUED...');
 Object.assign(h.state.chapter8.finale,{index:creditCues.findIndex(c=>c.id==='credit-photo-1'),phaseAt:105500,deadline:114500,soundAnchors:{credits:100000}});h.state.chapter8.sequence++;h.at(7500);h.update();assert.equal(h.view.player.media.get('final-song').plays,1);assert.equal(h.view.player.media.get('final-song').volume,.8);assert(!h.view.photoPaper.hidden);assert(h.view.title.hidden);assert.equal(h.view.creditPhoto.src,'/assets/chapter8/final1.png');h.view.creditPhoto.complete=false;h.update();assert.equal(h.view.photoPaper.style.opacity,'0');h.view.stop();assert(h.view.player.media.get('final-song').paused);
});

test('shutdown seeks native playback after refresh and only ended acknowledges; final9 refresh stays permanently visible, silent and makes no requests',async()=>{
 const h=harness('shutdown',{version:7,offset:2500,started:100000});h.view.shutdown.duration=5.25834375;h.update();await flush();assert.equal(h.media(),h.view.shutdown);assert.equal(h.media().currentTime,2.5);assert.equal(h.media().volume,1);assert(!h.view.shutdown.hidden);assert(h.view.photoPaper.hidden);assert([...h.view.player.media.values()].every(a=>a.paused));h.at(5259);h.update();assert.equal(h.calls.length,0);h.media().emit('ended');await flush();assert.equal(h.calls[0].action,'chapter8-finale-ended');h.view.stop();assert(!h.view.shutdown.src);
 const final=harness('final-image',{version:7,offset:4000});final.state.chapter8.step='complete';final.state.chapter8.completedAt=101200;final.update();await flush();assert(!final.view.root.hidden);assert(!final.view.finalImage.hidden);assert.equal(final.view.finalImage.style.opacity,'1');assert.equal(final.view.finalImage.src,'/assets/chapter8/final9.png');assert(final.view.photoPaper.hidden);for(let n=0;n<5;n++){final.at(100000+n);final.update();}assert.equal(final.calls.length,0);assert([...final.view.player.media.values()].every(a=>a.paused));
});

test('after-news navigation cleanup unloads prior video/audio and removes callbacks before the cheerful return starts',async()=>{
 for(const id of ['breaking-news','whistle-approach','shutdown']){const old=harness(id,{version:7});old.update();await flush();const media=old.media();assert(!media.paused);old.view.stop();assert(media.paused);assert(!media.src);assert([...old.view.player.media.values()].every(m=>m.paused));assert(old.view.video.paused&&old.view.collector.paused&&old.view.shutdown.paused);const calls=old.calls.length;media.emit('ended');assert.equal(old.calls.length,calls);
  const next=harness('wife-16',{version:7});next.update();await flush();assert.equal(next.media().plays,1);assert.equal(next.media().currentTime,0);assert.equal(next.media().volume,1);assert(next.view.video.paused&&next.view.collector.paused&&next.view.shutdown.paused);next.view.stop();}
});
