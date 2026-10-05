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
      addEventListener(name, cb) { this.events[name] = cb; }, appendChild(node) { this.children.push(node); }, querySelector: element };
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
