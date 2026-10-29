import test from 'node:test';import assert from 'node:assert/strict';
import {finaleCues,version3FinaleCues,version4FinaleCues,finaleCue} from '../chapter8-finale-timing.js';
import {wifePresentation} from '../chapter8-presentation.js';
import {narratorFrame} from '../chapter7-story-timing.js';
const cue=id=>finaleCues.find(c=>c.id===id);
test('the canonical scare cut is whistle, 5-second silence, 2-second scare, full warning with SIGNAL LOST, then escape; offsets are contiguous',()=>{
 const at=finaleCues.findIndex(c=>c.id==='whistle-approach');assert.deepEqual(finaleCues.slice(at,at+6).map(c=>c.id),['whistle-approach','living-silence','intruder-reveal','wife-12','signal-lost-pause','wife-13']);
 assert.equal(cue('living-silence').durationMs,5000);assert.equal(cue('intruder-reveal').durationMs,2000);assert.equal(cue('wife-12').src,'/assets/chapter8/audio/wife-12.mp3');assert.equal(cue('wife-12').durationMs,4675.918367346939);assert.equal(cue('wife-12').visual,'lost');assert(cue('wife-12').syncVisualToAudio);
 for(let i=1;i<finaleCues.length;i++)assert.equal(finaleCues[i].at,finaleCues[i-1].end);
 for(const c of finaleCues.slice(finaleCues.findIndex(c=>c.id==='wife-13'))){const before=version4FinaleCues.find(b=>b.id===c.id);assert.equal(c.src,before.src);assert.equal(c.durationMs,before.durationMs);assert(Math.abs(c.at-(before.at+5745.986394557823))<.00001);}
 const oldIndex=version3FinaleCues.findIndex(c=>c.id==='wife-12');assert.equal(finaleCue({finale:{polishVersion:3,index:oldIndex}}).visual,'living');
});
test('wife presentation uses the exact Chapter 7 entry/exit formula, reconstructed from media clocks rather than mount time',()=>{
 for(const id of ['wife-01','wife-13','wife-14','wife-16'])for(const offset of [0,2000,3500,4750,6000]){
  const index=finaleCues.findIndex(c=>c.id===id),c={finale:{polishVersion:5,index,mediaStartedAt:100000}};
  const end=['wife-13','wife-16'].includes(id)?cue(id).durationMs:Infinity;assert.equal(wifePresentation(c,100000+offset).opacity,narratorFrame(offset,end).scene);
 }
 for(const id of ['wife-04','wife-15']){const index=finaleCues.findIndex(c=>c.id===id),c={finale:{polishVersion:5,index,mediaStartedAt:100000}},duration=cue(id).durationMs;assert(Math.abs(wifePresentation(c,100000+duration-500).opacity-.5)<1e-9);assert(wifePresentation(c,100000+duration).opacity<1e-9);}
});
