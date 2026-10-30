import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {version5FinaleCues as finaleCues,version4FinaleCues,finaleCue,cuesFor} from '../chapter8-finale-timing.js';
import {whistleGain,primaryEffectGain,effects,Chapter8SoundDesign,soundLayers} from '../chapter8-sound-design.js';
import {makeChapter8Starter,chapter8HostAction,advanceChapter8,validateChapter8} from '../api/_chapter8.js';
import {finalNarrationFixture} from './chapter7-fixture.js';import {UNCHANGED} from '../api/_state.js';import {wifePresentation,finaleAmbientTarget} from '../chapter8-presentation.js';
const idx=id=>finaleCues.findIndex(c=>c.id===id),cue=id=>finaleCues[idx(id)];
test('one extra full native notification and 350-ms separation immediately precede the complete camera-system question; existing grid alerts remain',()=>{
 const at=idx('wife-04');assert.deepEqual(finaleCues.slice(at-2,at+1).map(c=>c.id),['camera-question-notification','camera-question-gap','wife-04']);
 const notification=cue('camera-question-notification');assert.equal(notification.src,'/assets/chapter8/audio/security-notification.wav');assert.equal(notification.durationMs,effects.notification.sourceDurationMs);assert.equal(notification.visual,'wife-bright');assert.equal(cue('camera-question-gap').durationMs,350);assert.equal(cue('camera-question-gap').end,cue('wife-04').at);
 assert.equal(finaleCues.filter(c=>c.src===effects.notification.src).length,4);assert.deepEqual(finaleCues.filter(c=>c.motion).map(c=>c.id),version4FinaleCues.filter(c=>c.motion).map(c=>c.id));
});
test('new whistle envelope is smooth, louder throughout, stronger in the final third and bounded below unity; timing and filtering stay intact',()=>{
 const whistle=cue('whistle-approach');assert.equal(whistle.durationMs,11400);assert.equal(whistle.offsetMs,2800);assert.equal(primaryEffectGain(whistle,0),.33);assert(Math.abs(primaryEffectGain(whistle,11400)-.95)<1e-9);
 let previous=.33;for(let ms=0;ms<=11400;ms+=10){const value=primaryEffectGain(whistle,ms);assert(value>=previous&&value<1);assert(value>whistleGain(ms,4));assert(value-previous<.002);previous=value;}
 assert(whistleGain(9900,5)-whistleGain(9100,5)>whistleGain(4200,5)-whistleGain(3400,5));
 assert.equal(cue('living-silence').at,whistle.end);assert.equal(cue('living-silence').durationMs,5000);assert.equal(cue('intruder-reveal').durationMs,2000);
});
test('native warning completion creates the 3.5-second SIGNAL LOST hold; timers, duplicate end requests and refresh cannot shorten or restart it',()=>{
 const s=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},'chapter8-finale')(s);const c=s.chapter8,f=c.finale;f.index=idx('wife-12');f.phaseAt=100000;f.mediaStartedAt=100000;f.deadline=null;
 const body={action:'chapter8-finale-ended',generation:s.generation,chapter8Id:c.id,sequence:c.sequence,finaleId:f.id,cueId:'wife-12'};assert.equal(advanceChapter8(s,200000),UNCHANGED);assert.throws(()=>chapter8HostAction(s,body,101000),/complete recording/);
 const endedAt=100000+cue('wife-12').durationMs;chapter8HostAction(s,body,endedAt);assert.equal(finaleCue(c).id,'signal-lost-pause');assert.equal(f.phaseAt,endedAt);assert.equal(f.deadline,endedAt+3500);assert.throws(()=>chapter8HostAction(s,body,endedAt+20),/scene changed/);
 const refresh=structuredClone(s);validateChapter8(refresh);assert.equal(advanceChapter8(refresh,f.deadline-1),UNCHANGED);advanceChapter8(refresh,f.deadline);assert.equal(finaleCue(refresh.chapter8).id,'wife-13');assert.equal(refresh.chapter8.finale.mediaStartedAt,null);assert.equal(refresh.chapter8.finale.soundAnchors?.sirens,undefined);
});
test('post-warning hold is genuinely silent and SIGNAL LOST throughout; next wife screen and sirens cannot start in that hold',()=>{
 const c={step:'finale',finale:{id:'pause',polishVersion:5,index:idx('signal-lost-pause'),phaseAt:100000,mediaStartedAt:null}},media=new Map(soundLayers.map(s=>[s.id,{paused:true,pause(){this.paused=true;},readyState:4,currentTime:0}]));
 const sound=new Chapter8SoundDesign({media},()=>102000,{Context:null});sound.update(c,finaleCue(c));assert.equal(sound.active.size,0);assert([...media.values()].every(a=>a.paused));assert.equal(finaleCue(c).visual,'lost');assert.equal(wifePresentation(c,102000).visible,false);assert.equal(finaleAmbientTarget(c,102000),0);
});
test('version-4 saves keep their exact cue windows and whistle gains; all established camera and breach cues retain native durations',()=>{
 assert.equal(cuesFor({finale:{polishVersion:4}}),version4FinaleCues);
 for(const old of version4FinaleCues){const current=cue(old.id);assert.equal(current.durationMs,old.durationMs);assert.equal(current.visual,old.visual);assert.equal(current.src,old.src);}
 const oldWhistle=version4FinaleCues.find(c=>c.id==='whistle-approach');assert.equal(primaryEffectGain(oldWhistle,0),.14);assert.equal(primaryEffectGain(oldWhistle,11400),.8);
 const css=fs.readFileSync('chapter8.css','utf8');assert(css.includes('.ch8-finale[data-visual=grid][data-motion=true] .ch8-camera-label{left:50%;top:50%;transform:translate(-50%,-50%)'));assert(css.includes('.ch8-security-breach{position:absolute;inset:28% 10%'));assert(!css.includes('[data-motion=true] .ch8-security-breach'));
});
