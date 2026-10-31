import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {SCARE_GAIN} from '../scare-audio.js';import {soundEffects,phaseCues} from '../chapter6-timing.js';
import {effects,soundLayers,Chapter8SoundDesign,layerVolume} from '../chapter8-sound-design.js';
import {EndingStaticPlayback} from '../chapter8-static.js';import {GLITCH_DURATIONS} from '../chapter8-ending.js';
import {cameras,cuesFor} from '../chapter8-finale-timing.js';import {wifePresentation} from '../chapter8-presentation.js';
import {Chapter8View} from '../chapter8.js';
const flush=()=>new Promise(r=>setImmediate(r));
test('both dedicated scare sites share safe 0.90 gain while original source bytes, chicken and all timings remain unchanged',()=>{
 assert.equal(SCARE_GAIN,.9);assert.equal(soundEffects.find(c=>c.id==='chapter6-sfx-scream').volume,.9);assert.equal(soundEffects[0].volume,.7);
 const original=JSON.parse(fs.readFileSync('chapter8-finale-media.json')).find(m=>m.src===effects.impact.src),bytes=fs.readFileSync('assets/chapter6/audio/ch6_sfx_scream.mp3');assert.equal(createHash('sha256').update(bytes).digest('hex'),original.sha256);
 const cue=phaseCues({phaseAt:100000,startedAt:100000,step:'silence',polishVersion:1}).find(c=>c.id==='chapter6-sfx-scream');assert.equal(cue.at,52000);assert.equal(cue.mediaDurationMs,3312);assert.equal(cue.durationMs,3512);
 const media=new Map(soundLayers.map(c=>[c.id,{readyState:4,paused:true,currentTime:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}}]));let now=100000;const sound=new Chapter8SoundDesign({media},()=>now,{Context:null}),c={step:'finale',finale:{id:'f',polishVersion:8,phaseAt:now}};sound.update(c,{id:'intruder-reveal'});assert.equal(media.get('scare-impact').volume,.9);assert.equal(media.get('scare-impact').currentTime,.2);now+=1950;sound.update(c,{id:'intruder-reveal'});assert(media.get('scare-impact').paused);sound.stop();
 assert(SCARE_GAIN*Math.pow(10,.434855/20)<.95);
});
test('coded puzzle has no top heading, keeps the supplied artwork and all 17 authorized reveal regions',()=>{
 const nodes=new Map(),element=()=>({hidden:true,style:{},dataset:{},classList:{toggle(){}},setAttribute(){},appendChild(){},addEventListener(){}}),document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element};document.getElementById('chapterSelectPanel').hidden=true;
 class Player{constructor(){this.media=new Map();this.tracks=[];}stop(){}}
 const view=new Chapter8View(document,{elapsedNow:()=>1000},{Player,request:async()=>({}),onState(){}});view.update({phase:'chapter8',generation:'g',chapter8:{id:'8',envelopeVersion:1,startedAt:100000,phaseAt:100000,puzzleStartedAt:100000,step:'puzzle',sequence:0,revealedClues:[],audioStartedAt:null,deadline:null}});
 assert(document.getElementById('chapter8DecodeHeading').hidden);assert(document.getElementById('chapter8Narrator').hidden);assert.equal(document.getElementById('chapter8Canvas').hidden,false);assert.equal(document.getElementById('chapter8Artwork').src,'/assets/chapter8/ch8_puzzle_clues.png');assert.equal(view.buttons.size,17);
});
test('wife13 alone hides narrator rendering, while adjacent wife screens and the siren timeline stay unchanged',()=>{
 const cs=cuesFor({finale:{creditsVersion:1}});for(const id of ['wife-12','wife-13','wife-14']){const index=cs.findIndex(c=>c.id===id),c={finale:{creditsVersion:1,index,mediaStartedAt:100000}};assert.equal(wifePresentation(c,104000).visible,id==='wife-14');assert.equal(cs[index].volume,1);}
 assert.equal(cs.find(c=>c.id==='wife-13').durationMs,8672.65306122449);
});
test('updated garage asset uses the existing path and exact supplied bytes',()=>{
 assert.equal(cameras.garage,'/assets/chapter8/ch8_cam05_garag.png');const b=fs.readFileSync('.'+cameras.garage);assert.equal(b.length,1722933);assert.equal(b.readUInt32BE(16),1850);assert.equal(b.readUInt32BE(20),850);assert.equal(createHash('sha256').update(b).digest('hex'),'213fed188dc38298a1091089e066c1704eb49f30e4a624d87d6e3dbc0253fe94');
});
test('static uses one anchored layer throughout all five glitches and stops before black / Collector; refresh resumes canonical offset',async()=>{
 let now=100000;const media=new Map(soundLayers.map(c=>[c.id,{readyState:4,paused:true,currentTime:0,plays:0,volume:0,play(){this.paused=false;this.plays++;return Promise.resolve();},pause(){this.paused=true;}}]));const sound=new Chapter8SoundDesign({media},()=>now,{Context:null}),c={step:'finale',finale:{id:'f',polishVersion:8,phaseAt:100000}};
 let offset=0;for(let n=0;n<5;n++){c.finale.phaseAt=100000+offset;now=c.finale.phaseAt+50;sound.update(c,{id:'ending-glitch-'+(n+1),glitch:n+1});assert.equal(media.get('ending-static').plays,1);assert(media.get('ending-static').volume<=.28);assert.equal(sound.active.get('ending-static').anchor,100000);offset+=GLITCH_DURATIONS[n];}
 assert.equal(offset,5000);assert.equal(effects.static.playDurationMs,5000);assert.equal(effects.static.src,'/assets/chapter7/audio/ch7_connection_recovery.mp3');now=104900;sound.update(c,{glitch:5});assert(media.get('ending-static').volume<.28);now=105000;sound.update(c,{id:'collector-black'});assert(media.get('ending-static').paused);assert.equal(media.get('ending-static').loop,false);sound.stop();
});
test('sample-clock static source stops exactly at glitch end even without animation frames, seeks on refresh, and closes on cleanup',async()=>{
 const sources=[],ramps=[];let closed=0;
 class Context{constructor(){this.currentTime=10;this.state='running';this.destination={};}decodeAudioData(){return Promise.resolve({duration:140544/44100});}createBufferSource(){const s={connect(){},disconnect(){},start(...a){this.startAt=a;},stop(t){this.stopAt=t;}};sources.push(s);return s;}createGain(){return {gain:{value:0,setValueAtTime(...a){ramps.push(a);},linearRampToValueAtTime(...a){ramps.push(a);}},connect(){},disconnect(){}};}close(){closed++;return Promise.resolve();}}
 const audio=new EndingStaticPlayback({Context,fetchAudio:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});await flush();assert.equal(audio.duration,5);audio.volume=layerVolume('ending-static',4000);audio.currentTime=4;await audio.play();assert.equal(sources.length,1);assert.equal(sources[0].stopAt,11);assert(Math.abs(sources[0].startAt[1]-(4%(140544/44100)))<.00001);assert.deepEqual(ramps.at(-1),[0,11]);audio.context.currentTime=11;sources[0].onended();assert(audio.paused);assert(audio.ended);audio.removeAttribute('src');assert.equal(closed,1);
});
