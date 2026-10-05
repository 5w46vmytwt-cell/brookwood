import test from 'node:test';
import assert from 'node:assert/strict';
import { AbsoluteCueScheduler, MAX_FORWARD_CORRECTION_MS as FORWARD,
  MAX_BACKWARD_CORRECTION_MS as BACKWARD, HARD_RESYNC_THRESHOLD_MS as HARD,
  resolveAutomationValue, classifyFiniteCue, finiteCueOffset, resolveLoopOffset } from '../cinematic-scheduler.js';

class FakeClock {
  value = 0;
  now = () => this.value;
  advance(ms) { this.value += ms; }
}
class FakeRAF {
  callbacks = new Map(); serial = 0;
  request = cb => { this.callbacks.set(++this.serial,cb); return this.serial; };
  cancel = id => this.callbacks.delete(id);
  frame() { const callbacks=[...this.callbacks.values()];this.callbacks.clear();for(const cb of callbacks)cb(); }
}
const flush = async () => { for(let i=0;i<8;i++)await Promise.resolve(); };
function environment(elapsed=0,cues=[]) {
  const clock=new FakeClock(),raf=new FakeRAF(),events=[],samples=[],phases=[],errors=[];
  const server={phase:'opening',startedAt:1000000,elapsed,rtt:0,fail:false,requests:0};
  const scheduler=new AbsoluteCueScheduler({now:clock.now,requestFrame:raf.request,cancelFrame:raf.cancel,
    getServerState:async()=>{
      server.requests++;
      if(server.fail)throw Error('offline');
      const state={phase:server.phase,startedAt:server.startedAt,serverNow:(server.startedAt??0)+server.elapsed};
      clock.advance(server.rtt);return state;
    },onCue:(cue,meta)=>events.push({id:cue.id,at:cue.at,elapsed:meta.elapsed,run:meta.startedAt}),
    onElapsed:(value,meta)=>samples.push({value,reconstruct:meta.reconstruct}),
    onPhaseChange:(phase,old,state)=>phases.push({phase,old,startedAt:state.startedAt}),
    onSyncError:error=>errors.push(error.message)});
  scheduler.setCues(cues);
  return {clock,raf,server,scheduler,events,samples,phases,errors,
    advance(ms){clock.advance(ms);scheduler.frame();},trace(){return {events,samples,phases,history:[...scheduler.fired],elapsed:scheduler.elapsedNow()};}};
}
const cue=(id,at)=>({id,at});
const counts=events=>{const result={};for(const e of events)result[e.id]=(result[e.id]||0)+1;return result;};
const near=(actual,expected,tolerance=1e-9)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('scheduler: normal absolute progression uses only injected monotonic advancement',async()=>{
  const e=environment(2000);await e.scheduler.sync();e.advance(125);assert.equal(e.scheduler.elapsedNow(),2125);
  e.advance(0);assert.equal(e.scheduler.elapsedNow(),2125);assert.equal(e.samples.at(-1).reconstruct,false);
});
test('scheduler: cue sorting is stable, cloned, and does not mutate inputs',()=>{
  const input=Object.freeze([Object.freeze(cue('b',20)),Object.freeze(cue('a',10)),Object.freeze(cue('c',20))]);
  const e=environment(0,input);assert.deepEqual(e.scheduler.cues.map(c=>c.id),['a','b','c']);assert.deepEqual(input.map(c=>c.id),['b','a','c']);
  assert.notEqual(e.scheduler.cues[0],input[1]);
});
test('scheduler: normal crossing is previous < at <= current, including timestamp zero',async()=>{
  const e=environment(0,[cue('zero',0),cue('a',10),cue('b',10),cue('c',11)]);await e.scheduler.sync();
  assert.equal(e.events.length,0);e.scheduler.frame();e.advance(9);assert.deepEqual(e.events.map(c=>c.id),['zero']);
  e.advance(1);assert.deepEqual(e.events.map(c=>c.id),['zero','a','b']);e.advance(1);assert.equal(e.events.at(-1).id,'c');
});
test('scheduler: repeated frames and large normal crossings execute each cue once',async()=>{
  const e=environment(0,[cue('a',1),cue('b',2000)]);await e.scheduler.sync();e.advance(5000);
  for(let i=0;i<10;i++)e.scheduler.frame();assert.deepEqual(counts(e.events),{a:1,b:1});
});
test('scheduler: late join before a cue leaves it armed',async()=>{
  const e=environment(99,[cue('next',100)]);await e.scheduler.sync();assert(!e.scheduler.fired.has('next'));e.advance(1);assert.equal(e.events.length,1);
});
test('scheduler: late join after a cue consumes it silently',async()=>{
  const e=environment(101,[cue('past',100)]);await e.scheduler.sync();e.advance(100);assert(e.scheduler.fired.has('past'));assert.equal(e.events.length,0);
});
test('scheduler: reconstruction consumes strict history but keeps exact-boundary and future cues eligible',async()=>{
  const e=environment(0,[cue('past',99),cue('current',100),cue('future',101)]);await e.scheduler.sync();e.scheduler.reconstruct(100);
  assert.deepEqual([...e.scheduler.fired],['past']);assert.equal(e.events.length,0);e.scheduler.frame();e.advance(1);
  assert.deepEqual(e.events.map(c=>c.id),['current','future']);assert(e.samples.some(s=>s.value===100&&s.reconstruct));
});
test('scheduler: suspended RAF reconstructs directly without burst-firing history',async()=>{
  const e=environment(0,[cue('missed',1000),cue('future',20000)]);await e.scheduler.start();
  e.clock.advance(10000);e.server.elapsed=10000;e.raf.frame();assert.equal(e.events.length,0);await flush();
  assert(e.scheduler.fired.has('missed'));assert.equal(e.scheduler.elapsedNow(),10000);assert.equal(e.samples.at(-1).reconstruct,true);
  assert.equal(e.raf.callbacks.size,1);e.scheduler.stop();
});
test('scheduler: forward corrections are capped at 250ms and use smaller errors in full',async()=>{
  const e=environment(1000);await e.scheduler.sync();e.server.elapsed=2000;await e.scheduler.sync();assert.equal(e.scheduler.anchorElapsed,1250);
  e.server.elapsed=1300;await e.scheduler.sync();assert.equal(e.scheduler.anchorElapsed,1300);assert.equal(FORWARD,250);
});
test('scheduler: backward corrections are capped at 100ms and use smaller errors in full',async()=>{
  const e=environment(2000);await e.scheduler.sync();e.server.elapsed=1000;await e.scheduler.sync();assert.equal(e.scheduler.anchorElapsed,1900);
  e.server.elapsed=1850;await e.scheduler.sync();assert.equal(e.scheduler.anchorElapsed,1850);assert.equal(BACKWARD,100);
});
test('scheduler: backward correction and reconstruction never rearm previously executed IDs',async()=>{
  const e=environment(0,[cue('a',100)]);await e.scheduler.sync();e.advance(100);e.server.elapsed=0;await e.scheduler.sync();e.advance(100);
  e.scheduler.reconstruct(0);e.advance(100);assert.equal(counts(e.events).a,1);
});
test('scheduler: discrepancies strictly greater than 1500ms hard-resync',async()=>{
  const e=environment(1000,[cue('history',2000)]);await e.scheduler.sync();e.server.elapsed=2500;await e.scheduler.sync();assert.equal(e.scheduler.anchorElapsed,1250);
  e.server.elapsed=2751;await e.scheduler.sync();assert.equal(e.scheduler.anchorElapsed,2751);assert.equal(e.samples.at(-1).reconstruct,true);assert.equal(e.events.length,0);assert.equal(HARD,1500);
});
test('scheduler: response RTT midpoint establishes authoritative elapsed',async()=>{
  const e=environment(500);e.server.rtt=100;await e.scheduler.sync();assert.equal(e.scheduler.elapsedNow(),550);assert.equal(e.scheduler.anchorNow,100);
  e.advance(25);assert.equal(e.scheduler.elapsedNow(),575);
});
test('scheduler: changed startedAt resets execution history and reconstructs the new run',async()=>{
  const e=environment(0,[cue('a',10)]);await e.scheduler.sync();e.advance(10);
  e.server.startedAt++;e.server.elapsed=0;await e.scheduler.sync();assert.equal(e.scheduler.fired.size,0);e.advance(10);
  assert.equal(e.events.length,2);assert.notEqual(e.events[0].run,e.events[1].run);
});
test('scheduler: same startedAt hard sync cannot rearm a consumed cue',async()=>{
  const e=environment(100,[cue('a',50)]);await e.scheduler.sync();e.server.elapsed=0;await e.scheduler.sync({hard:true});e.advance(100);assert.equal(e.events.length,0);
});
test('scheduler: failed or malformed sync leaves local anchor and history intact',async()=>{
  const e=environment(100);await e.scheduler.sync();const anchor=[e.scheduler.anchorElapsed,e.scheduler.anchorNow];e.clock.advance(10);e.server.fail=true;
  assert.equal(await e.scheduler.sync({hard:true}),false);assert.deepEqual([e.scheduler.anchorElapsed,e.scheduler.anchorNow],anchor);assert.equal(e.scheduler.elapsedNow(),110);
  e.server.fail=false;e.server.elapsed=NaN;assert.equal(await e.scheduler.sync(),false);assert.equal(e.errors.length,2);
});
test('scheduler: pre-start server times and backward corrections cannot produce negative elapsed',async()=>{
  const e=environment(-100);await e.scheduler.sync();assert.equal(e.scheduler.elapsedNow(),0);e.server.elapsed=-50;await e.scheduler.sync();assert.equal(e.scheduler.elapsedNow(),0);
});
test('scheduler: start/stop does not duplicate RAF loops and restart reconstructs',async()=>{
  const e=environment();await e.scheduler.start();await e.scheduler.start();assert.equal(e.raf.callbacks.size,1);assert.equal(e.server.requests,1);
  e.clock.advance(20);e.raf.frame();assert.equal(e.raf.callbacks.size,1);e.scheduler.stop();assert.equal(e.raf.callbacks.size,0);
  e.server.elapsed=40;await e.scheduler.start();assert.equal(e.scheduler.elapsedNow(),40);assert.equal(e.raf.callbacks.size,1);e.scheduler.stop();
});
test('scheduler: phase callbacks are independent of elapsed and fire only for changes',async()=>{
  const e=environment();await e.scheduler.sync();await e.scheduler.sync();e.server.phase='photo';await e.scheduler.sync();e.server.phase='photo-complete';await e.scheduler.sync();
  assert.deepEqual(e.phases.map(p=>[p.phase,p.old]),[['opening',null],['photo','opening'],['photo-complete','photo']]);
});
test('scheduler: automatic resync is frame-driven with no timers',async()=>{
  const e=environment();await e.scheduler.start();e.clock.advance(5000);e.server.elapsed=5000;e.raf.frame();await flush();
  assert.equal(e.server.requests,2);assert.equal(e.scheduler.elapsedNow(),5000);e.scheduler.stop();
});
test('scheduler: concurrent syncs share one request and hard intent is retained',async()=>{
  const e=environment();await e.scheduler.sync();let release;e.scheduler.getServerState=()=>new Promise(resolve=>{release=resolve;});
  const first=e.scheduler.sync(),second=e.scheduler.sync({hard:true});assert.equal(first,second);
  release({phase:'opening',startedAt:e.server.startedAt,serverNow:e.server.startedAt+100});await first;assert.equal(e.samples.at(-1).reconstruct,true);
});
test('scheduler: a response arriving after stop cannot change anchor, phase or history',async()=>{
  const e=environment();await e.scheduler.sync();let release;e.scheduler.getServerState=()=>new Promise(resolve=>{release=resolve;});
  const task=e.scheduler.sync();e.scheduler.stop();release({phase:'photo',startedAt:2000000,serverNow:2005000});assert.equal(await task,false);
  assert.equal(e.scheduler.phase,'opening');assert.equal(e.scheduler.elapsedNow(),0);
});
test('scheduler: restart waits for reconstruction and supersedes pending manual synchronization',async()=>{
  const e=environment(0,[cue('missed',10)]);await e.scheduler.sync();e.clock.advance(20);
  const releases=[];e.scheduler.getServerState=()=>new Promise(resolve=>releases.push(resolve));
  const old=e.scheduler.sync(),started=e.scheduler.start();assert.equal(releases.length,2);
  e.raf.frame();assert.equal(e.events.length,0);
  releases[0]({phase:'opening',startedAt:1000000,serverNow:1000000});assert.equal(await old,false);
  releases[1]({phase:'opening',startedAt:1000000,serverNow:1000020});await started;e.raf.frame();
  assert.equal(e.events.length,0);assert(e.scheduler.fired.has('missed'));assert.equal(e.raf.callbacks.size,1);e.scheduler.stop();
});
test('scheduler: hard reconstruction can be requested explicitly on tab reconnect',async()=>{
  const e=environment(0,[cue('history',10),cue('future',20000)]);await e.scheduler.sync();
  e.clock.advance(10000);e.server.elapsed=10000;await e.scheduler.sync({hard:true});e.scheduler.frame();
  assert.equal(e.events.length,0);assert(e.scheduler.fired.has('history'));e.advance(10000);assert.equal(e.events[0].id,'future');
});
test('scheduler: null startedAt is inactive and cue zero does not execute in lobby',async()=>{
  const e=environment(0,[cue('zero',0)]);e.server.phase='lobby';e.server.startedAt=null;await e.scheduler.sync();e.scheduler.frame();assert.equal(e.events.length,0);assert.equal(e.scheduler.elapsedNow(),0);
});
test('scheduler: invalid cues and timing inputs fail explicitly',()=>{
  const e=environment();assert.throws(()=>e.scheduler.setCues([cue('a',0),cue('a',1)]));assert.throws(()=>e.scheduler.setCues([cue('a',NaN)]));assert.throws(()=>e.scheduler.reconstruct(-1));
  assert.throws(()=>classifyFiniteCue(0,0,0));assert.throws(()=>resolveLoopOffset(Infinity,0,1));assert.throws(()=>resolveAutomationValue(0,[{at:0,duration:0,from:0,to:1}],0));
});
test('scheduler helpers: linear automation interpolates, holds endpoints and never overshoots',()=>{
  const segments=[{at:10,duration:20,from:.2,to:.8}];assert.equal(resolveAutomationValue(9,segments,.1),.1);
  near(resolveAutomationValue(10,segments,0),.2);near(resolveAutomationValue(20,segments,0),.5);near(resolveAutomationValue(30,segments,0),.8);near(resolveAutomationValue(100,segments,0),.8);
  const descending=[{at:0,duration:10,from:1,to:0}];for(let i=0;i<=20;i++){const value=resolveAutomationValue(i,descending,0);assert(value>=0&&value<=1);}
});
test('scheduler helpers: automation ordering is stable and input remains untouched',()=>{
  const input=[{at:10,duration:10,from:1,to:0},{at:0,duration:10,from:0,to:1},{at:10,duration:10,from:.5,to:.5}],before=JSON.stringify(input);
  near(resolveAutomationValue(15,input,0),.5);assert.equal(JSON.stringify(input),before);
});
test('scheduler helpers: finite classification is future / [start,end) active / expired',()=>{
  assert.equal(classifyFiniteCue(9,10,20),'future');assert.equal(classifyFiniteCue(10,10,20),'active');assert.equal(finiteCueOffset(10,10,20),0);
  assert.equal(finiteCueOffset(29,10,20),19);assert.equal(classifyFiniteCue(30,10,20),'expired');assert.equal(finiteCueOffset(30,10,20),null);assert.equal(finiteCueOffset(9,10,20),null);
});
test('scheduler helpers: loop offsets use absolute modulo with no accumulated drift',()=>{
  assert.equal(resolveLoopOffset(500,1000,3000),0);assert.equal(resolveLoopOffset(1000,1000,3000),0);assert.equal(resolveLoopOffset(4000,1000,3000),0);
  assert.equal(resolveLoopOffset(25*60*60*1000+1234,1000,3000),(25*60*60*1000+234)%3000);
});

test('scheduler: external polling applies RTT midpoint and ordinary bounded correction without fetching',async()=>{
  const e=environment();e.scheduler.autoSync=false;await e.scheduler.start();
  e.clock.value=100;
  assert(e.scheduler.acceptState({phase:'opening',startedAt:1000000,serverNow:1000500},{sentAt:0,receivedAt:100}));
  assert.equal(e.scheduler.elapsedNow(),550);
  e.scheduler.acceptState({phase:'opening',startedAt:1000000,serverNow:1001550},{sentAt:100,receivedAt:100});
  assert.equal(e.scheduler.elapsedNow(),800);assert.equal(e.server.requests,0);e.scheduler.stop();
});
test('scheduler: external poll suspension waits for authoritative reconstruction and consumes history',async()=>{
  const e=environment(0,[cue('historical',36000)]);e.scheduler.autoSync=false;await e.scheduler.start();
  e.scheduler.acceptState({phase:'opening',startedAt:1000000,serverNow:1030000});
  e.clock.advance(7000);e.raf.frame();assert(e.scheduler.recovering);assert.equal(e.events.length,0);assert.equal(e.server.requests,0);
  e.scheduler.acceptState({phase:'opening',startedAt:1000000,serverNow:1037000});
  assert(!e.scheduler.recovering);assert(e.scheduler.fired.has('historical'));assert.equal(e.events.length,0);assert.equal(e.samples.at(-1).reconstruct,true);e.scheduler.stop();
});
test('scheduler: invalid external responses preserve the anchor and pending reconstruction',()=>{
  const e=environment();e.scheduler.autoSync=false;
  e.scheduler.acceptState({phase:'opening',startedAt:1000000,serverNow:1000100});e.scheduler.recovering=true;
  assert.equal(e.scheduler.acceptState({phase:'opening',startedAt:1000000}),false);
  assert.equal(e.scheduler.anchorElapsed,100);assert(e.scheduler.recovering);
});

// Four named seeds x 125 cases = 500 generated cases per property.
// Each generated case executes twice with fresh clocks and is compared exactly.
const SEEDS={HALLOWEEN_1996:0x19961031,HALLOWEEN_2026:0x20261031,BROOKWOOD:0x00B00C,COFFEE:0xC0FFEE};
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const integer=(rng,min,max)=>min+Math.floor(rng()*(max-min+1));
const array=(rng,min,max,make)=>Array.from({length:integer(rng,min,max)},(_,i)=>make(i));
function shuffle(rng,input){const output=[...input];for(let i=output.length-1;i>0;i--){const j=integer(rng,0,i);[output[i],output[j]]=[output[j],output[i]];}return output;}
function randomCues(rng,min=1,max=50,limit=120000){return shuffle(rng,array(rng,min,max,i=>cue(`cue-${i}`,rng()<.35?[0,1,88000,120000][integer(rng,0,3)]:integer(rng,0,limit))));}
function property(name,generate,execute){test(`property: ${name} (500 seeded cases, each replayed)`,async()=>{
  for(const [seedName,seed] of Object.entries(SEEDS)){
    const rng=mulberry32(seed);
    for(let index=0;index<125;index++){
      const input=generate(rng);
      try {const first=await execute(structuredClone(input)),second=await execute(structuredClone(input));assert.deepEqual(first,second,'fresh executions differ');}
      catch(error){error.message=`Property=${name}; seed=${seedName}/0x${seed.toString(16)}; case=${index}; inputs=${JSON.stringify(input)}\n${error.message}`;throw error;}
    }
  }
});}

property('stable ordering and ordered normal crossings',rng=>({cues:randomCues(rng,1,100),samples:array(rng,20,80,()=>integer(rng,0,120000)).concat([0,88000,120000]).sort((a,b)=>a-b)}),async input=>{
  const before=JSON.stringify(input.cues),e=environment(0,input.cues);await e.scheduler.sync();
  const expected=input.cues.map((cue,index)=>({cue,index})).sort((a,b)=>a.cue.at-b.cue.at||a.index-b.index).map(x=>x.cue);
  assert.deepEqual(e.scheduler.cues,expected);assert.equal(JSON.stringify(input.cues),before);
  for(const time of input.samples){e.clock.value=time;e.scheduler.frame();}
  assert.deepEqual(e.events.map(c=>c.id),expected.map(c=>c.id));assert(e.events.every(c=>c.elapsed>=c.at));return e.trace();
});
property('one-shots exactly once across normal repeated frames and jumps',rng=>({cues:randomCues(rng),samples:array(rng,20,200,()=>integer(rng,0,120000)).concat([0]).sort((a,b)=>a-b)}),async input=>{
  const e=environment(0,input.cues);await e.scheduler.sync();for(const time of input.samples){e.clock.value=time;e.scheduler.frame();e.scheduler.frame();}
  const actual=counts(e.events),end=input.samples.at(-1);for(const c of input.cues)assert.equal(actual[c.id]||0,c.at<=end?1:0);return e.trace();
});
property('one-shot history survives arbitrary hard reconstructions',rng=>({cues:randomCues(rng),positions:array(rng,20,100,()=>({hard:rng()<.35,elapsed:integer(rng,0,120000)}))}),async input=>{
  const e=environment(0,input.cues);await e.scheduler.sync();for(const op of input.positions){
    if(op.hard){const before=e.events.length;e.scheduler.reconstruct(op.elapsed);assert.equal(e.events.length,before);}
    else{e.clock.advance(op.elapsed%1000);e.scheduler.frame();}
    assert(Object.values(counts(e.events)).every(n=>n<=1));
  }return e.trace();
});
property('uncorrected elapsed is monotonic and equals accumulated fake time',rng=>({start:integer(rng,0,100000),advances:array(rng,10,500,()=>integer(rng,0,1000))}),async input=>{
  const e=environment(input.start);await e.scheduler.sync();let previous=input.start,total=0;
  for(const advance of input.advances){e.advance(advance);total+=advance;const value=e.scheduler.elapsedNow();assert(value>=previous&&value>=0);near(value-input.start,total);previous=value;}return e.trace();
});
property('bounded forward correction never duplicates history',rng=>({local:integer(rng,0,120000),error:integer(rng,1,1500)}),async input=>{
  const e=environment(input.local,[cue('boundary',input.local)]);await e.scheduler.sync();e.scheduler.frame();e.server.elapsed=input.local+input.error;await e.scheduler.sync();
  const correction=e.scheduler.anchorElapsed-input.local;near(correction,Math.min(input.error,FORWARD));assert(correction>=0&&correction<=FORWARD&&correction<=input.error);
  e.scheduler.frame();assert.equal(counts(e.events).boundary,1);return {...e.trace(),correction};
});
property('bounded backward correction never rearms history',rng=>({local:integer(rng,2000,120000),error:integer(rng,1,1500)}),async input=>{
  const e=environment(input.local,[cue('boundary',input.local)]);await e.scheduler.sync();e.scheduler.frame();e.server.elapsed=input.local-input.error;await e.scheduler.sync();
  const correction=input.local-e.scheduler.anchorElapsed;near(correction,Math.min(input.error,BACKWARD));assert(correction>=0&&correction<=BACKWARD&&correction<=input.error);
  e.advance(2000);assert.equal(counts(e.events).boundary,1);return {...e.trace(),correction};
});
const operations=rng=>array(rng,50,500,()=>{const type=['advance','sync','frame','repeat'][integer(rng,0,3)];return {type,value:type==='sync'?integer(rng,-1500,1500):integer(rng,0,500)};});
async function randomSequence(input){
  const e=environment(input.start,input.cues);await e.scheduler.sync();const corrections=[];
  for(const op of input.operations){
    if(op.type==='advance')e.clock.advance(op.value);
    else if(op.type==='sync'){
      const before=e.scheduler.elapsedNow();e.server.elapsed=Math.max(0,before+op.value);await e.scheduler.sync();const correction=e.scheduler.elapsedNow()-before;
      assert(correction<=FORWARD&&correction>=-BACKWARD);corrections.push(correction);
    }else{e.scheduler.frame();if(op.type==='repeat')e.scheduler.frame();}
    const elapsed=e.scheduler.elapsedNow();assert(Number.isFinite(elapsed)&&elapsed>=0);assert(Object.values(counts(e.events)).every(n=>n<=1));
  }return {...e.trace(),corrections};
}
property('random correction sequences stay bounded and one-shot',rng=>({start:integer(rng,2000,10000),cues:randomCues(rng),operations:operations(rng)}),randomSequence);
property('hard resync consumes history and leaves future cues armed',rng=>{
  const local=integer(rng,0,120000),server=local+integer(rng,1501,200000);
  return {local,server,cues:randomCues(rng,1,98,server+120000).concat([cue('at-server',server),cue('after-server',server+1)])};
},async input=>{
  const e=environment(input.local,input.cues);await e.scheduler.sync();e.server.elapsed=input.server;await e.scheduler.sync();assert.equal(e.scheduler.elapsedNow(),input.server);
  for(const c of input.cues)if(c.at<input.server)assert(e.scheduler.fired.has(c.id));else assert(!e.scheduler.fired.has(c.id));
  assert.equal(e.events.length,0);e.scheduler.frame();e.advance(120001);
  const actual=counts(e.events);for(const c of input.cues)assert.equal(actual[c.id]||0,c.at<input.server?0:1);return e.trace();
});
property('new run rearms, same run never rearms',rng=>({cues:randomCues(rng),cut:integer(rng,0,120000),reconstructions:array(rng,5,20,()=>integer(rng,0,120000))}),async input=>{
  const e=environment(0,input.cues);await e.scheduler.sync();e.scheduler.frame();e.advance(input.cut);const crossed=e.events.map(c=>c.id);
  for(const position of input.reconstructions){e.server.elapsed=position;await e.scheduler.sync({hard:true});e.scheduler.frame();}
  const oldRun=e.server.startedAt;e.server.startedAt++;e.server.elapsed=0;await e.scheduler.sync();assert.equal(e.scheduler.fired.size,0);e.scheduler.frame();e.advance(120000);
  const perRun={};for(const event of e.events){const key=`${event.run}:${event.id}`;perRun[key]=(perRun[key]||0)+1;assert(perRun[key]<=1);}
  for(const id of crossed){assert.equal(perRun[`${oldRun}:${id}`],1);assert.equal(perRun[`${e.server.startedAt}:${id}`],1);}return {...e.trace(),perRun};
});
property('volume ramp bounds, endpoints and monotonicity',rng=>{
  const at=integer(rng,0,120000),duration=integer(rng,1,10000);
  return {segment:{at,duration,from:rng(),to:rng(),curve:'linear'},samples:array(rng,96,96,()=>integer(rng,0,at+duration*2)).concat([at-1,at,at+duration/2,at+duration])};
},input=>{
  const s=input.segment,min=Math.min(s.from,s.to),max=Math.max(s.from,s.to),values=[];
  near(resolveAutomationValue(s.at,[s],0),s.from);near(resolveAutomationValue(s.at+s.duration,[s],0),s.to);
  const inside=input.samples.filter(t=>t>=s.at&&t<=s.at+s.duration).sort((a,b)=>a-b);let previous=null;
  for(const time of inside){const value=resolveAutomationValue(time,[s],0);assert(value>=min-1e-9&&value<=max+1e-9);if(previous!==null)assert(s.to>=s.from?value>=previous-1e-9:value<=previous+1e-9);previous=value;}
  for(const time of input.samples){const value=resolveAutomationValue(time,[s],.1);if(time>=s.at)assert(value>=min-1e-9&&value<=max+1e-9);values.push(value);}return values;
});
property('finite audio classification and seek boundaries',rng=>({start:integer(rng,0,120000),duration:integer(rng,1,120000),elapsed:integer(rng,0,360000)}),input=>{
  const {start,duration}=input,results=[];
  for(const elapsed of [input.elapsed,start-1,start,start+duration-.001,start+duration,start+duration+1]){
    const expected=elapsed<start?'future':elapsed<start+duration?'active':'expired',kind=classifyFiniteCue(elapsed,start,duration),offset=finiteCueOffset(elapsed,start,duration);
    assert.equal(kind,expected);if(kind==='active'){near(offset,elapsed-start);assert(offset>=0&&offset<duration);}else assert.equal(offset,null);results.push({kind,offset});
  }return results;
});
property('loop seek is exact absolute modulo over hours and many loops',rng=>{
  const start=integer(rng,0,100000),duration=integer(rng,1000,120000);
  return {start,duration,elapsed:start+integer(rng,0,rng()<.5?864000000:2**40)};
},input=>{
  const {start,duration,elapsed}=input,offset=resolveLoopOffset(elapsed,start,duration);assert(offset>=0&&offset<duration);assert.equal(offset,(elapsed-start)%duration);return offset;
});
property('deterministic combined clock and pure-helper results',rng=>({start:integer(rng,2000,10000),cues:randomCues(rng),operations:operations(rng),ramp:{at:0,duration:integer(rng,1,10000),from:rng(),to:rng()}}),async input=>{
  const trace=await randomSequence(input);return {...trace,volumes:trace.samples.map(s=>resolveAutomationValue(s.value,[input.ramp],0)),offsets:trace.samples.map(s=>resolveLoopOffset(s.value,0,3577))};
});
