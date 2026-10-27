import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {finaleCues,finaleCue,cameras,SILENCE_MS,SCARE_MS,NEWS_DURATION_MS} from '../chapter8-finale-timing.js';
import {makeChapter8Starter,chapter8HostAction,advanceChapter8,validateChapter8} from '../api/_chapter8.js';
import {finalNarrationFixture} from './chapter7-fixture.js';
import {UNCHANGED} from '../api/_state.js';
import {mp3Metadata} from './mp3-metadata.js';
import {wavMetadata} from './wav-metadata.js';
import {mp4Metadata} from './mp4-metadata.js';
import host from '../api/host.js';

function fixture(checkpoint='chapter8-finale'){
 const s=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},checkpoint)(s);return s;
}
const body=(s,action,extra={})=>({action,generation:s.generation,chapter8Id:s.chapter8.id,sequence:s.chapter8.sequence,finaleId:s.chapter8.finale.id,cueId:finaleCue(s.chapter8).id,...extra});

test('supplied finale assets are byte-preserved and cue durations match contiguous MP3 frames and MP4 tracks',()=>{
 const media=JSON.parse(fs.readFileSync('chapter8-finale-media.json'));assert.equal(media.length,35);
 for(const m of media){const bytes=fs.readFileSync('.'+m.src);assert.equal(createHash('sha256').update(bytes).digest('hex'),m.sha256);assert.equal(bytes.length,m.bytes);
  if(m.src.endsWith('.mp3'))assert(Math.abs(mp3Metadata(bytes).durationMs-m.durationMs)<.000001);
  if(m.src.endsWith('.wav'))assert.equal(wavMetadata(bytes).durationMs,m.durationMs);
  if(m.src.endsWith('.mp4')){assert.equal(mp4Metadata(bytes).durationMs,NEWS_DURATION_MS);assert.equal(m.tracks.find(t=>t.kind==='soun').codec,'mp4a');}
 }
 for(const cue of finaleCues.filter(c=>c.src)){const m=media.find(m=>m.src===cue.src);assert(m);assert(Math.abs(m.durationMs-(cue.sourceDurationMs??cue.durationMs))<.000001);}
 assert.equal(Object.keys(cameras).length,8);
});

test('explicit cue timeline orders every wife recording, both doorbells, cameras, silence, scare, news and ending',()=>{
 const voice=finaleCues.filter(c=>c.kind==='narration');assert.deepEqual(voice.map(c=>c.id),Array.from({length:16},(_,n)=>'wife-'+String(n+1).padStart(2,'0')));
 assert.deepEqual(voice.slice(4,9).map(c=>c.visual),['driveway','side','backyard','porch','garage']);
 const index=id=>finaleCues.findIndex(c=>c.id===id);
 assert(index('doorbell-before')<index('wife-08'));assert(index('doorbell-after')>index('wife-08'));assert(index('wife-15')<index('breaking-news'));assert(index('wife-16')>index('breaking-news'));
 assert.equal(finaleCues[index('living-silence')].durationMs,SILENCE_MS);assert.equal(finaleCues.filter(c=>c.visual==='scare').length,1);assert.equal(finaleCues[index('intruder-reveal')].durationMs,SCARE_MS);
 for(let n=1;n<finaleCues.length;n++)assert.equal(finaleCues[n].at,finaleCues[n-1].end);
 assert.equal(finaleCues.at(-1).id,'ending');
});

test('entire automated finale persists native gates, no overlapping speech, one scare and terminal completion without changing players/history',()=>{
 const s=fixture(),history=structuredClone({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6,chapter7:s.chapter7});let now=s.chapter8.finale.phaseAt,scares=0;
 while(s.chapter8.step==='finale'){
  const cue=finaleCue(s.chapter8),c=s.chapter8,f=c.finale;validateChapter8(s);
  const restored=JSON.parse(JSON.stringify(s));validateChapter8(restored);assert.deepEqual(restored.chapter8,c);
  if(cue.visual==='scare')scares++;
  if(cue.kind==='hold'){
   if(cue.id==='living-silence'){
    assert.equal(f.deadline,null);assert.equal(advanceChapter8(s,now+100000),UNCHANGED);
    chapter8HostAction(s,body(s,'chapter8-finale-ready'),now);assert.equal(f.deadline-now,SILENCE_MS);assert.equal(chapter8HostAction(s,body(s,'chapter8-finale-ready'),now+1000),UNCHANGED);
   }
   assert.equal(advanceChapter8(s,f.deadline-1),UNCHANGED);now=f.deadline;advanceChapter8(s,now);
  }else{
   assert.equal(advanceChapter8(s,now+1000000),UNCHANGED);
   assert.throws(()=>chapter8HostAction(s,body(s,'chapter8-finale-ended'),now));chapter8HostAction(s,body(s,'chapter8-finale-playing'),now);
   assert.equal(chapter8HostAction(s,body(s,'chapter8-finale-playing'),now+1500),UNCHANGED);
   assert.throws(()=>chapter8HostAction(s,body(s,'chapter8-finale-ended'),now+cue.durationMs-251));
   const stale=body(s,'chapter8-finale-ended');now+=cue.durationMs;chapter8HostAction(s,stale,now);assert.throws(()=>chapter8HostAction(s,stale,now));
  }
 }
 validateChapter8(s);assert.equal(s.chapter8.step,'complete');assert.equal(s.chapter8.completedAt,now);assert.equal(scares,1);assert.equal(advanceChapter8(s,now+1000000),UNCHANGED);assert.deepEqual({players:s.players,chapter4:s.chapter4,chapter5:s.chapter5,chapter6:s.chapter6,chapter7:s.chapter7},history);
});

test('late polling retains absolute scare window, refresh cannot restart it or extend silence',()=>{
 const s=fixture('chapter8-finale-silence'),now=s.chapter8.finale.phaseAt;chapter8HostAction(s,body(s,'chapter8-finale-ready'),now);
 const saved=JSON.parse(JSON.stringify(s));chapter8HostAction(saved,body(saved,'chapter8-finale-ready'),now+5000);assert.equal(saved.chapter8.finale.deadline,now+SILENCE_MS);
 advanceChapter8(saved,now+8000);assert.equal(finaleCue(saved.chapter8).id,'intruder-reveal');assert.equal(saved.chapter8.finale.phaseAt,now+SILENCE_MS);assert.equal(saved.chapter8.finale.deadline,now+SILENCE_MS+SCARE_MS);advanceChapter8(saved,now+8000);assert.equal(finaleCue(saved.chapter8).id,'signal-break');
});

test('news refresh preserves original clock; elapsed time alone never interrupts video; post-news voice waits for ended',()=>{
 const s=fixture('chapter8-finale-news'),now=s.chapter8.finale.phaseAt;chapter8HostAction(s,body(s,'chapter8-finale-playing'),now);
 const refreshed=JSON.parse(JSON.stringify(s));assert.equal(advanceChapter8(refreshed,now+NEWS_DURATION_MS+60000),UNCHANGED);assert.equal(finaleCue(refreshed.chapter8).id,'breaking-news');assert.equal(refreshed.chapter8.finale.mediaStartedAt,now);
 chapter8HostAction(refreshed,body(refreshed,'chapter8-finale-ended'),now+NEWS_DURATION_MS);assert.equal(finaleCue(refreshed.chapter8).id,'news-out');advanceChapter8(refreshed,refreshed.chapter8.finale.deadline);assert.equal(finaleCue(refreshed.chapter8).id,'wife-16');
});

test('stale generation, finale run, cue and sequence cannot move the cinematic; corrupt nested state fails closed',()=>{
 const s=fixture();for(const extra of [{generation:'old'},{chapter8Id:'old'},{sequence:-1},{finaleId:'old'},{cueId:'wife-16'}])assert.throws(()=>chapter8HostAction(s,body(s,'chapter8-finale-playing',extra)));
 s.chapter8.finale.index=1000;assert.throws(()=>validateChapter8(s));
});

test('anonymous/public clients and phone credentials cannot use finale checkpoints or media acknowledgments',async()=>{
 async function call(body){let status;await host({method:'POST',body,headers:{}},{setHeader(){},status(n){status=n;return this;},json(){}});return status;}
 for(const checkpoint of ['chapter8-finale','chapter8-finale-silence','chapter8-finale-news'])assert.equal(await call({action:'chapter-select',checkpoint}),403);
 for(const action of ['chapter8-finale-ready','chapter8-finale-playing','chapter8-finale-ended'])assert.equal(await call({action,id:'p0',token:'t0'}),403);
});
