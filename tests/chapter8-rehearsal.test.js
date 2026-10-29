import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {finaleCues,version2FinaleCues,finaleCue,cameras,SILENCE_MS,SCARE_MS} from '../chapter8-finale-timing.js';
import {makeChapter8Starter,chapter8HostAction,advanceChapter8} from '../api/_chapter8.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
import {UNCHANGED} from '../api/_state.js';
import {Chapter8SoundDesign,soundLayers} from '../chapter8-sound-design.js';
import {finaleAmbientTarget} from '../chapter8-presentation.js';
const idx=id=>finaleCues.findIndex(c=>c.id===id);
test('wife instance shares original narrator style bodies and only supplies theme colors, without independent backgrounds or keyframes',()=>{
 const css=fs.readFileSync('chapter5.css','utf8'),wife=fs.readFileSync('chapter8.css','utf8'),component=fs.readFileSync('narrator-screen.js','utf8');
 assert(css.includes('#chapter5-radio,.brookwood-narrator{background:'));
 assert(css.includes('#chapter5-radio::after,.brookwood-narrator::after{'));
 assert(css.includes('var(--narrator-edge,#3a171b)'));assert(css.includes('var(--narrator-mid,#110b10)'));assert(css.includes('var(--narrator-dark,#000)'));
 assert(component.includes("{theme='wife'}"));assert(component.includes('source.cloneNode(true)'));assert(component.includes('brookwood-narrator'));
 assert(!wife.includes('.ch8-wife::after'));assert(!/\.ch8-wife[^{]*\{[^}]*radial-gradient/.test(wife));assert(!wife.includes('@keyframes'));assert(!wife.includes('.ch8-wife .broadcast-status{'));
});
test('first alert opens the distant driveway asset, never the close doorbell view; side and backyard retain their full visits',()=>{
 const first=finaleCues.find(c=>c.zoom?.direction==='in');assert.equal(first.visual,'driveway');assert.equal(cameras[first.visual],'/assets/chapter8/ch8_cam01_driveway.png');assert.notEqual(cameras[first.visual],cameras.porch);
 assert.equal(finaleCues[idx('wife-05')].visual,'driveway');
 for(const name of ['side','backyard']){assert.equal(finaleCues[idx(name+'-open')].visual,name);assert.equal(finaleCues[idx(name+'-hold')].durationMs,2500);assert.equal(finaleCues[idx(name+'-grid-pause')].durationMs,2500);}
 assert(finaleCues.slice(0,idx('backyard-grid-pause')+1).every(c=>!c.id.startsWith('doorbell-')&&!c.src?.endsWith('doorbell.mp3')));
 assert.equal(finaleCues[idx('wife-08')].visual,'front');assert.equal(cameras.front,cameras.porch);
});
test('native wife-12 completion gates five silent seconds, then one two-second scare and SIGNAL LOST; refresh cannot extend either hold',()=>{
 const s=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},'chapter8-finale')(s);const c=s.chapter8,f=c.finale;f.index=idx('wife-12');f.phaseAt=100000;f.mediaStartedAt=100000;f.deadline=null;
 const cue=finaleCue(c);assert.equal(cue.durationMs,4675.918367346939);assert.equal(cue.visual,'living');assert.equal(advanceChapter8(s,999999),UNCHANGED);
 const body=()=>({generation:s.generation,chapter8Id:c.id,sequence:c.sequence,finaleId:f.id,cueId:finaleCue(c).id});
 assert.throws(()=>chapter8HostAction(s,{...body(),action:'chapter8-finale-ended'},101000),/complete recording/);
 chapter8HostAction(s,{...body(),action:'chapter8-finale-ended'},100000+cue.durationMs);assert.equal(finaleCue(c).id,'living-silence');assert.equal(f.deadline,null);
 chapter8HostAction(s,{...body(),action:'chapter8-finale-ready'},105000);assert.equal(SILENCE_MS,5000);assert.equal(f.deadline,110000);
 assert.equal(advanceChapter8(s,109999),UNCHANGED);const refreshed=structuredClone(s);advanceChapter8(refreshed,110000);assert.equal(finaleCue(refreshed.chapter8).id,'intruder-reveal');assert.equal(SCARE_MS,2000);assert.equal(refreshed.chapter8.finale.deadline,112000);advanceChapter8(refreshed,112000);assert.equal(finaleCue(refreshed.chapter8).visual,'lost');
 assert.equal(finaleCues.filter(c=>c.visual==='scare').length,1);assert.equal(finaleCues[idx('living-silence')-1].id,'wife-12');assert.equal(finaleCues[idx('wife-12')-1].id,'whistle-approach');
 assert.equal(finaleCue({finale:{polishVersion:2,index:version2FinaleCues.findIndex(c=>c.id==='living-silence')}}).durationMs,3500);
});
test('silent hold has no active music or effects; impact starts at reveal, is stronger, stays below unity and expires once',async()=>{
 let now=100000;const media=new Map(soundLayers.map(s=>[s.id,{paused:true,readyState:4,currentTime:0,volume:0,plays:0,pause(){this.paused=true;},play(){this.paused=false;this.plays++;return Promise.resolve();}}]));
 const sound=new Chapter8SoundDesign({media},()=>now,{Context:null});const c={step:'finale',finale:{id:'f',polishVersion:3,index:idx('living-silence'),phaseAt:100000,mediaStartedAt:null}};
 sound.update(c,finaleCue(c));assert([...media.values()].every(a=>a.paused));assert.equal(finaleAmbientTarget(c,now),0);
 c.finale.index=idx('intruder-reveal');sound.update(c,finaleCue(c));await new Promise(r=>setImmediate(r));const impact=media.get('scare-impact');assert.equal(impact.plays,1);assert.equal(impact.currentTime,.2);assert.equal(impact.volume,.8);assert(impact.volume>.24&&impact.volume<=1);
 now+=1800;sound.update(c,finaleCue(c));assert(impact.volume>.7);assert.equal(impact.plays,1);now+=200;sound.update(c,finaleCue(c));assert(impact.paused);sound.stop();
});
