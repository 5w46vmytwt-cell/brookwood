import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {mp3Metadata} from './mp3-metadata.js';
import {finaleCues,shortIntroFinaleCues,shortWifeIntro,cuesFor,finaleCue} from '../chapter8-finale-timing.js';
import {startFinale,finaleHostAction,advanceFinale,validateFinale} from '../api/_chapter8-finale.js';
import {wifePresentation} from '../chapter8-presentation.js';
import {UNCHANGED} from '../api/_state.js';
const body=(c,action)=>({action,sequence:c.sequence,finaleId:c.finale.id,cueId:finaleCue(c).id});
test('supplied short intro has exact original bytes and measured duration, with backups untouched',()=>{
 const b=fs.readFileSync(shortWifeIntro.src.slice(1)),m=mp3Metadata(b);
 assert.equal(createHash('sha256').update(b).digest('hex'),'c5703848ac2b79315e82196140a164d1f774f5720566a2d29e16de2958410f26');assert.equal(m.durationMs,shortWifeIntro.durationMs);assert.equal(m.sampleRate,44100);assert.equal(m.channels,1);assert.deepEqual(m.bitrates,[128]);assert.equal(shortWifeIntro.volume,1);
 const media=JSON.parse(fs.readFileSync('chapter8-finale-media.json'));
 for(const n of ['01','02','03','04']){const old=media.find(m=>m.src.endsWith('/wife-'+n+'.mp3'));assert.equal(createHash('sha256').update(fs.readFileSync(old.src.slice(1))).digest('hex'),old.sha256);}
});
test('short opening omits 01/02/03 and preserves every interruption/downstream property and relative offset',()=>{
 assert(!shortIntroFinaleCues.some(c=>['wife-01','wife-02','wife-03'].includes(c.id)));assert.equal(shortIntroFinaleCues[1].id,'wife-intro-short');
 const old=finaleCues.slice(finaleCues.findIndex(c=>c.id==='camera-question-notification')),next=shortIntroFinaleCues.slice(2),clean=({at,end,...c})=>c;
 assert.deepEqual(next.map(clean),old.map(clean));
 const saved=finaleCues.filter(c=>['wife-01','wife-02','wife-03'].includes(c.id)).reduce((n,c)=>n+c.durationMs,0)-shortWifeIntro.durationMs;
 assert(Math.abs(saved-27428.57142857143)<.00001);for(let i=0;i<old.length;i++){assert(Math.abs(old[i].at-next[i].at-saved)<.00001);assert(Math.abs(old[i].end-next[i].end-saved)<.00001);}
 assert.equal(next[0].at,shortIntroFinaleCues[1].end);assert.equal(next[2].id,'wife-04');assert.equal(next[2].at,next[1].end);
});
test('native completion gates short intro, then original notification/gap and wife04; refresh preserves run',()=>{
 const c={id:'c8',sequence:0};startFinale(c,100000);advanceFinale(c,101600);assert.equal(finaleCue(c).id,'wife-intro-short');validateFinale(c);
 finaleHostAction(c,body(c,'chapter8-finale-playing'),101600);const snapshot=structuredClone(c);validateFinale(snapshot);assert.equal(finaleCue(snapshot).src,shortWifeIntro.src);assert.equal(snapshot.finale.mediaStartedAt,101600);
 assert.equal(advanceFinale(c,999999),UNCHANGED);assert.throws(()=>finaleHostAction(c,body(c,'chapter8-finale-ended'),115000));
 const end=101600+shortWifeIntro.durationMs;finaleHostAction(c,body(c,'chapter8-finale-ended'),end);assert.equal(finaleCue(c).id,'camera-question-notification');
 const effect=finaleCue(c);finaleHostAction(c,body(c,'chapter8-finale-playing'),end);finaleHostAction(c,body(c,'chapter8-finale-ended'),end+effect.durationMs);assert.equal(finaleCue(c).id,'camera-question-gap');assert.equal(finaleCue(c).durationMs,350);advanceFinale(c,c.finale.deadline);assert.equal(finaleCue(c).id,'wife-04');validateFinale(c);
});
test('existing version8 saves retain their indexes; checkpoint indexes still resolve to the same story cue',()=>{
 assert.equal(cuesFor({finale:{polishVersion:8}}),finaleCues);
 for(const id of ['living-silence','breaking-news','wife-16','credits-intro']){const c={id:'c',sequence:0};startFinale(c,100000,finaleCues.findIndex(c=>c.id===id));assert.equal(finaleCue(c).id,id);validateFinale(c);}
});
test('short narration uses the existing warm wife screen and immediate existing fade without later presentation changes',()=>{
 const c={finale:{polishVersion:8,introVersion:1,index:1,mediaStartedAt:100000}};
 for(const offset of [100,2500,12000,16000]){const p=wifePresentation(c,100000+offset);assert(p.visible);assert.equal(p.mood,'warm');assert(p.opacity>0);if(offset>=2500)assert.equal(p.opacity,1);}
 const id='wife-04',oldIndex=finaleCues.findIndex(c=>c.id===id),newIndex=shortIntroFinaleCues.findIndex(c=>c.id===id);for(const offset of [0,1000,8000])assert.deepEqual(wifePresentation({finale:{polishVersion:8,index:oldIndex,mediaStartedAt:100000}},100000+offset),wifePresentation({finale:{polishVersion:8,introVersion:1,index:newIndex,mediaStartedAt:100000}},100000+offset));
});
