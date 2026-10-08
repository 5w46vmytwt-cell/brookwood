import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { TVCinematicRuntime } from '../tv-cinematic.js';
import {PhoneChapter3Runtime} from '../phone-chapter3.js';
import {castingRoles} from '../chapter5-timing.js';

const inline = file => [...fs.readFileSync(file, 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).join('\n');
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = { phase: 'lobby', player: { name: 'Player', partner: null, partnerId: null, inventory: [], ready: false }, others: [] };
function privateResponse(elapsed=12600,openedAt=null,readAt=null){return {...response,phase:elapsed<12600?'chapter3-opening':'private-messages',player:{...response.player,id:'real'},photo:{confirmed:true,confirmedCount:12,complete:true},serverNow:200000+elapsed,chapter3:{startedAt:200000,openedAt,readAt,assignment:openedAt!==null&&readAt===null?{title:'KEEP THIS TO YOURSELF',body:'Persisted private message.'}:null}};}
async function privateEnvironment(state){const e=environment(JSON.stringify({id:'real',token:'secret'}));e.context.lobbyRequest=async()=>state;vm.runInContext(inline('join.html'),e.context);await flush();return e;}
function doorResponse(active=false,voted=false,complete=false){return {...privateResponse(15000,212600,213000),phase:complete?'door-vote-complete':active?'door-vote':'chapter4-opening',serverNow:4000000+(active?114474:3000),others:[{id:'other',name:'Other Player'}],chapter4:{startedAt:4000000,active,voted,complete,votingActivatedAt:active?4114474:null,voteCount:complete?12:voted?1:0,selectedPlayer:complete?{id:'other',name:'Other Player'}:null}};}
function castingResponse(index=0,voted=false,phase='chapter5-casting'){
  const role=castingRoles[index];return {...doorResponse(true,true,true),phase,serverNow:5011200,
    others:Array.from({length:11},(_,i)=>({id:'other'+i,name:'Friend '+i})),
    chapter5:{startedAt:5000000,roundIndex:index,castStartedAt:null,completedAt:null,winners:[],
      round:{...role,startedAt:5010000,completedAt:null,votingActive:phase==='chapter5-casting',voted,voteCount:voted?1:0,winner:null}}};
}

test('selected package phone alone shows authenticated confirmation and double clicks start one canonical Chapter 5',async()=>{
  const selected=doorResponse(true,true,true);selected.chapter4.canOpenPackage=true;selected.chapter4.selectedPlayer={id:'real',name:'Player'};
  const e=await privateEnvironment(selected),calls=[];
  assert(!e.document.getElementById('packageOpen').classList.contains('hidden'));
  e.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return url==='/api/me'?castingResponse(0,false,'chapter5-intro'):{ok:true};};
  vm.runInContext('openPhysicalPackage();openPhysicalPackage()',e.context);await flush();
  assert.equal(calls.filter(c=>c.url==='/api/player').length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)),{id:'real',token:'secret',action:'package-open',chapter4StartedAt:4000000});
  assert.equal(e.document.getElementById('castingTitle').textContent,'THE CAST');
  e.context.previous=selected;vm.runInContext('render(previous)',e.context);
  assert(!e.document.getElementById('castingBox').classList.contains('hidden'));
  const other=await privateEnvironment(doorResponse(true,true,true));assert(other.document.getElementById('packageOpen').classList.contains('hidden'));
});

test('untouched casting phone polls through intro, immutable vote, next round and finale without reload or reveal animation',async()=>{
  let state=castingResponse(0,false,'chapter5-intro');const e=await privateEnvironment(state);
  e.context.lobbyRequest=async()=>state;
  const poll=async()=>{assert.equal(e.timers.size,1);[...e.timers.values()][0]();await flush();assert.equal(e.timers.size,1);};
  assert(e.document.getElementById('castingSubmit').classList.contains('hidden'));
  state=castingResponse();await poll();assert.equal(e.document.getElementById('castingTitle').textContent,'THE SCREAMER');
  assert(!e.document.getElementById('castingSubmit').classList.contains('hidden'));
  assert.equal(e.document.getElementById('castingTarget').children.length,12);
  assert(!e.document.getElementById('castingTarget').children.some(p=>p.value==='real'));
  state=castingResponse(0,true);await poll();assert.equal(e.document.getElementById('castingTitle').textContent,'VOTE RECORDED');
  e.context.oldState=castingResponse();vm.runInContext('render(oldState)',e.context);assert.equal(e.document.getElementById('castingTitle').textContent,'VOTE RECORDED');
  state=castingResponse(1);await poll();assert.equal(e.document.getElementById('castingTitle').textContent,'THE TERRIBLE DECISION MAKER');
  e.context.oldState=castingResponse(0,true);vm.runInContext('render(oldState)',e.context);assert.equal(e.document.getElementById('castingTitle').textContent,'THE TERRIBLE DECISION MAKER');
  state=castingResponse(5,true,'chapter5-finale');await poll();assert.equal(e.document.getElementById('castingTitle').textContent,'THE CAST IS COMPLETE');
  assert(e.document.getElementById('privateBlank').hidden);
});

test('casting phone sends only own authenticated immutable ballot, run and role and reconstructs recorded vote',async()=>{
  const e=await privateEnvironment(castingResponse()),calls=[];e.document.getElementById('castingTarget').value='other0';
  e.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return url==='/api/me'?castingResponse(0,true):{ok:true};};
  vm.runInContext('submitCastingVote();submitCastingVote()',e.context);await flush();
  assert.equal(calls.filter(c=>c.url==='/api/player').length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)),{id:'real',token:'secret',action:'casting-vote',chapter5StartedAt:5000000,roleId:'screamer',targetId:'other0'});
  assert.equal(e.document.getElementById('castingTitle').textContent,'VOTE RECORDED');
  const reconnect=await privateEnvironment(castingResponse(0,true));assert.equal(reconnect.document.getElementById('castingTitle').textContent,'VOTE RECORDED');assert(reconnect.document.getElementById('privateBlank').hidden);
});

test('Chapter 5 phone and TV integration contains real DOM nodes, test destinations and no privileged credentials',()=>{
  const phone=fs.readFileSync('join.html','utf8'),tv=fs.readFileSync('tv.html','utf8');
  for(const id of ['packageOpen','castingBox','castingTitle','castingCopy','castingQuestion','castingTarget','castingSubmit','castingCount','castingErr'])assert(phone.includes('id="'+id+'"'),id);
  for(const id of ['chapter5TV','chapter5-cardImage','chapter5-voteCount','chapter5-winnerName','chapter5HostCode'])assert(tv.includes('id="'+id+'"'),id);
  assert(tv.includes('value="package"'));assert(tv.includes('value="chapter5"'));
  assert(!phone.includes('HOST_KEY'));assert(!tv.includes('HOST_KEY'));
});
test('Chapter 4 live phone polling transitions completed message to voting and restores recorded/result states',async()=>{
  let state=doorResponse();const e=await privateEnvironment(state);assert.equal(e.document.getElementById('privateTitle').textContent,'MESSAGE RECEIVED');assert.equal(e.document.getElementById('privateBody').textContent,'');
  e.context.lobbyRequest=async()=>state;const poll=async()=>{[...e.timers.values()][0]();await flush();assert.equal(e.timers.size,1);};
  state=doorResponse(true);await poll();assert(!e.document.getElementById('voteBox').classList.contains('hidden'));assert.equal(e.document.getElementById('voteTitle').textContent,'CHOOSE WHO GOES');
  state=doorResponse(true,true);await poll();assert.equal(e.document.getElementById('voteTitle').textContent,'VOTE RECORDED');assert(e.document.getElementById('voteSubmit').classList.contains('hidden'));
  state=doorResponse(true,true,true);await poll();assert.equal(e.document.getElementById('voteTitle').textContent,'Other Player');assert(e.document.getElementById('voteCopy').textContent.includes('sealed package'));assert(!e.document.getElementById('voteCopy').textContent.includes('open'));
  const reconnect=await privateEnvironment(state);assert.equal(reconnect.document.getElementById('voteTitle').textContent,'Other Player');
});
test('phone door vote sends own token and canonical run, suppresses duplicate clicks and uses authoritative readback',async()=>{
  const e=await privateEnvironment(doorResponse(true)),calls=[];e.document.getElementById('voteTarget').value='other';e.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return url==='/api/me'?doorResponse(true,true):{ok:true};};
  vm.runInContext('castDoorVote();castDoorVote()',e.context);await flush();assert.equal(calls.length,2);assert.equal(calls[0].body.action,'door-vote');assert.equal(calls[0].body.id,'real');assert.equal(calls[0].body.token,'secret');assert.equal(calls[0].body.targetId,'other');assert.equal(calls[0].body.chapter4StartedAt,4000000);assert.equal(e.document.getElementById('voteTitle').textContent,'VOTE RECORDED');
});
test('delayed phone poll cannot undo own recorded vote or completed result, but a new run resets voting',async()=>{
  const e=await privateEnvironment(doorResponse(true,true));e.context.next=doorResponse(true);vm.runInContext('render(next)',e.context);assert.equal(e.document.getElementById('voteTitle').textContent,'VOTE RECORDED');
  e.context.next=doorResponse(true,true,true);vm.runInContext('render(next)',e.context);e.context.next=doorResponse(true,true);vm.runInContext('render(next)',e.context);assert.equal(e.document.getElementById('voteTitle').textContent,'Other Player');
  e.context.next=doorResponse(true);e.context.next.chapter4.startedAt=5000000;vm.runInContext('render(next)',e.context);assert.equal(e.document.getElementById('voteTitle').textContent,'CHOOSE WHO GOES');
});
test('TV triggers Chapter 4 only after Chapter 3 completion and requests voting at its canonical boundary',async()=>{
  const e=returnEnvironment();await flush();const calls=[];e.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return {ok:true};};
  e.context.next={phase:'private-messages-complete',startedAt:1,serverNow:121999,players:[],chapter3:{startedAt:100000,completedAt:120000,readCount:12}};vm.runInContext('render(next)',e.context);await flush();assert.equal(calls.length,0);
  e.context.next.serverNow=122000;vm.runInContext('render(next)',e.context);await flush();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/progress');assert.deepEqual(Object.keys(calls[0].body),[]);
  e.context.next={phase:'chapter4-opening',startedAt:1,serverNow:414474,players:[],chapter3:{startedAt:200000,completedAt:220000,readCount:12},chapter4:{startedAt:300000,complete:false,active:true,voteCount:0}};vm.runInContext('render(next)',e.context);await flush();assert.equal(calls.length,2);assert.equal(calls[1].url,'/api/progress');
});
test('untouched PHOTO COMPLETE phone transitions on active poll even while RAF clock lags',async()=>{
  let state={...privateResponse(),phase:'photo-complete'};delete state.chapter3;delete state.serverNow;
  const e=await privateEnvironment(state);let requests=0;
  e.context.lobbyRequest=async(url,body)=>{assert.equal(url,'/api/me');assert.equal(body.id,'real');requests++;return state;};
  const poll=async()=>{assert.equal(e.timers.size,1);const cb=[...e.timers.values()][0];cb();await flush();assert.equal(e.timers.size,1);};
  assert.equal(e.document.getElementById('photoTitle').textContent,'PHOTO COMPLETE');
  state=privateResponse(11800);await poll();assert.equal(e.document.getElementById('photoTitle').textContent,'PHOTO COMPLETE');
  // No reload, click, or RAF delivery. Ordinary correction is bounded to 250ms.
  state=privateResponse(12600);await poll();assert(vm.runInContext('privateRuntime.scheduler.elapsedNow()<12600',e.context));
  assert(!e.document.getElementById('privateBox').classList.contains('hidden'));assert(e.document.getElementById('photoBox').classList.contains('hidden'));
  assert.equal(e.document.getElementById('privateTitle').textContent,'PRIVATE MESSAGE');assert(!e.document.getElementById('privateOpen').classList.contains('hidden'));
  assert.equal(e.document.getElementById('privateBlank').hidden,true);
  state=privateResponse(13000,212600);await poll();assert.equal(e.document.getElementById('privateBody').textContent,'Persisted private message.');assert.equal(e.document.getElementById('privateBlank').hidden,true);
  await poll();assert.equal(e.document.getElementById('privateBlank').hidden,true);
  state=privateResponse(14000,212600,213000);await poll();assert.equal(e.document.getElementById('privateTitle').textContent,'MESSAGE RECEIVED');assert.equal(e.document.getElementById('privateBody').textContent,'');assert.equal(requests,5);
});
test('private phone reconnect reconstructs before activation, unopened, unread and read states',async()=>{
  for(const [state,title] of [[privateResponse(12599),'PHOTO COMPLETE'],[privateResponse(),'PRIVATE MESSAGE'],[privateResponse(13000,212600),'KEEP THIS TO YOURSELF'],[privateResponse(13000,212600,212900),'MESSAGE RECEIVED']]){
    const e=await privateEnvironment(state);assert.equal(e.document.getElementById(state.serverNow<212600?'photoTitle':'privateTitle').textContent,title);assert.equal(e.document.getElementById('privateBlank').hidden,true);
    if(state.chapter3.readAt!==null)assert.equal(e.document.getElementById('privateBody').textContent,'');
  }
});
test('OPEN uses own authentication and exactly 350ms blank reveal; READ removes private body',async()=>{
  const e=await privateEnvironment(privateResponse()),calls=[];
  e.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return url==='/api/me'?privateResponse(12600,212600):{ok:true};};
  vm.runInContext("privateAction('message-open');privateAction('message-open')",e.context);await flush();
  assert.equal(calls.filter(c=>c.url==='/api/player').length,1);assert.equal(calls[0].body.id,'real');assert.equal(calls[0].body.token,'secret');assert.equal(e.document.getElementById('privateBlank').hidden,false);
  e.setPerformance(349);vm.runInContext('privateRuntime.scheduler.frame()',e.context);assert.equal(e.document.getElementById('privateBlank').hidden,false);
  e.setPerformance(350);vm.runInContext('privateRuntime.scheduler.frame()',e.context);assert.equal(e.document.getElementById('privateBlank').hidden,true);assert.equal(e.document.getElementById('privateBody').textContent,'Persisted private message.');
  e.context.lobbyRequest=async url=>url==='/api/me'?privateResponse(13000,212600,213000):{ok:true};
  vm.runInContext("privateAction('message-read')",e.context);await flush();assert.equal(e.document.getElementById('privateBody').textContent,'');assert.equal(e.document.getElementById('privateTitle').textContent,'MESSAGE RECEIVED');
});
test('invalidated phone session stops private renderer and cannot redisplay its message',async()=>{
  const e=await privateEnvironment(privateResponse(13000,212600));vm.runInContext('clearSession();privateRuntime.scheduler.frame()',e.context);assert(e.document.getElementById('privateBox').classList.contains('hidden'));assert.equal(e.storage.size,0);
});
test('Chapter Select TV control requires valid cast and sends only selected checkpoint and entered PIN',async()=>{
  const e=returnEnvironment();const players=Array.from({length:12},(_,i)=>({id:'p'+i,name:'P'+i,partnerId:'p'+(i^1),ready:true}));
  e.context.selectedState={phase:'lobby',startedAt:null,serverNow:100000,players};vm.runInContext('render(selectedState);openChapterSelect()',e.context);
  assert.equal(e.document.getElementById('chapterSelectToggle').hidden,false);assert.equal(e.document.getElementById('chapterSelectPanel').hidden,false);
  const calls=[];e.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return {ok:true};};
  e.document.getElementById('chapterSelectCode').value='entered-host-pin';e.document.getElementById('chapterSelectCheckpoint').value='chapter3';
  vm.runInContext('selectTestChapter();selectTestChapter()',e.context);await flush();assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/host');assert.equal(calls[0].body.action,'chapter-select');assert.equal(calls[0].body.checkpoint,'chapter3');assert.equal(calls[0].body.code,'entered-host-pin');assert.deepEqual(Object.keys(calls[0].body).sort(),['action','checkpoint','code']);
  assert.equal(e.document.getElementById('chapterSelectPanel').hidden,true);assert.equal(e.document.getElementById('chapterSelectCode').value,'');
  e.context.selectedState={phase:'opening',startedAt:100000,serverNow:144000,players};vm.runInContext('render(selectedState)',e.context);assert.equal(e.document.getElementById('chapterSelectToggle').hidden,true);
  e.document.events.keydown({key:'C',ctrlKey:true,shiftKey:true,preventDefault(){}});assert.equal(e.document.getElementById('chapterSelectPanel').hidden,false);
  e.context.selectedState.players=[];vm.runInContext('render(selectedState);openChapterSelect()',e.context);assert.equal(e.document.getElementById('chapterSelectToggle').hidden,true);assert.equal(e.document.getElementById('chapterSelectPanel').hidden,true);
});
test('Chapter Select phone updates without reload across private, photo, opening and fresh private runs',async()=>{
  const e=await privateEnvironment(privateResponse(13000,212600,213000));
  e.context.nextState={...privateResponse(),phase:'photo'};delete e.context.nextState.chapter3;vm.runInContext('render(nextState)',e.context);assert(!e.document.getElementById('photoBox').classList.contains('hidden'));assert(e.document.getElementById('privateBox').classList.contains('hidden'));
  e.context.nextState={...response,phase:'opening'};vm.runInContext('render(nextState)',e.context);assert(e.document.getElementById('opening').classList.contains('show'));
  e.context.nextState=privateResponse(0);e.context.nextState.chapter3.startedAt=300000;e.context.nextState.serverNow=300000;vm.runInContext('render(nextState)',e.context);assert.equal(e.document.getElementById('photoTitle').textContent,'PHOTO COMPLETE');
  e.context.nextState.phase='private-messages';e.context.nextState.serverNow=312600;vm.runInContext('render(nextState)',e.context);assert.equal(e.document.getElementById('privateTitle').textContent,'PRIVATE MESSAGE');assert(!e.document.getElementById('privateOpen').classList.contains('hidden'));
});
function environment(stored = null) {
  const nodes = new Map(), timers = new Map(), storage = new Map(); let serial = 0, perf = 0;
  if (stored !== null) storage.set('brookwood-player-v3', stored);
  function element() {
    const classes = new Set();
    return { style: {}, textContent: '', get innerHTML(){return this.markup||'';}, set innerHTML(value){this.markup=value;this.children=[];}, value: '', options: [], children: [], events: {}, hidden: false,
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, yes) { if (yes) classes.add(c); else classes.delete(c); } },
      focus() { this.focused=true; }, addEventListener(name, cb) { this.events[name] = cb; }, appendChild(node) { this.children.push(node); }, querySelector: element };
  }
  const document = { events: {}, addEventListener(name,cb) { this.events[name]=cb; }, getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }, createElement: element };
  const context = vm.createContext({ performance:{now:()=>perf}, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, document, location: { origin: 'https://brookwood.example' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    setTimeout(cb) { const id = ++serial; timers.set(id, cb); return id; }, clearTimeout(id) { timers.delete(id); },
    confirm: () => true, AbortController, TypeError });
  vm.runInContext(fs.readFileSync('cinematic-engine.js','utf8'), context);
  vm.runInContext(fs.readFileSync('chapter1.js','utf8'), context);
  vm.runInContext(fs.readFileSync('cinematic-audio.js','utf8'), context);
  context.BrookwoodTV={Runtime:class extends TVCinematicRuntime {constructor(options){super({...options,Renderer:context.BrookwoodTimeline.Renderer,Player:context.BrookwoodAudio.Player,soundtrack:context.BrookwoodAudio.tvSoundtrack,now:context.performance.now,requestFrame:context.requestAnimationFrame,cancelFrame:context.cancelAnimationFrame});}}};
  context.BrookwoodPrivatePhone={Runtime:class extends PhoneChapter3Runtime{constructor(options){super({...options,now:context.performance.now,requestFrame:context.requestAnimationFrame,cancelFrame:context.cancelAnimationFrame});}}};
  return { context, document, timers, storage, setPerformance(value){perf=value;} };
}

test('syntax, JSON, imports, route destinations and shared client asset pass', () => {
  const files = fs.readdirSync('api').map(f => 'api/' + f).concat(['client.js','cinematic-engine.js','cinematic-audio.js','chapter1.js'], fs.readdirSync('tests').map(f => 'tests/' + f));
  for (const f of files) {
    const result = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  for (const f of ['join.html', 'tv.html']) {
    new vm.Script(inline(f), { filename: f });
    assert(fs.readFileSync(f, 'utf8').includes('src="/client.js"'));
  }
  const config = JSON.parse(fs.readFileSync('vercel.json'));
  for (const r of config.rewrites) assert(fs.existsSync('.' + r.destination));
  assert.equal(JSON.parse(fs.readFileSync('package.json')).type, 'module');
});

function returnEnvironment(elapsed=44000) {
  const env=environment();let now=100000+elapsed;
  env.context.Date={now:()=>now};
  env.context.lobbyRequest=async()=>({phase:'opening',startedAt:100000,serverNow:now,players:[]});
  vm.runInContext(inline('tv.html'),env.context);
  env.document.getElementById('returnControl').hidden=true;
  vm.runInContext("render({serverNow:Date.now(),phase:'opening',startedAt:100000,players:[]})",env.context);
  env.key=key=>env.document.events.keydown({key,preventDefault(){},target:{tagName:'BODY'}});
  env.setElapsed=ms=>{env.setPerformance(ms-elapsed);now=100000+ms;};
  return env;
}

test('hidden return control requires completed valid opening and five separate R presses within two seconds', () => {
  const env=returnEnvironment(43999), control=env.document.getElementById('returnControl');
  for(let i=0;i<5;i++)env.key('r');assert(control.hidden);
  env.setElapsed(44000);for(let i=0;i<4;i++)env.key('R');assert(control.hidden);
  env.setElapsed(46001);env.key('r');assert(control.hidden);
  for(let i=0;i<4;i++)env.key('r');assert.equal(control.hidden,false);
  assert(env.document.getElementById('returnCode').focused);
  env.key('Escape');assert(control.hidden);
  vm.runInContext("render({serverNow:Date.now(),phase:'opening',startedAt:null,players:[]})",env.context);
  for(let i=0;i<5;i++)env.key('r');assert(control.hidden);
  vm.runInContext("render({serverNow:Date.now(),phase:'lobby',startedAt:100000,players:[]})",env.context);
  for(let i=0;i<5;i++)env.key('r');assert(control.hidden);
});

test('return overlay Escape closes and clears credentials without an API mutation', async () => {
  const env=returnEnvironment();let calls=0;
  env.context.lobbyRequest=async()=>{calls++;};for(let i=0;i<5;i++)env.key('r');
  env.document.getElementById('returnCode').value='private';env.document.getElementById('returnError').textContent='old error';
  env.key('Escape');await flush();assert.equal(calls,0);assert(env.document.getElementById('returnControl').hidden);
  assert.equal(env.document.getElementById('returnCode').value,'');assert.equal(env.document.getElementById('returnError').textContent,'');
});

test('Enter submits authenticated return action, success clears overlay and populated lobby renders', async () => {
  const env=returnEnvironment();const calls=[];
  env.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return {ok:true};};
  for(let i=0;i<5;i++)env.key('r');env.document.getElementById('returnCode').value='host-test-code';
  env.key('Enter');env.key('Enter');await flush();
  assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/host');assert.equal(calls[0].body.action,'return-lobby');assert.equal(calls[0].body.code,'host-test-code');
  assert(env.document.getElementById('returnControl').hidden);assert.equal(env.document.getElementById('returnCode').value,'');
  vm.runInContext("render({serverNow:Date.now(),phase:'lobby',startedAt:null,players:[{id:'one',name:'Allan',partnerId:'two',ready:true},{id:'two',name:'Friend',partnerId:'one',ready:true}]})",env.context);
  assert.equal(env.document.getElementById('count').textContent,2);assert.equal(env.document.getElementById('grid').children.length,12);
  assert(!env.document.getElementById('opening').classList.contains('show'));
});

test('return API failure keeps overlay open with its error and does not change TV state', async () => {
  const env=returnEnvironment();for(let i=0;i<5;i++)env.key('r');
  env.context.lobbyRequest=async()=>{throw Error('Wrong host code.');};
  env.key('Enter');await flush();assert.equal(env.document.getElementById('returnControl').hidden,false);
  assert.equal(env.document.getElementById('returnError').textContent,'Wrong host code.');
  assert(env.document.getElementById('opening').classList.contains('show'));assert.equal(env.document.getElementById('returnButton').disabled,false);
});

test('phone polling has at most one active request and one scheduled timer', async () => {
  const env = environment(JSON.stringify({ id: 'id', token: 'token' }));
  let calls = 0, resolve;
  env.context.lobbyRequest = () => { calls++; return new Promise(r => { resolve = r; }); };
  vm.runInContext(inline('join.html'), env.context);
  vm.runInContext('pollMe();pollMe();pollMe()', env.context);
  assert.equal(calls, 1); assert.equal(env.timers.size, 0);
  resolve(response); await flush(); assert.equal(env.timers.size, 1);
  vm.runInContext('pollMe();pollMe()', env.context);
  assert.equal(calls, 2); assert.equal(env.timers.size, 0);
  resolve(response); await flush(); assert.equal(env.timers.size, 1);
});

test('joining does not create a second polling loop; Enter and duplicate submission guard work', async () => {
  const env = environment(); const calls = [];
  env.context.lobbyRequest = async (url) => { calls.push(url); return url === '/api/join' ? { player: { id: 'new', token: 'private' } } : response; };
  vm.runInContext(inline('join.html'), env.context);
  assert.equal(env.timers.size, 1);
  const enter = env.document.getElementById('name').events.keydown;
  let prevented = false;
  enter({ key: 'Enter', isComposing: false, preventDefault() { prevented = true; } });
  vm.runInContext('joinGame()', env.context);
  await flush();
  assert(prevented); assert.deepEqual(calls, ['/api/join', '/api/me']); assert.equal(env.timers.size, 1);
  enter({ key: 'Enter', isComposing: true, preventDefault() { throw Error('must not submit'); } });
  assert.equal(calls.length, 2);
});

test('invalid session removes opening overlay; malformed local storage does not break joining', async () => {
  const env = environment(JSON.stringify({ id: 'old', token: 'old' }));
  env.context.lobbyRequest = async () => { const error = new Error('Player session not found.'); error.status = 401; throw error; };
  env.document.getElementById('opening').classList.add('show');
  vm.runInContext(inline('join.html'), env.context); await flush();
  assert(!env.document.getElementById('opening').classList.contains('show'));
  assert(!env.storage.has('brookwood-player-v3')); assert.equal(env.timers.size, 1);
  const corrupt = environment('{broken');
  vm.runInContext(inline('join.html'), corrupt.context);
  assert(!corrupt.document.getElementById('joinBox').classList.contains('hidden'));
});

test('client network, timeout, malformed response and server errors are handled without retry', async () => {
  for (const mode of ['network', 'timeout', 'invalid', 'server']) {
    const env = environment(); let calls = 0;
    env.context.fetch = async () => {
      calls++;
      if (mode === 'network') throw new TypeError('offline');
      if (mode === 'timeout') { const error = new Error('aborted'); error.name = 'AbortError'; throw error; }
      return { ok: mode === 'invalid', status: 503, json: async () => { if (mode === 'invalid') throw new Error('bad JSON'); return { error: 'Database unavailable' }; } };
    };
    vm.runInContext(fs.readFileSync('client.js', 'utf8'), env.context);
    await assert.rejects(vm.runInContext("lobbyRequest('/api/join',{name:'Player'})", env.context));
    assert.equal(calls, 1); assert.equal(env.timers.size, 0);
  }
});

test('TV QR contains only join URL, QR failure is isolated and reset clears opening', async () => {
  for (const available of [true, false]) {
    const env = environment(); let qr;
    if (available) {
      function QRCode(node, options) { qr = options; }
      QRCode.CorrectLevel = { M: 0 }; env.context.QRCode = QRCode;
    }
    env.context.lobbyRequest = async () => ({ phase: 'lobby', startedAt:null, serverNow:100000, players: [] });
    vm.runInContext(inline('tv.html'), env.context); await flush();
    if (available) assert.equal(qr.text, 'https://brookwood.example/join');
    else assert(env.document.getElementById('qr').hidden);
    vm.runInContext("render({serverNow:Date.now(),startedAt:null,phase:'opening',players:[]});render({serverNow:Date.now(),startedAt:null,phase:'lobby',players:[]})", env.context);
    assert(!env.document.getElementById('opening').classList.contains('show'));
  }
});

test('TV test-fill requires confirmation and sends the existing host code', async () => {
  const env = environment(); const actions = [];
  env.context.lobbyRequest = async (url, body) => {
    if (url === '/api/host') { actions.push(body); return { ok: true }; }
    return { phase: 'lobby', startedAt:null, serverNow:100000, players: [] };
  };
  vm.runInContext(inline('tv.html'), env.context); await flush();
  env.document.getElementById('code').value = 'host-test-code';
  env.context.confirm = () => false;
  await vm.runInContext("host('test-fill')", env.context); assert.equal(actions.length, 0);
  env.context.confirm = message => { assert(message.includes('10 ready test players')); return true; };
  await vm.runInContext("host('test-fill')", env.context);
  assert.equal(actions.length, 1); assert.equal(actions[0].action, 'test-fill');
  assert.equal(actions[0].code, 'host-test-code');
  assert(fs.readFileSync('tv.html', 'utf8').includes('TEST: FILL LOBBY'));
});

test('phone stays unchanged while TV renders the authoritative aggregate photo checkpoint',async()=>{
  for(const phase of ['photo','photo-complete']){
    const phone=environment(JSON.stringify({id:'id',token:'private'}));
    phone.context.lobbyRequest=async()=>({...response,phase,photo:{confirmed:true,confirmedCount:phase==='photo'?8:12,complete:phase==='photo-complete',confirmedAt:null}});
    vm.runInContext(inline('join.html'),phone.context);await flush();
    assert(phone.storage.has('brookwood-player-v3'));assert.equal(phone.document.getElementById('playerErr').textContent,'');assert.equal(phone.timers.size,1);
    const count=phase==='photo'?8:12;
    const tv=environment();tv.context.lobbyRequest=async()=>({phase,serverNow:Date.now(),startedAt:Date.now()-88000,players:[{id:'id',name:'Player',partnerId:null,ready:true}],photo:{confirmedCount:count,complete:phase==='photo-complete',confirmedAt:phase==='photo-complete'?Date.now():null}});
    vm.runInContext(inline('tv.html'),tv.context);await flush();
    assert.equal(tv.document.getElementById('photoCounter').textContent,count+' / 12 READY FOR THE PHOTO');assert.equal(tv.document.getElementById('msg').textContent,'');
    assert.equal(tv.document.getElementById('photoCheckpoint').hidden,false);
    assert(tv.document.getElementById('returnControl').hidden);
  }
});

test('elapsed past 88000 cannot invent a photo phase or counter; server phase controls checkpoint visibility',async()=>{
  const tv=environment();tv.context.lobbyRequest=async()=>({phase:'opening',serverNow:Date.now(),startedAt:Date.now()-90000,players:[]});
  vm.runInContext(inline('tv.html'),tv.context);await flush();assert(tv.document.getElementById('photoCheckpoint').hidden);
  vm.runInContext("render({phase:'photo',serverNow:Date.now(),startedAt:Date.now()-90000,players:[],photo:{confirmedCount:0}})",tv.context);
  assert.equal(tv.document.getElementById('photoCounter').textContent,'0 / 12 READY FOR THE PHOTO');
  vm.runInContext("render({phase:'lobby',serverNow:Date.now(),startedAt:null,players:[]})",tv.context);
  assert(tv.document.getElementById('photoCheckpoint').hidden);
});

function photoResponse(confirmed=false,count=7,phase='photo'){
  return {...response,phase,photo:{confirmed,confirmedCount:count,complete:phase==='photo-complete',confirmedAt:phase==='photo-complete'?12345:null}};
}
test('unconfirmed phone renders dedicated photo screen and authenticated button, hiding lobby',async()=>{
  const env=environment(JSON.stringify({id:'real',token:'private'}));env.context.lobbyRequest=async()=>photoResponse();
  vm.runInContext(inline('join.html'),env.context);await flush();
  assert(env.document.getElementById('playerBox').classList.contains('hidden'));
  assert(!env.document.getElementById('photoBox').classList.contains('hidden'));
  assert.equal(env.document.getElementById('photoConfirm').disabled,false);
  assert.equal(env.document.getElementById('photoProgress').textContent,'7 / 12 CONFIRMED');
});
test('phone confirms only its own stored session, suppresses duplicate clicks and reads authoritative result',async()=>{
  const env=environment(JSON.stringify({id:'real',token:'private'}));let confirmed=false,release;const calls=[];
  const pending=new Promise(r=>{release=r;});
  env.context.lobbyRequest=async(url,body)=>{
    if(url==='/api/player'){calls.push({url,body});await pending;confirmed=true;return {ok:true};}
    return photoResponse(confirmed,confirmed?8:7);
  };
  vm.runInContext(inline('join.html'),env.context);await flush();
  const first=vm.runInContext('confirmPhoto()',env.context);vm.runInContext('confirmPhoto()',env.context);
  assert.equal(calls.length,1);assert.equal(env.document.getElementById('photoConfirm').disabled,true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)),{id:'real',token:'private',action:'photo-confirm'});
  assert.equal(env.document.getElementById('photoStatus').textContent,'');
  release();await first;assert(env.document.getElementById('photoConfirm').classList.contains('hidden'));
  assert(env.document.getElementById('photoStatus').textContent.includes("YOU'RE IN"));
  vm.runInContext('confirmPhoto()',env.context);assert.equal(calls.length,1);
});
test('phone reconnect restores confirmed state and complete screen without resubmitting',async()=>{
  for(const phase of ['photo','photo-complete']){
    const env=environment(JSON.stringify({id:'real',token:'private'}));const requests=[];
    env.context.lobbyRequest=async(url)=>{requests.push(url);return photoResponse(true,phase==='photo'?8:12,phase);};
    vm.runInContext(inline('join.html'),env.context);await flush();
    assert(env.document.getElementById('photoConfirm').classList.contains('hidden'));
    assert.equal(env.document.getElementById('photoTitle').textContent,phase==='photo'?'ONE PHOTO BEFORE THE NIGHT BEGINS':'PHOTO COMPLETE');
    assert(requests.every(url=>url==='/api/me'));assert.equal(env.timers.size,1);
  }
});
test('phone failed confirmation stays unconfirmed, re-enables retry, and invalid token clears session',async()=>{
  const env=environment(JSON.stringify({id:'real',token:'private'}));let failure=Error('offline');
  env.context.lobbyRequest=async(url)=>{if(url==='/api/player')throw failure;return photoResponse();};
  vm.runInContext(inline('join.html'),env.context);await flush();await vm.runInContext('confirmPhoto()',env.context);
  assert.equal(env.document.getElementById('photoErr').textContent,'offline');assert.equal(env.document.getElementById('photoConfirm').disabled,false);
  failure=Object.assign(Error('invalid session'),{status:401});await vm.runInContext('confirmPhoto()',env.context);
  assert(!env.storage.has('brookwood-player-v3'));assert(env.document.getElementById('photoBox').classList.contains('hidden'));
});
test('TV progression is credential-free, threshold-gated, guarded in flight and retryable',async()=>{
  const env=environment();env.context.lobbyRequest=async()=>({phase:'lobby',startedAt:null,serverNow:100000,players:[]});
  vm.runInContext(inline('tv.html'),env.context);await flush();let release;const calls=[];
  env.context.lobbyRequest=(url,body)=>{calls.push({url,body});return new Promise(r=>{release=r;});};
  vm.runInContext("requestPhotoProgress(87999,{phase:'opening',startedAt:100000})",env.context);assert.equal(calls.length,0);
  const first=vm.runInContext("requestPhotoProgress(88000,{phase:'opening',startedAt:100000})",env.context);
  for(let i=0;i<30;i++)vm.runInContext("requestPhotoProgress(90000,{phase:'opening',startedAt:100000})",env.context);
  assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/progress');assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)),{});
  release({ok:true});await first;
  vm.runInContext("requestPhotoProgress(90000,{phase:'photo',startedAt:100000})",env.context);assert.equal(calls.length,1);
  const retry=vm.runInContext("requestPhotoProgress(90000,{phase:'opening',startedAt:100000})",env.context);assert.equal(calls.length,2);release({ok:true});await retry;
});
test('TV simulated confirmation still sends only the entered host code to authenticated host action',async()=>{
  const env=environment();env.context.lobbyRequest=async()=>({phase:'lobby',startedAt:null,serverNow:100000,players:[]});
  vm.runInContext(inline('tv.html'),env.context);await flush();const calls=[];
  env.context.lobbyRequest=async(url,body)=>{calls.push({url,body});return {ok:true};};
  env.document.getElementById('photoHostCode').value='typed-host';await vm.runInContext('confirmSimulated()',env.context);
  assert.equal(calls[0].url,'/api/host');assert.equal(calls[0].body.action,'test-confirm-simulated');assert.equal(calls[0].body.code,'typed-host');
  assert(!fs.readFileSync('tv.html','utf8').includes('HOST_KEY'));
});

test('phone vote UI includes every real DOM node required for live activation',()=>{
  const html=fs.readFileSync('join.html','utf8');
  for(const id of ['voteBox','voteTitle','voteCopy','voteTarget','voteSubmit','voteProgress','voteErr']) assert(html.includes('id='+String.fromCharCode(34)+id+String.fromCharCode(34)),id);
});

test('untouched phone keeps polling from Chapter 3 completion through Chapter 4 activation and final result',async()=>{
  let state={...privateResponse(15000,212600,213000),phase:'private-messages-complete'};
  const e=await privateEnvironment(state),completedMessage=state;let requests=0;
  e.context.lobbyRequest=async(url,body)=>{assert.equal(url,'/api/me');assert.equal(body.id,'real');requests++;return state;};
  const poll=async()=>{assert.equal(e.timers.size,1);[...e.timers.values()][0]();await flush();assert.equal(e.timers.size,1);};
  assert.equal(e.document.getElementById('privateTitle').textContent,'MESSAGE RECEIVED');
  for(const elapsed of [0,3000,108450,111450,114473]){
    state=doorResponse();state.serverNow=state.chapter4.startedAt+elapsed;
    await poll();assert.equal(e.document.getElementById('privateTitle').textContent,'MESSAGE RECEIVED');
    assert(e.document.getElementById('voteBox').classList.contains('hidden'));
  }
  // Identity and completed Chapter 3 fields do not change; only authoritative phase/activation does.
  state=doorResponse(true);await poll();assert.equal(e.document.getElementById('voteTitle').textContent,'CHOOSE WHO GOES');
  assert(!e.document.getElementById('voteBox').classList.contains('hidden'));
  // A superseded Chapter 3 render callback must not roll back the latest polled state.
  e.context.oldMessage=completedMessage;vm.runInContext('privateRuntime.onState(oldMessage,true)',e.context);
  assert(!e.document.getElementById('voteBox').classList.contains('hidden'));
  assert(vm.runInContext('me.chapter4.active',e.context));
  state=doorResponse(true,true);await poll();assert.equal(e.document.getElementById('voteTitle').textContent,'VOTE RECORDED');
  state=doorResponse(true,true,true);await poll();assert.equal(e.document.getElementById('voteTitle').textContent,'Other Player');
  assert(e.document.getElementById('voteCopy').textContent.includes('sealed package'));assert.equal(requests,8);
});
