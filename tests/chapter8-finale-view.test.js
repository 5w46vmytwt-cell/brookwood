import test from 'node:test';
import assert from 'node:assert/strict';
import {Chapter8Finale} from '../chapter8-finale.js';
import {finaleCues,SCARE_MS} from '../chapter8-finale-timing.js';
const flush=()=>new Promise(r=>setImmediate(r));
function harness(id='wife-05',{offset=0,started=null,deny=false,authenticated=true}={}){
 let now=100000+offset;
 class Media{
  constructor(){this.listeners=new Map();this.style={};this.dataset={};this.children=[];this.hidden=false;this.complete=true;this.naturalWidth=1536;this.readyState=4;this.duration=70;this.currentTime=0;this.paused=true;this.plays=0;this.volume=1;}
  setAttribute(k,v){this[k]=v;}getAttribute(k){return this[k];}removeAttribute(k){delete this[k];}appendChild(n){this.children.push(n);}remove(){this.removed=true;}
  addEventListener(n,fn){if(!this.listeners.has(n))this.listeners.set(n,new Set());this.listeners.get(n).add(fn);}removeEventListener(n,fn){this.listeners.get(n)?.delete(fn);}emit(n){for(const fn of this.listeners.get(n)??[])fn();}load(){}
  play(){this.plays++;if(deny)return Promise.reject(Error('Autoplay'));this.paused=false;queueMicrotask(()=>this.emit('playing'));return Promise.resolve();}pause(){this.paused=true;}
 }
 class Player{constructor(t){this.media=new Map(t.cues.map(c=>[c.id,Object.assign(new Media(),{src:c.src})]));}stop(){for(const a of this.media.values())a.pause();}}
 const root=new Media(),doc={createElement:()=>new Media(),getElementById:()=>root},calls=[];
 const index=finaleCues.findIndex(c=>c.id===id),state={generation:'g',chapter8:{id:'c',startedAt:100000,step:'finale',sequence:index,finale:{id:'f',startedAt:100000,index,phaseAt:100000,deadline:null,mediaStartedAt:started}}};
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
 h.state.chapter8.finale.index++;h.state.chapter8.sequence++;h.at(0);h.update();assert.equal(h.view.root.dataset.visual,'scare');h.at(SCARE_MS);h.update();assert.equal(h.view.root.dataset.visual,'lost');h.at(SCARE_MS+1000);h.update();assert.equal(h.view.root.dataset.visual,'lost');
});

test('read-only TV cannot acknowledge or arm scenes, and cleanup stops/unloads all media and removes handlers',async()=>{
 const h=harness('wife-01',{authenticated:false});h.update();await flush();assert.equal(h.calls.length,0);const e=h.view.entry,m=e.media;h.view.stop();assert(m.paused);assert(!m.src);assert(h.view.video.paused);assert(!h.view.video.src);assert(h.view.root.removed);assert(!m.listeners.get('ended').size);assert(h.view.player.media.values().every(a=>a.paused));assert.equal(h.view.state,null);
 const silence=harness('living-silence',{authenticated:false});silence.update();assert.equal(silence.calls.length,0);
});

test('feed rendering contains actual images without cropping and hides all camera overlays over news',()=>{
 const h=harness('breaking-news');h.update();assert.equal(h.view.video.hidden,false);assert.equal(h.view.image.hidden,true);assert.equal(h.view.label.hidden,true);assert.equal(h.view.interference.hidden,true);assert.equal(h.view.timestamp.hidden,true);assert.equal(h.view.title.hidden,true);
});

test('one whistle element crosses the camera switch without restarting, seeks its source window on refresh and skips an expired excerpt',async()=>{
 const h=harness('whistle-approach');h.update();await flush();const media=h.media();assert.equal(media.currentTime,2.8);assert.equal(h.view.root.dataset.visual,'garage');assert.equal(media.plays,1);
 h.at(4000);media.currentTime=6.8;h.update();assert.equal(h.view.root.dataset.visual,'living');assert.equal(media.currentTime,6.8);assert.equal(media.plays,1);
 h.at(11410);media.currentTime=14.21;h.update();await flush();assert(media.paused);assert.equal(h.calls.filter(c=>c.action==='chapter8-finale-ended').length,1);
 const refreshed=harness('whistle-approach',{offset:5000,started:100000});refreshed.update();await flush();assert.equal(refreshed.media().currentTime,7.8);assert.equal(refreshed.view.root.dataset.visual,'living');assert.equal(refreshed.media().plays,1);
 const expired=harness('whistle-approach',{offset:12000,started:100000});expired.update();await flush();assert.equal(expired.media().plays,0);assert.equal(expired.calls.filter(c=>c.action==='chapter8-finale-ended').length,1);
});
