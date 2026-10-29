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
test('wife uses the complete Chapter 7 hierarchy, original stylesheet and shared renderer; only theme colors change',()=>{
 const component=fs.readFileSync('narrator-screen.js','utf8'),chapter7=fs.readFileSync('chapter7-story.js','utf8');
 assert(component.includes("getElementById('chapter7Investigation')"));assert(component.includes("getElementById('chapter7TV')"));assert(component.includes('source.cloneNode(true)'));assert(component.includes('parent.cloneNode(false)'));assert(component.includes("dependency.href='/chapter7.css'"));assert(component.includes('attachShadow'));assert(!component.includes('chapter5'));assert(chapter7.includes('this.narrator.update('));
 assert(!component.includes('<svg'));assert(!component.includes('@keyframes'));assert(!component.includes('radial-gradient'));
});
test('first alert opens the distant driveway asset, never the close doorbell view; side and backyard retain their full visits',()=>{
 const first=finaleCues.find(c=>c.zoom?.direction==='in');assert.equal(first.visual,'driveway');assert.equal(cameras[first.visual],'/assets/chapter8/ch8_cam01_driveway.png');assert.notEqual(cameras[first.visual],cameras.porch);
 assert.equal(finaleCues[idx('wife-05')].visual,'driveway');
 for(const name of ['side','backyard']){assert.equal(finaleCues[idx(name+'-open')].visual,name);assert.equal(finaleCues[idx(name+'-hold')].durationMs,2500);assert.equal(finaleCues[idx(name+'-grid-pause')].durationMs,2500);}
 assert(finaleCues.slice(0,idx('backyard-grid-pause')+1).every(c=>!c.id.startsWith('doorbell-')&&!c.src?.endsWith('doorbell.mp3')));
 assert.equal(finaleCues[idx('wife-08')].visual,'front');assert.equal(cameras.front,cameras.porch);
});
test('five silent seconds precede the two-second scare, then the entire native warning occupies SIGNAL LOST without an extra hold',()=>{
 const s=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},'chapter8-finale')(s);const c=s.chapter8,f=c.finale;f.index=idx('living-silence');f.phaseAt=100000;f.mediaStartedAt=null;f.deadline=null;
 const body=()=>({generation:s.generation,chapter8Id:c.id,sequence:c.sequence,finaleId:f.id,cueId:finaleCue(c).id});
 chapter8HostAction(s,{...body(),action:'chapter8-finale-ready'},100000);assert.equal(f.deadline,105000);assert.equal(advanceChapter8(s,104999),UNCHANGED);
 const refreshed=structuredClone(s);advanceChapter8(refreshed,105000);assert.equal(finaleCue(refreshed.chapter8).id,'intruder-reveal');assert.equal(refreshed.chapter8.finale.deadline,107000);advanceChapter8(refreshed,107000);assert.equal(finaleCue(refreshed.chapter8).id,'wife-12');assert.equal(finaleCue(refreshed.chapter8).visual,'lost');assert.equal(finaleCue(refreshed.chapter8).durationMs,4675.918367346939);assert.equal(finaleCue(refreshed.chapter8).syncVisualToAudio,true);assert.equal(refreshed.chapter8.finale.mediaStartedAt,null);
 assert.equal(advanceChapter8(refreshed,999999),UNCHANGED);assert.equal(finaleCues[idx('living-silence')-1].id,'whistle-approach');assert.equal(finaleCues[idx('intruder-reveal')+1].id,'wife-12');assert.equal(finaleCues.filter(c=>c.visual==='scare').length,1);assert(!finaleCues.some(c=>c.id==='signal-break'));
 assert.equal(finaleCue({finale:{polishVersion:2,index:version2FinaleCues.findIndex(c=>c.id==='living-silence')}}).durationMs,3500);
});
test('silent hold has no active music or effects; impact starts at reveal, is stronger, stays below unity and expires once',async()=>{
 let now=100000;const media=new Map(soundLayers.map(s=>[s.id,{paused:true,readyState:4,currentTime:0,volume:0,plays:0,pause(){this.paused=true;},play(){this.paused=false;this.plays++;return Promise.resolve();}}]));
 const sound=new Chapter8SoundDesign({media},()=>now,{Context:null});const c={step:'finale',finale:{id:'f',polishVersion:4,index:idx('living-silence'),phaseAt:100000,mediaStartedAt:null}};
 sound.update(c,finaleCue(c));assert([...media.values()].every(a=>a.paused));assert.equal(finaleAmbientTarget(c,now),0);
 c.finale.index=idx('intruder-reveal');sound.update(c,finaleCue(c));await new Promise(r=>setImmediate(r));const impact=media.get('scare-impact');assert.equal(impact.plays,1);assert.equal(impact.currentTime,.2);assert.equal(impact.volume,.8);assert(impact.volume>.24&&impact.volume<=1);
 now+=1800;sound.update(c,finaleCue(c));assert(impact.volume>.7);assert.equal(impact.plays,1);now+=200;sound.update(c,finaleCue(c));assert(impact.paused);sound.stop();
});
