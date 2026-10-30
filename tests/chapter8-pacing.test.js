import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {version1FinaleCues as finaleCues,legacyFinaleCues,finaleCue,GAME_TITLE,GAME_TITLE_AT_MS,WIFE_RELAX_AT_MS} from '../chapter8-finale-timing.js';
import {wifePresentation,finaleAmbientTarget} from '../chapter8-presentation.js';
import {sirenWindows,Chapter8SoundDesign,soundLayers} from '../chapter8-sound-design.js';
import {validateChapter8,advanceChapter8} from '../api/_chapter8.js';
import {makeChapter8Starter} from '../api/_chapter8.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
const index=id=>finaleCues.findIndex(c=>c.id===id);
function scene(id,offset=0){return {step:'finale',finale:{id:'f',polishVersion:1,startedAt:100000,index:index(id),phaseAt:100000,mediaStartedAt:100000},offset};}

test('only two opening notifications precede wife-04, with distinct full windows and a 1200-ms gap; the single later alert belongs to wife-06',()=>{
 const notices=finaleCues.filter(c=>c.src?.endsWith('security-notification.wav'));assert.deepEqual(notices.map(c=>c.id),['notification-first','notification-second','motion-notification']);
 assert.equal(notices[1].at-notices[0].end,1200);assert(notices[1].end<finaleCues[index('wife-04')].at);assert(notices.slice(0,2).every(c=>c.visual==='wife-bright'));
 assert(index('wife-05')<index('motion-notification'));assert(index('motion-notification')<index('wife-06'));assert(index('wife-06')<index('side-observe'));
});

test('wife title uses the recorded game name, native clip offset and original speech order; return stays cold until explicit relaxation',()=>{
 assert.equal(GAME_TITLE,'THE GREAT HALLOWEEN PARTY RESCUE');const c=scene('wife-02');assert.equal(wifePresentation(c,100000).title,'');assert.equal(wifePresentation(c,100000+GAME_TITLE_AT_MS).title,GAME_TITLE);assert.equal(wifePresentation(c,108101).title,'');
 for(const id of ['wife-05','wife-08','wife-09','wife-14','wife-15'])assert.equal(wifePresentation(scene(id),100500).mood,'cold');
 const ending=scene('wife-16');assert.equal(wifePresentation(ending,100000+WIFE_RELAX_AT_MS-1).mood,'cold');assert.equal(wifePresentation(ending,100000+WIFE_RELAX_AT_MS).mood,'warm');
 assert.deepEqual(finaleCues.filter(c=>c.kind==='narration').map(c=>c.id),legacyFinaleCues.filter(c=>c.kind==='narration').map(c=>c.id));
});

test('camera pacing keeps readable grid/feed holds, both doorbells on the grid, and a breach warning before the garage feed',()=>{
 assert.equal(finaleCues[index('grid-driveway')].durationMs,2500);
 for(const id of ['grid-side','grid-backyard','grid-porch','porch-return-grid'])assert(finaleCues[index(id)].durationMs>=1500);
 for(const id of ['driveway-observe','side-observe','backyard-observe','porch-observe','garage-observe'])assert(finaleCues[index(id)].durationMs>=3000);
 for(const id of ['doorbell-before','doorbell-after'])assert.equal(finaleCues[index(id)].visual,'grid');
 assert(index('doorbell-before')<index('wife-08')&&index('wife-08')<index('porch-observe'));assert(index('doorbell-after')<index('wife-09')&&index('wife-09')<index('garage-observe'));
 for(const id of ['garage-alarm-lead','garage-announcement','garage-alarm-release'])assert.equal(finaleCues[index(id)].visual,'grid');assert(index('garage-alarm-release')<index('garage-observe'));
});

test('ambience policy ducks wife speech, fades before silence, restores for escape and cannot bleed into news',()=>{
 assert.equal(finaleAmbientTarget(scene('wife-01'),101000),.035);assert.equal(finaleAmbientTarget(scene('grid-driveway'),101000),.07);
 const approach=scene('whistle-approach');assert.equal(finaleAmbientTarget(approach,110399),.025);assert.equal(finaleAmbientTarget(approach,111400),0);
 for(const id of ['living-silence','intruder-reveal','signal-break','wife-12','breaking-news','news-out'])assert.equal(finaleAmbientTarget(scene(id),100500),0);
 assert(finaleAmbientTarget(scene('wife-13'),100500)>0);assert.equal(finaleAmbientTarget(scene('news-black'),102000),0);
});

test('two overlapping siren windows have equal-power crossfades and never expose the recording tail',()=>{
 for(let t=0;t<120000;t+=100){const windows=sirenWindows(t);assert(windows.length>=1&&windows.length<=2);for(const w of windows){assert(w.age>=0&&w.age<14000);assert(2000+w.age<16000);}
  if(windows.length===2)assert(Math.abs(windows.reduce((s,w)=>s+w.gain*w.gain,0)-1)<1e-9);
 }
});

test('sirens remain present after 31.6 seconds, reconstruct mid-crossfade, fade only at news-black and stop before the anchor',()=>{
 let now=100000;const media=new Map(soundLayers.map(s=>[s.id,{currentTime:0,paused:true,plays:0,readyState:4,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;}}]));
 const s=new Chapter8SoundDesign({media},()=>now,{Context:null}),c=scene('wife-15');c.finale.soundAnchors={sirens:100000};
 now=133000;s.update(c,finaleCues[index('wife-15')]);assert([...media.values()].some(a=>!a.paused&&a.volume>0));
 now=137000;s.update(c,finaleCues[index('wife-15')]);assert.equal([...s.active.keys()].filter(k=>k.startsWith('approaching-sirens')).length,2);
 c.finale.phaseAt=137000;s.update(c,finaleCues[index('news-black')]);const before=[...media.values()].reduce((sum,a)=>sum+(a.volume??0),0);now=138000;s.update(c,finaleCues[index('news-black')]);assert([...media.values()].reduce((sum,a)=>sum+(a.volume??0),0)<before);
 now=139000;s.update(c,finaleCues[index('breaking-news')]);assert([...media.values()].every(a=>a.paused));
});

test('saved unversioned 41-cue runs retain their exact cue identity/duration after refresh; new runs use polish version 1',()=>{
 const state=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},'chapter8-finale')(state);assert.equal(state.chapter8.finale.polishVersion,8);
 const f=state.chapter8.finale;delete f.polishVersion;f.index=5;f.deadline=f.phaseAt+900;assert.equal(finaleCue(state.chapter8).id,'grid-driveway');assert.equal(legacyFinaleCues.length,41);validateChapter8(state);advanceChapter8(state,f.deadline);assert.equal(finaleCue(state.chapter8).id,'motion-notification');
});

test('wife presentation reuses the established narrator waveform and scopes warm/cold/security styling to Chapter 8',()=>{
 const js=fs.readFileSync('chapter8-finale.js','utf8'),css=fs.readFileSync('chapter8.css','utf8');assert(js.includes("new NarratorScreen(document,{theme:'wife'})"));assert(fs.readFileSync('narrator-screen.js','utf8').includes('source.cloneNode(true)'));assert(js.includes('SECURITY BREACH'));assert(fs.readFileSync('narrator-screen.js','utf8').includes("mood==='warm'"));assert(!js.includes('requestAnimationFrame('));assert(!js.includes('setTimeout('));
});
