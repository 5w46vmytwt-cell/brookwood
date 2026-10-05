import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const inline = file => [...fs.readFileSync(file, 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).join('\n');
const flush = () => new Promise(resolve => setImmediate(resolve));
const response = { phase: 'lobby', player: { name: 'Player', partner: null, partnerId: null, inventory: [], ready: false }, others: [] };
function environment(stored = null) {
  const nodes = new Map(), timers = new Map(), storage = new Map(); let serial = 0;
  if (stored !== null) storage.set('brookwood-player-v3', stored);
  function element() {
    const classes = new Set();
    return { style: {}, textContent: '', innerHTML: '', value: '', options: [], children: [], events: {}, hidden: false,
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, yes) { if (yes) classes.add(c); else classes.delete(c); } },
      focus() { this.focused=true; }, addEventListener(name, cb) { this.events[name] = cb; }, appendChild(node) { this.children.push(node); }, querySelector: element };
  }
  const document = { events: {}, addEventListener(name,cb) { this.events[name]=cb; }, getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }, createElement: element };
  const context = vm.createContext({ requestAnimationFrame: () => 1, cancelAnimationFrame() {}, document, location: { origin: 'https://brookwood.example' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    setTimeout(cb) { const id = ++serial; timers.set(id, cb); return id; }, clearTimeout(id) { timers.delete(id); },
    confirm: () => true, AbortController, TypeError });
  vm.runInContext(fs.readFileSync('cinematic-engine.js','utf8'), context);
  vm.runInContext(fs.readFileSync('chapter1.js','utf8'), context);
  vm.runInContext(fs.readFileSync('cinematic-audio.js','utf8'), context);
  return { context, document, timers, storage };
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
  env.context.lobbyRequest=async()=>({phase:'opening',startedAt:100000,players:[]});
  vm.runInContext(inline('tv.html'),env.context);
  env.document.getElementById('returnControl').hidden=true;
  vm.runInContext("render({phase:'opening',startedAt:100000,players:[]})",env.context);
  env.key=key=>env.document.events.keydown({key,preventDefault(){},target:{tagName:'BODY'}});
  env.setElapsed=ms=>{now=100000+ms;};
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
  vm.runInContext("render({phase:'opening',startedAt:null,players:[]})",env.context);
  for(let i=0;i<5;i++)env.key('r');assert(control.hidden);
  vm.runInContext("render({phase:'lobby',startedAt:100000,players:[]})",env.context);
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
  vm.runInContext("render({phase:'lobby',startedAt:null,players:[{id:'one',name:'Allan',partnerId:'two',ready:true},{id:'two',name:'Friend',partnerId:'one',ready:true}]})",env.context);
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
    env.context.lobbyRequest = async () => ({ phase: 'lobby', players: [] });
    vm.runInContext(inline('tv.html'), env.context); await flush();
    if (available) assert.equal(qr.text, 'https://brookwood.example/join');
    else assert(env.document.getElementById('qr').hidden);
    vm.runInContext("render({phase:'opening',players:[]});render({phase:'lobby',players:[]})", env.context);
    assert(!env.document.getElementById('opening').classList.contains('show'));
  }
});

test('TV test-fill requires confirmation and sends the existing host code', async () => {
  const env = environment(); const actions = [];
  env.context.lobbyRequest = async (url, body) => {
    if (url === '/api/host') { actions.push(body); return { ok: true }; }
    return { phase: 'lobby', players: [] };
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

test('existing phone and TV clients stay stable for photo and photo-complete without a new UI',async()=>{
  for(const phase of ['photo','photo-complete']){
    const phone=environment(JSON.stringify({id:'id',token:'private'}));
    phone.context.lobbyRequest=async()=>({...response,phase,photo:{confirmed:true,confirmedCount:phase==='photo'?8:12,complete:phase==='photo-complete',confirmedAt:null}});
    vm.runInContext(inline('join.html'),phone.context);await flush();
    assert(phone.storage.has('brookwood-player-v3'));assert.equal(phone.document.getElementById('playerErr').textContent,'');assert.equal(phone.timers.size,1);
    const tv=environment();tv.context.lobbyRequest=async()=>({phase,startedAt:Date.now()-50000,players:[{id:'id',name:'Player',partnerId:null,ready:true}],photo:{confirmedCount:8,complete:false,confirmedAt:null}});
    vm.runInContext(inline('tv.html'),tv.context);await flush();
    assert.equal(tv.document.getElementById('count').textContent,1);assert.equal(tv.document.getElementById('msg').textContent,'');
    assert(tv.document.getElementById('returnControl').hidden);
  }
});
