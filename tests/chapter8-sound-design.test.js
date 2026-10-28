import test from 'node:test';
import assert from 'node:assert/strict';
import {Chapter8SoundDesign,effects,soundLayers,layerVolume,whistleGain,whistleCutoff,primaryEffectGain} from '../chapter8-sound-design.js';
import {finaleCues,SILENCE_MS} from '../chapter8-finale-timing.js';
const flush=()=>new Promise(r=>setImmediate(r));
function harness({deny=false}={}){
 let now=100000;const player={media:new Map(soundLayers.map(s=>[s.id,{paused:true,currentTime:0,volume:1,readyState:4,plays:0,play(){this.plays++;if(deny)return Promise.reject(Error('Autoplay'));this.paused=false;return Promise.resolve();},pause(){this.paused=true;}}]))};
 const sound=new Chapter8SoundDesign(player,()=>now,{Context:null}),c={step:'finale',finale:{id:'f',phaseAt:100000,soundAnchors:{garage:100000,sirens:100000}}};
 return {sound,c,at:n=>now=100000+n,allow:()=>deny=false,media:id=>player.media.get(id),update:id=>sound.update(c,finaleCues.find(c=>c.id===id))};
}

test('canonical sound windows fit their measured sources, preserve all narration and put 3.5 seconds of silence directly before the scare',()=>{
 for(const s of Object.values(effects)){assert(s.offsetMs>=0);assert(s.durationMs>0);assert(s.offsetMs+s.durationMs<=s.sourceDurationMs+.001);}
 assert.deepEqual(finaleCues.filter(c=>c.kind==='narration').map(c=>c.id),Array.from({length:16},(_,n)=>'wife-'+String(n+1).padStart(2,'0')));
 const index=id=>finaleCues.findIndex(c=>c.id===id);
 assert(index('motion-notification')<index('wife-06'));assert.equal(finaleCues[index('garage-alarm-lead')].durationMs,1000);assert(index('garage-announcement')<index('garage-observe'));
 assert(index('interior-door')<index('whistle-approach'));assert.equal(index('living-silence'),index('whistle-approach')+1);assert.equal(SILENCE_MS,3500);assert.equal(index('intruder-reveal'),index('living-silence')+1);
 assert(index('wife-12')<index('wife-13'));assert(index('wife-13')<index('escape-running'));assert.equal(index('escape-slam'),index('escape-running')+1);assert(index('escape-slam')<index('wife-14'));assert(index('wife-15')<index('breaking-news'));assert(index('wife-16')>index('breaking-news'));
});

test('alarm uses one native element across its lead and announcement, ducks the bed and fades without a restart',async()=>{
 const h=harness();h.update('garage-alarm-lead');await flush();const alarm=h.media('garage-alarm');assert.equal(alarm.plays,1);assert.equal(alarm.volume,.3);
 h.at(1000);h.c.finale.phaseAt=101000;h.update('garage-announcement');assert.equal(alarm.plays,1);assert(Math.abs(alarm.volume-.075)<1e-9);h.at(6000);h.update('garage-alarm-release');assert(alarm.volume<.075);h.at(6600);h.update('garage-alarm-release');assert(alarm.paused);h.sound.stop();
});

test('sirens reconstruct their canonical offset and stay continuous through running, slam and settling, then stop before news',async()=>{
 const h=harness();h.at(3000);h.update('wife-13');await flush();const siren=h.media('approaching-sirens');assert.equal(siren.currentTime,3);assert.equal(siren.plays,1);const early=siren.volume;
 h.at(9000);h.update('escape-running');assert(siren.volume>early);h.at(14000);h.update('escape-slam');assert.equal(siren.plays,1);h.at(18000);h.update('escape-settle');assert(siren.volume<layerVolume('approaching-sirens',14000));h.at(20000);h.update('wife-14');assert(siren.paused);h.update('breaking-news');assert(siren.paused);
});

test('impact is a single absolute excerpt; silence is completely quiet and late refresh cannot replay an expired impact',async()=>{
 const h=harness();h.update('intruder-reveal');await flush();const impact=h.media('scare-impact');assert.equal(impact.currentTime,.2);assert.equal(impact.plays,1);h.at(350);h.update('intruder-reveal');assert.equal(impact.plays,1);h.at(700);h.update('intruder-reveal');assert(impact.paused);
 const restored=harness();restored.at(1000);restored.update('intruder-reveal');assert.equal(restored.media('scare-impact').plays,0);h.update('living-silence');for(const s of soundLayers)assert(h.media(s.id).paused);
});

test('whistle low-pass opens smoothly on one source, retains natural recording timing, and context cleanup disconnects it',()=>{
 let sources=0,closed=0,disconnects=0;const values=[];
 class Context{constructor(){this.state='running';this.currentTime=1;this.destination={};}createMediaElementSource(){sources++;return {connect(){},disconnect(){disconnects++;}};}createBiquadFilter(){return {type:'',Q:{value:0},frequency:{setTargetAtTime:v=>values.push(v)},connect(){},disconnect(){disconnects++;}};}close(){closed++;return Promise.resolve();}}
 const sound=new Chapter8SoundDesign({media:new Map()},()=>0,{Context});assert(sound.prepareWhistle({}));assert(sound.prepareWhistle({}));assert.equal(sources,1);assert.equal(sound.filter.type,'lowpass');sound.approach(0);sound.approach(9000);assert.deepEqual(values,[1000,6500]);assert(whistleGain(10000)>whistleGain(0));assert(whistleCutoff(9000)>whistleCutoff(0));sound.stop();assert.equal(closed,1);assert.equal(disconnects,2);
});

test('effect edges are softened without fading narration, whistle cut remains abrupt, and autoplay retries reuse layers',async()=>{
 const running=finaleCues.find(c=>c.id==='escape-running'),voice=finaleCues.find(c=>c.id==='wife-13'),whistle=finaleCues.find(c=>c.id==='whistle-approach');assert.equal(primaryEffectGain(running,0),0);assert.equal(primaryEffectGain(running,5000),0);assert.equal(primaryEffectGain(voice,0),1);assert.equal(primaryEffectGain(voice,voice.durationMs),1);assert(primaryEffectGain(whistle,11400)>.7);
 const h=harness({deny:true});h.update('wife-13');await flush();assert(h.sound.blocked);for(let n=0;n<10;n++)h.update('wife-13');assert.equal(h.media('approaching-sirens').plays,1);h.allow();h.sound.unlock();h.update('wife-13');await flush();assert.equal(h.media('approaching-sirens').plays,2);h.sound.stop();assert(h.media('approaching-sirens').paused);
});

test('a new persisted finale ID fences sound replay even with an identical millisecond anchor',async()=>{
 const h=harness();h.update('garage-alarm-lead');await flush();const alarm=h.media('garage-alarm');assert.equal(alarm.plays,1);h.c.finale.id='new-run';h.update('garage-alarm-lead');await flush();assert.equal(alarm.plays,2);assert.equal(alarm.currentTime,0);h.sound.stop();assert(alarm.paused);assert.equal(alarm.loop,false);
});
