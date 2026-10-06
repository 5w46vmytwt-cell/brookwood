import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { TVCinematicRuntime } from '../tv-cinematic.js';

const inline = file => [...fs.readFileSync(file, 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).join('\n');
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = { phase: 'lobby', player: { name: 'Player', partner: null, partnerId: null, inventory: [], ready: false }, others: [] };
function environment(stored = null) {
  const nodes = new Map(), timers = new Map(), storage = new Map(); let serial = 0, perf = 0;
  if (stored !== null) storage.set('brookwood-player-v3', stored);
  function element() {
    const classes = new Set();
    return { style: {}, textContent: '', innerHTML: '', value: '', options: [], children: [], events: {}, hidden: false,
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
