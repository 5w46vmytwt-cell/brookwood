import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {finaleCues,finaleCue,version1FinaleCues,legacyFinaleCues,cameras,CAMERA_HOLD_MS,GRID_PAUSE_MS} from '../chapter8-finale-timing.js';
import {cameraFrame} from '../chapter8-camera.js';
import {finaleAmbientTarget,finaleMustBeSilent} from '../chapter8-presentation.js';
import {makeChapter8Starter,chapter8HostAction,advanceChapter8,validateChapter8} from '../api/_chapter8.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
import {UNCHANGED} from '../api/_state.js';
const index=id=>finaleCues.findIndex(c=>c.id===id);

test('front, side and backyard visits follow grid alert, open, correct native narration, 2.5-second hold, close and 2.5-second grid pause',()=>{
 for(const [name,camera,n] of [['front','driveway',5],['side','side',6],['backyard','backyard',7]]){
  const cues=finaleCues.slice(index(name+'-motion'),index(name+'-grid-pause')+1);
  assert.deepEqual(cues.map(c=>c.id),[name+'-motion',name+'-alert-register',name+'-open','wife-0'+n,name+'-hold',name+'-close',name+'-grid-pause']);
  assert.equal(cues[0].visual,'grid');assert.equal(cues[0].motion,true);assert.equal(cues[2].readyImage,camera);assert.equal(cues[2].zoom.direction,'in');assert.equal(cues[3].visual,camera);assert.equal(cues[3].kind,'narration');assert.equal(cues[4].visual,camera);assert.equal(cues[4].durationMs,2500);assert.equal(cues[5].zoom.direction,'out');assert.equal(cues[6].visual,'grid');assert.equal(cues[6].durationMs,2500);
 }
 assert.equal(CAMERA_HOLD_MS,2500);assert.equal(GRID_PAUSE_MS,2500);assert.equal(cameras.driveway,'/assets/chapter8/ch8_cam01_driveway.png');assert.notEqual(cameras.driveway,cameras.porch);assert(index('doorbell-before')>index('backyard-grid-pause'));
});

test('doorbells bracket the complete front-door warning without a grid cut or wife screen between them',()=>{
 const start=index('doorbell-before'),end=index('doorbell-grid-pause'),cues=finaleCues.slice(start,end+1);
 assert.deepEqual(cues.map(c=>c.id),['doorbell-before','doorbell-open','wife-08','doorbell-after','doorbell-hold','doorbell-close','doorbell-grid-pause']);assert.equal(cues[0].visual,'grid');
 for(const c of cues.slice(1,-1))assert.equal(c.visual,'front');assert.equal(cues[3].kind,'effect');assert.equal(cues[4].durationMs,2500);assert.equal(cues.at(-1).durationMs,2500);
});

test('breach completes on grid before opening garage; garage narration/hold close to grid before living-room narration, whistle and scare',()=>{
 assert(index('garage-alarm-lead')>index('doorbell-grid-pause'));
 const ids=finaleCues.slice(index('garage-alarm-lead'),index('living-silence')).map(c=>c.id);
 assert.deepEqual(ids,['garage-alarm-lead','garage-announcement','garage-alarm-release','garage-open','wife-09','garage-hold','garage-close','garage-grid-pause','interior-door','living-open','wife-10','wife-11','whistle-approach']);
 for(const id of ['garage-alarm-lead','garage-announcement','garage-alarm-release'])assert.equal(finaleCues[index(id)].visual,'grid');
 assert.equal(finaleCues[index('wife-09')].visual,'garage');for(const id of ['wife-10','wife-11','whistle-approach','living-silence'])assert.equal(finaleCues[index(id)].visual,'living');assert.equal(finaleCues[index('whistle-approach')].cameraSwitchMs,undefined);assert.equal(finaleCues[index('living-silence')].durationMs,5000);
});

test('zoom is deterministic, starts from the real grid tile, fits the contained 4:3 feed and reverses without black frames',()=>{
 for(const camera of ['front','side','backyard','garage','living']){
  const open=finaleCues.find(c=>c.zoom?.camera===camera&&c.zoom.direction==='in'),close={...open,zoom:{camera,direction:'out'}};
  const start=cameraFrame(open,0),middle=cameraFrame(open,900),end=cameraFrame(open,1400);assert.equal(start.scale,1);assert.equal(start.feedOpacity,0);assert.equal(end.scale,2.25);assert.equal(end.feedOpacity,1);assert(middle.scale>1&&middle.scale<end.scale);assert.equal(cameraFrame(open,1400,false).scale,1);
  assert.deepEqual(cameraFrame(close,0),end);assert.deepEqual(cameraFrame(close,1400),start);assert.equal(cameraFrame(open,1400,true,1).scale,3);
 }
});

test('camera-open readiness cannot be advanced by elapsed time before decode; duplicate readiness and refresh preserve deadline',()=>{
 const s=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},'chapter8-finale')(s);const f=s.chapter8.finale;f.index=index('front-open');f.deadline=null;validateChapter8(s);assert.equal(advanceChapter8(s,f.phaseAt+100000),UNCHANGED);
 const b={action:'chapter8-finale-ready',generation:s.generation,chapter8Id:s.chapter8.id,sequence:s.chapter8.sequence,finaleId:f.id,cueId:'front-open'},now=f.phaseAt+2000;chapter8HostAction(s,b,now);const deadline=f.deadline;assert.equal(deadline,now+1400);assert.equal(chapter8HostAction(s,b,now+1000),UNCHANGED);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.chapter8.finale.deadline,deadline);advanceChapter8(restored,deadline);assert.equal(finaleCue(restored.chapter8).id,'wife-05');assert.equal(restored.chapter8.finale.mediaStartedAt,null);assert.equal(finaleCue(restored.chapter8).visual,'driveway');
});

test('version 2 music fades out once at takeover and never returns underneath narration, effects or final narration',()=>{
 const c={finale:{polishVersion:4,index:0,phaseAt:100000,mediaStartedAt:null}};assert.equal(finaleAmbientTarget(c,100000),.07);assert.equal(finaleAmbientTarget(c,101600),0);
 for(let i=1;i<finaleCues.length;i++){c.finale.index=i;assert.equal(finaleAmbientTarget(c,150000),0);assert(finaleMustBeSilent(c));}
});

test('wife reuses husband source DOM, microphone geometry and sampled broadcast animation, with no replacement SVG or waveform system',()=>{
 const source=fs.readFileSync('narrator-screen.js','utf8'),view=fs.readFileSync('chapter8-finale.js','utf8');assert(source.includes("getElementById('chapter7Investigation')"));assert(source.includes('source.cloneNode(true)'));assert(source.includes("dependency.href='/chapter7.css'"));assert(source.includes('attachShadow'));assert(!source.includes('<svg'));assert(!view.includes('<svg'));assert(!view.includes('wifeLight'));assert(!view.includes('requestAnimationFrame('));assert(!view.includes('setInterval('));assert(!view.includes('setTimeout('));
});

test('all narration order/media windows remain unchanged; old 41/57 cue runs retain their stored index mapping',()=>{
 for(const version of [legacyFinaleCues,version1FinaleCues])assert.deepEqual(finaleCues.filter(c=>c.kind==='narration').map(c=>[c.id,c.src,c.durationMs]),version.filter(c=>c.kind==='narration').map(c=>[c.id,c.src,c.durationMs]));
 assert.equal(legacyFinaleCues.length,41);assert.equal(version1FinaleCues.length,57);assert.equal(finaleCue({finale:{polishVersion:1,index:12}}).id,version1FinaleCues[12].id);
});
