import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';
import {finaleCues,version5FinaleCues,finaleCue,cuesFor} from '../chapter8-finale-timing.js';
import {GREETING,greetingFrame,LETTER_GROUPS,HAPPY_TRACK,HAPPY_START_MS,FINAL_SONG_VOLUME} from '../chapter8-ending.js';
import {Chapter8SoundDesign,soundLayers} from '../chapter8-sound-design.js';
import {makeChapter8Starter,chapter8HostAction,advanceChapter8,validateChapter8} from '../api/_chapter8.js';
import {finalNarrationFixture} from './chapter7-fixture.js';import {UNCHANGED} from '../api/_state.js';
import {mp4Metadata} from './mp4-metadata.js';import {mp3Metadata} from './mp3-metadata.js';
const cue=id=>finaleCues.find(c=>c.id===id),index=id=>finaleCues.findIndex(c=>c.id===id);
function fixture(id){const s=finalNarrationFixture(Date.now()+2000);makeChapter8Starter({},'chapter8-finale')(s);Object.assign(s.chapter8.finale,{index:index(id),phaseAt:100000,mediaStartedAt:null,deadline:cue(id).kind==='hold'?100000+cue(id).durationMs:null});return s;}
const body=s=>({generation:s.generation,chapter8Id:s.chapter8.id,sequence:s.chapter8.sequence,finaleId:s.chapter8.finale.id,cueId:finaleCue(s.chapter8).id});

test('all existing cues through wife16 remain exact; saved version5 retains its original ending and indices',()=>{
 assert.equal(cuesFor({finale:{polishVersion:5}}),version5FinaleCues);
 assert.deepEqual(finaleCues.slice(0,version5FinaleCues.length-1),version5FinaleCues.slice(0,-1));
 assert.deepEqual(finaleCues.slice(version5FinaleCues.length-1).map(c=>c.id),['ending-in','ending','ending-glitch-1','ending-glitch-2','ending-glitch-3','ending-glitch-4','ending-glitch-5','collector-black','collector-reveal','final-song']);
 assert.equal(cue('ending').durationMs,10000);assert.equal(cue('collector-black').durationMs,1000);
});

test('HTML greeting holds all letters for ten seconds, then five deterministic glitches progressively remove all letters without reserved artwork',()=>{
 assert.equal(GREETING,'HAPPY HALLOWEEN');const count=GREETING.replaceAll(' ','').length;
 assert.equal(greetingFrame(cue('ending'),9999).gone.size,0);
 let last=0;for(let stage=1;stage<=5;stage++){const c=cue('ending-glitch-'+stage),a=greetingFrame(c,0),b=greetingFrame(c,c.durationMs-1);assert(a.gone.size>last);assert.deepEqual(a.gone,b.gone);last=a.gone.size;}
 assert.equal(last,count);assert.equal(new Set(LETTER_GROUPS.flat()).size,count);assert.equal(greetingFrame(cue('ending-in'),0).opacity,0);assert.equal(greetingFrame(cue('ending-in'),1000).opacity,1);
 assert.equal(greetingFrame(cue('ending-glitch-5'),1199).black,false);assert.equal(greetingFrame(cue('ending-glitch-5'),1200).black,true);
 const source=fs.readFileSync('chapter8-finale.js','utf8'),css=fs.readFileSync('chapter8.css','utf8');assert(source.includes('this.title.replaceChildren(this.greeting)'));assert(!source.match(/happy.*\.png/i));assert(css.includes('.ch8-halloween-letter[data-gone=true]{visibility:hidden}'));assert(css.includes('prefers-reduced-motion'));assert(!css.includes('url('+'/assets/chapter8/happy'));
});

test('native wife16 playing anchors cheerful music to the spoken shake-this-off line; duplicate playing and refresh never reset it',()=>{
 const s=fixture('wife-16');chapter8HostAction(s,{...body(s),action:'chapter8-finale-playing'},100000);assert.equal(s.chapter8.finale.soundAnchors.happy,100000+HAPPY_START_MS);
 const refresh=structuredClone(s);validateChapter8(refresh);assert.equal(chapter8HostAction(refresh,{...body(refresh),action:'chapter8-finale-playing'},105000),UNCHANGED);assert.equal(refresh.chapter8.finale.soundAnchors.happy,114800);
});

test('one cheerful element is ducked under wife16, continues across greeting and glitches, cuts on glitch3 and cannot bleed into Collector or final song',async()=>{
 let now=100000;const media=new Map(soundLayers.map(s=>[s.id,{paused:true,readyState:4,currentTime:0,plays:0,volume:0,play(){this.paused=false;this.plays++;return Promise.resolve();},pause(){this.paused=true;}}]));
 const sound=new Chapter8SoundDesign({media},()=>now,{Context:null}),c=fixture('wife-16').chapter8;c.finale.soundAnchors={happy:114800,sirens:1000,news:2000};
 sound.update(c,cue('wife-16'));assert(media.get(HAPPY_TRACK.id).paused);now=116000;sound.update(c,cue('wife-16'));await new Promise(r=>setImmediate(r));const m=media.get(HAPPY_TRACK.id);assert.equal(m.volume,.16);assert.equal(m.currentTime,1.2);assert.equal(m.plays,1);
 for(const id of ['ending-in','ending','ending-glitch-1','ending-glitch-2']){c.finale.phaseAt=now;now+=1000;sound.update(c,cue(id));assert(!m.paused);assert.equal(m.plays,1);assert(m.volume>=.16&&m.volume<=.45);}
 for(const id of ['ending-glitch-3','ending-glitch-4','ending-glitch-5','collector-black','collector-reveal','final-song']){sound.update(c,cue(id));assert([...media.values()].every(a=>a.paused));}
 const restored=new Chapter8SoundDesign({media},()=>now,{Context:null});restored.update(c,cue('ending'));assert.equal(m.currentTime,(now-114800)/1000);assert.equal(m.plays,2);restored.stop();assert(m.paused);
 c.finale.deadline=now;restored.update(c,cue('ending-glitch-2'));assert(m.paused);assert.equal(m.plays,2);
});

test('Collector and main song use native media completion, retain clocks across refresh, reject duplicates and end without changing players',()=>{
 const s=fixture('collector-reveal'),players=structuredClone(s.players);let now=100000;
 for(const id of ['collector-reveal','final-song']){assert.equal(finaleCue(s.chapter8).id,id);const c=cue(id),b={...body(s),action:'chapter8-finale-playing'};chapter8HostAction(s,b,now);const restored=structuredClone(s);validateChapter8(restored);assert.equal(advanceChapter8(restored,now+c.durationMs+10000),UNCHANGED);assert.equal(restored.chapter8.finale.mediaStartedAt,now);
  assert.throws(()=>chapter8HostAction(s,{...body(s),action:'chapter8-finale-ended'},now+c.durationMs-251));const ended={...body(s),action:'chapter8-finale-ended'};now+=c.durationMs;chapter8HostAction(s,ended,now);assert.throws(()=>chapter8HostAction(s,ended,now));}
 assert.equal(s.chapter8.step,'complete');assert.deepEqual(s.players,players);assert.equal(cue('final-song').volume,FINAL_SONG_VOLUME);assert.equal(cue('final-song').kind,'music');assert.equal(cue('final-song').visual,'black');
});

test('new delivery media hashes, native duration, aspect ratio and audio codecs are valid; song bytes are preserved',()=>{
 const metadata=JSON.parse(fs.readFileSync('chapter8-ending-media.json'));for(const m of metadata){const b=fs.readFileSync('.'+m.src);assert.equal(b.length,m.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);const measured=m.src.endsWith('.mp4')?mp4Metadata(b):mp3Metadata(b);assert.equal(measured.durationMs,m.durationMs);const c=[...finaleCues,HAPPY_TRACK].find(c=>c.src===m.src);assert.equal(c.durationMs,m.durationMs);if(m.tracks){assert.equal(m.tracks[0].width,1920);assert.equal(m.tracks[0].height,1080);assert.equal(m.tracks[1].codec,'mp4a');assert(m.fastStart);assert(m.bytes<100*1024*1024);}}
});
