import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {castingRoles,castingVotingOffset,castingCompletionMs,CHAPTER5_FINALE_MS} from '../chapter5-timing.js';
import {Chapter5View,chapter5IntroTimeline,castingCardTimeline,castingResultTimeline,chapter5FinaleTimeline} from '../chapter5.js';
import {TVCinematicRuntime} from '../tv-cinematic.js';
import {chapter5Opening,narrationGate,CHAPTER5_READY_MS} from '../chapter5-audio-timing.js';
function fixture(){
  const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{style:{},hidden:false,addEventListener(){}});return nodes.get(id);}};
  const context=vm.createContext({document});vm.runInContext(fs.readFileSync('cinematic-engine.js','utf8'),context);
  return {nodes,document,Renderer:context.BrookwoodTimeline.Renderer,resolve:(timeline,at)=>context.BrookwoodTimeline.resolve(timeline,at).visuals};
}
test('Chapter 5 roles, exact copy and all six existing approved PNG assets are present in locked order',()=>{
  assert.deepEqual(castingRoles.map(r=>r.id),['screamer','terribleDecisionMaker','tripper','denier','sacrifice','killer']);
  const copy=[['A door slams. A light flickers.','WHO HAS ALREADY SCREAMED SIX TIMES TONIGHT?'],['You finally escaped.',"WHO SAYS, 'GUYS... WE SHOULD GO BACK'?"],['The killer is right behind you.','WHO TRIPS OVER ABSOLUTELY NOTHING?'],["Blood on the wall. Someone's missing.","WHO STILL SAYS, 'GUYS, IT'S PROBABLY NOTHING'?"],["You don't have to outrun the killer.",'YOU JUST HAVE TO OUTRUN... WHO?'],["They've been laughing, drinking and partying with everyone.","WHO'S SECRETLY WAITING FOR THE RIGHT MOMENT?"]];
  castingRoles.forEach((r,i)=>{assert.deepEqual([r.setup,r.question],copy[i]);assert.equal(fs.readFileSync('.'+r.src).subarray(1,4).toString(),'PNG');});
});
test('casting card entry stays frozen and voting waits for the full measured narration and tail',()=>{
  const e=fixture();for(const role of castingRoles.slice(0,5)){
    const timeline=castingCardTimeline(role),opacity=t=>e.resolve(timeline,t).card.opacity;
    assert.equal(opacity(499),0);assert.equal(opacity(500),0);assert.equal(opacity(850),.5);assert.equal(opacity(1200),1);assert.equal(castingVotingOffset(role.id),1200+narrationGate(role.id));
  }
  const killer=castingCardTimeline(castingRoles[5]);assert.equal(e.resolve(killer,0).card.opacity,0);assert.equal(e.resolve(killer,750).card.opacity,.5);assert.equal(e.resolve(killer,1500).card.opacity,1);assert.equal(castingVotingOffset('killer'),2500+narrationGate('killer'));
});
test('normal casting results preserve hold, intro, winner, fade and black boundaries for rounds 1–4',()=>{
  const e=fixture();for(const role of castingRoles.slice(0,4)){
    const timeline=castingResultTimeline(role),at=t=>e.resolve(timeline,t);
    assert.equal(at(999).hold.opacity,1);assert.equal(at(1000).hold.opacity,0);assert.equal(at(1000).intro.opacity,1);
    assert.equal(at(2199).intro.opacity,1);assert.equal(at(2200).intro.opacity,0);assert.equal(at(2200).winner.opacity,1);
    assert.equal(at(5699).winner.opacity,1);assert.equal(at(5700).winner.opacity,1);assert.equal(at(6050).winner.opacity,.5);assert.equal(at(6400).winner.opacity,0);
    for(const t of [6400,6899,6900])assert(Object.values(at(t)).every(v=>v.opacity===0));assert.equal(timeline.end,6900);
  }
});
test('sacrifice result provides 4000ms reaction, 700ms fade and 2500ms black, with required HTML copy',()=>{
  const e=fixture(),t=castingResultTimeline(castingRoles[4]);assert.equal(t.end,9400);
  assert.equal(e.resolve(t,2200).winner.opacity,1);assert.equal(e.resolve(t,6199).winner.opacity,1);assert.equal(e.resolve(t,6550).winner.opacity,.5);
  for(const at of [6900,8000,9399,9400])assert(Object.values(e.resolve(t,at)).every(v=>v.opacity===0));
  assert.equal(t.cues.find(c=>c.id==='intro').visual.text,'THE GROUP HAS SPOKEN');assert(fs.readFileSync('tv.html','utf8').includes('GOOD LUCK'));
});
test('killer result has exact 2000/800/1500/2000/3000/2000 sequence and is explicitly a cast role',()=>{
  const e=fixture(),t=castingResultTimeline(castingRoles[5]),at=ms=>e.resolve(t,ms);
  assert.equal(at(1999).hold.opacity,1);assert.equal(at(2400).hold.opacity,.5);assert.equal(at(2800).hold.opacity,0);
  assert(Object.values(at(4299)).every(v=>v.opacity===0));assert.equal(at(4300).intro.opacity,1);assert.equal(at(6299).intro.opacity,1);
  assert.equal(at(6300).winner.opacity,1);assert.equal(at(9299).winner.opacity,1);assert.equal(at(9300).winner.opacity,0);
  assert.equal(at(9300).complete.opacity,1);assert.equal(at(11299).complete.opacity,1);assert.equal(at(11300).complete.opacity,0);
  assert.equal(t.cues.find(c=>c.id==='intro').visual.text,'THE KILLER IS...');assert.equal(t.cues.find(c=>c.id==='complete').visual.text,'THE CAST IS COMPLETE');
  assert(fs.readFileSync('tv.html','utf8').includes("A ROLE IN TONIGHT'S CAST"));
});
test('final cast and mystery copy resolve at every exact boundary and end indefinitely on black',()=>{
  const e=fixture(),at=t=>e.resolve(chapter5FinaleTimeline,t);
  assert.equal(at(6999).cast.opacity,1);assert.equal(at(7750).cast.opacity,.5);assert.equal(at(8500).cast.opacity,0);
  for(const t of [8500,10999,15300,16799,21600,23099,30100,999999])assert(Object.values(at(t)).every(v=>v.opacity===0),t);
  for(const [id,start,fade,end,copy] of [['ofCourse',11000,14500,15300,'OF COURSE...'],['onlyGame',12000,14500,15300,"THAT'S ONLY A GAME."],['tonight',16800,20800,21600,'BUT TONIGHT,'],['someoneElse',17800,20800,21600,'SOMEONE ELSE IS PLAYING ONE TOO.'],['unlikeYours',23100,28600,30100,'AND UNLIKE YOURS...'],['rules',24600,28600,30100,"YOU DON'T KNOW THE RULES YET."]]){
    assert.equal(at(start-1)[id].opacity,0);assert.equal(at(start)[id].opacity,1);assert.equal(at(fade)[id].opacity,1);assert.equal(at((fade+end)/2)[id].opacity,.5);assert.equal(at(end)[id].opacity,0);
    assert.equal(chapter5FinaleTimeline.cues.find(c=>c.id===id).visual.text,copy);
  }
  assert.equal(chapter5FinaleTimeline.end,CHAPTER5_FINALE_MS);
});
test('Chapter 5 view reconstructs current role, result, summary and final black from one injected scheduler clock',()=>{
  const e=fixture();let elapsed=10850;
  const view=new Chapter5View(e.document,e.Renderer,{elapsedNow:()=>elapsed,externallyDriven:true});
  const state={phase:'chapter5-casting',chapter5:{startedAt:100000,roundIndex:0,castStartedAt:null,completedAt:null,winners:[],round:{id:'screamer',startedAt:110000,completedAt:null,voteCount:7,winner:null}}};
  view.update(state);assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),.5);assert.equal(e.nodes.get('chapter5-voteCount').textContent,'CASTING IN PROGRESS... 7 / 12 HAVE VOTED');assert.equal(e.nodes.get('chapter5-cardImage').src,castingRoles[0].src);
  state.chapter5.round.completedAt=115000;state.chapter5.round.voteCount=12;state.chapter5.round.winner={id:'p',name:'Player'};elapsed=17200;view.update(state);
  assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),1);assert.equal(e.nodes.get('chapter5-winnerName').textContent,'Player');
  assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);
  state.phase='chapter5-finale';state.chapter5.castStartedAt=200000;state.chapter5.winners=castingRoles.map(r=>({roleId:r.id,player:{id:'p',name:'Player'}}));elapsed=100001;view.update(state);
  assert.equal(Number(e.nodes.get('chapter5-cast').style.opacity),1);for(const r of castingRoles)assert.equal(e.nodes.get('chapter5-cast-'+r.id).textContent,'Player');
  assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),0);
  elapsed=130100;view.update(state);assert.equal(Number(e.nodes.get('chapter5-rules').style.opacity),0);state.phase='chapter5-complete';state.chapter5.completedAt=230100;view.update(state);
  assert.equal(view.renderer,null);assert.equal(Number(e.nodes.get('chapter5-cast').style.opacity),0);
});

test('Chapter 5 stops obsolete layers even when a poll jumps directly from visible winner to completed black',()=>{
  const e=fixture(),view=new Chapter5View(e.document,e.Renderer,{elapsedNow:()=>17200,externallyDriven:true});
  const state={phase:'chapter5-casting',chapter5:{startedAt:100000,roundIndex:0,castStartedAt:null,completedAt:null,winners:[],round:{id:'screamer',startedAt:110000,completedAt:115000,voteCount:12,winner:{id:'p',name:'Player'}}}};
  view.update(state);assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),1);
  state.phase='chapter5-complete';state.chapter5.completedAt=230100;view.update(state);
  assert.equal(Number(e.nodes.get('chapter5-winner').style.opacity),0);assert.equal(view.renderer,null);
});
test('Chapter 5 progress requests are due only at authoritative intro, round completion and finale gates',()=>{
  const e=fixture(),view=new Chapter5View(e.document,e.Renderer,{elapsedNow:()=>0,externallyDriven:true});
  const state={phase:'chapter5-intro',chapter5:{startedAt:100000,round:{id:'screamer',completedAt:null}}};
  assert.equal(view.progressDue(9999,state),false);assert.equal(view.progressDue(10000,state),true);
  state.phase='chapter5-casting';assert.equal(view.progressDue(100000,state),false);state.chapter5.round.completedAt=115000;
  assert.equal(view.progressDue(15000+castingCompletionMs('screamer')-1,state),false);assert.equal(view.progressDue(21900,state),true);
  state.phase='chapter5-finale';state.chapter5.castStartedAt=200000;assert.equal(view.progressDue(130099,state),false);assert.equal(view.progressDue(130100,state),true);
  state.phase='chapter5-complete';assert.equal(view.progressDue(999999,state),false);
});
test('Chapter 5 opening uses measured narration boundaries and retains rules without client timers or replacement art',()=>{
  const html=fs.readFileSync('tv.html','utf8');assert(html.includes('original Brookwood group used to cast their own horror movie'));assert(html.includes('No self-voting. One vote per role. The same person can win more than one role.'));
  assert.equal(chapter5IntroTimeline.end,CHAPTER5_READY_MS);const source=fs.readFileSync('chapter5.js','utf8');assert(!source.includes('setTimeout'));assert(!source.includes('Date.now'));assert(!source.includes('new Audio'));
  const e=fixture();assert.equal(e.resolve(chapter5IntroTimeline,0).item.opacity,1);
  assert.equal(e.resolve(chapter5IntroTimeline,chapter5Opening[1].at).radio.opacity,1);
  assert.equal(e.resolve(chapter5IntroTimeline,chapter5Opening[1].at).complaint.opacity,1);
  assert.equal(e.resolve(chapter5IntroTimeline,chapter5Opening[2].at+1000).wife.opacity,1);
  assert.equal(e.resolve(chapter5IntroTimeline,chapter5Opening[3].at).ready.opacity,1);
  for(const id of ['chapter5-roleTitle','chapter5-setup','chapter5-question'])assert(!html.includes('id="'+id+'"'));
});

test('TV scheduler changes to Chapter 5 clock, silences obsolete audio and reconstructs fresh test runs without a reload',()=>{
  const e=fixture();let perf=0;
  class Audio{constructor(src){this.src=src;this.readyState=1;this.currentTime=0;this.paused=true;this.volume=1;this.plays=0;}addEventListener(){}load(){}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}}
  const context=vm.createContext({Audio,BrookwoodTimeline:{Renderer:e.Renderer},console:{warn(){}},Date:{now:()=>perf},requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  for(const name of ['chapter1.js','cinematic-audio.js'])vm.runInContext(fs.readFileSync(name,'utf8'),context);
  const runtime=new TVCinematicRuntime({document:e.document,Renderer:e.Renderer,timeline:context.BrookwoodChapter1.chapter1Timeline,Player:context.BrookwoodAudio.Player,soundtrack:context.BrookwoodAudio.tvSoundtrack,now:()=>perf,requestFrame:()=>1,cancelFrame(){}});
  runtime.acceptState({phase:'chapter4-opening',startedAt:100000,serverNow:303500,chapter3:{startedAt:200000,completedAt:220000,readCount:12},chapter4:{startedAt:300000,active:false,complete:false,voteCount:0,selectedPlayer:null}},{hard:true});
  assert([...runtime.chapter4Audio.media.values()].some(a=>!a.paused));
  const oldPlayCount=[...runtime.chapter4Audio.media.values()].reduce((n,a)=>n+a.plays,0);
  const state={phase:'chapter5-casting',startedAt:100000,serverNow:511200,chapter3:{startedAt:200000,completedAt:220000,readCount:12},chapter4:{startedAt:300000,complete:true,voteCount:12},chapter5:{startedAt:500000,roundIndex:0,castStartedAt:null,completedAt:null,winners:[],round:{id:'screamer',startedAt:510000,completedAt:null,voteCount:3,winner:null}}};
  runtime.acceptState(state,{hard:true});assert.equal(runtime.elapsedNow(),11200);assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),1);
  assert([...runtime.chapter4Audio.media.values()].every(a=>a.paused));assert.equal(runtime.audio.soundtrack.audio.volume,0);assert(runtime.audio.soundtrack.audio.paused);
  runtime.unlockBackground();assert.equal(runtime.audio.soundtrack.audio.volume,0);
  perf+=100;runtime.scheduler.frame();assert.equal([...runtime.chapter4Audio.media.values()].reduce((n,a)=>n+a.plays,0),oldPlayCount);
  const fresh={...state,phase:'chapter5-intro',serverNow:600000,chapter5:{...state.chapter5,startedAt:600000,round:{...state.chapter5.round,startedAt:null,voteCount:0}}};
  runtime.acceptState(fresh,{hard:true});assert.equal(runtime.elapsedNow(),0);assert.equal(Number(e.nodes.get('chapter5-card').style.opacity),0);assert.equal(Number(e.nodes.get('chapter5-intro').style.opacity),1);
  runtime.acceptState({phase:'lobby',startedAt:null,serverNow:700000},{hard:true});
  assert.equal(runtime.audio.soundtrack.audio.paused,false);assert(runtime.chapter5Audio.player.tracks[0].audio.paused);
});
