import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CAS_SCRIPT } from '../api/_state.js';
import join from '../api/join.js';
import player from '../api/player.js';
import host from '../api/host.js';
import me from '../api/me.js';
import stateHandler from '../api/state.js';

const handlers = { join, player, host, me, state: stateHandler };
let raw, readBarrier, heldCommit, heldRead, fault;
const KEY = 'brookwood:1031:v3:state';
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const state = () => JSON.parse(raw);

beforeEach(() => {
  raw = null; readBarrier = heldCommit = heldRead = fault = null;
  process.env.KV_REST_API_URL = 'https://redis.invalid';
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.HOST_KEY = 'test-host';
  // REST substitute: each command is atomic, but requests may overlap.
  // EVAL implements the production script's exact GET/compare/SET contract.
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://redis.invalid');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert(options.signal);
    if (fault === 'network') throw new TypeError('offline');
    if (fault === 'http') return { ok: false, status: 500 };
    if (fault === 'redis') return { ok: true, json: async () => ({ error: 'ERR secret diagnostic' }) };
    if (fault === 'invalid') return { ok: true, json: async () => ({}) };
    const args = JSON.parse(options.body);
    let result;
    if (args[0] === 'GET') {
      assert.equal(args[1], KEY);
      result = raw; // Snapshot before any barrier, including reset races.
      if (heldRead) {
        const held = heldRead; heldRead = null;
        held.entered.resolve(); await held.release.promise;
      }
      if (readBarrier) {
        const barrier = readBarrier;
        if (++barrier.count === barrier.total) {
          readBarrier = null; barrier.done.resolve();
        }
        await barrier.done.promise;
      }
    } else if (args[0] === 'SET') {
      assert.equal(args[1], KEY);
      raw = args[2]; result = 'OK';
    } else {
      assert.equal(args[0], 'EVAL');
      assert.equal(args[1], CAS_SCRIPT);
      assert.equal(args[2], 1);
      assert.equal(args[3], KEY);
      if (heldCommit) {
        const held = heldCommit; heldCommit = null;
        held.entered.resolve(); await held.release.promise;
      }
      if ((raw ?? '') === args[4] && fault !== 'conflict') {
        raw = args[5]; result = 1;
      } else result = 0;
    }
    return { ok: true, json: async () => ({ result }) };
  };
});

async function call(name, body = {}, method = 'POST') {
  let status = 200, data;
  await handlers[name]({ method, body }, {
    status(value) { status = value; return this; },
    setHeader() {}, json(value) { data = value; return this; }
  });
  return { status, data };
}
const reset = () => call('host', { action: 'reset', code: 'test-host' });
const start = () => call('host', { action: 'start', code: 'test-host' });
const returnLobby = () => call('host', { action: 'return-lobby', code: 'test-host' });
function overlapReads(total) { readBarrier = { total, count: 0, done: deferred() }; }
async function cast(concurrent = false) {
  if (concurrent) overlapReads(12);
  const jobs = Array.from({ length: 12 }, (_, i) => ({ name: `Player ${i}` }));
  const responses = concurrent ? await Promise.all(jobs.map(b => call('join', b))) : [];
  if (!concurrent) for (const body of jobs) responses.push(await call('join', body));
  assert(responses.every(r => r.status === 200));
  return responses.map(r => r.data.player);
}
async function pair(players, concurrent = false) {
  const jobs = players.filter((_, i) => i % 2 === 0).map((p, i) => ({ ...p, action: 'partner', partnerId: players[i * 2 + 1].id }));
  if (concurrent) {
    overlapReads(6);
    assert((await Promise.all(jobs.map(b => call('player', b)))).every(r => r.status === 200));
  } else for (const b of jobs) assert.equal((await call('player', b)).status, 200);
}
async function ready(players) {
  overlapReads(12);
  const responses = await Promise.all(players.map(p => call('player', { ...p, action: 'ready', ready: true })));
  assert(responses.every(r => r.status === 200));
  assert.equal(state().players.filter(p => p.ready).length, 12);
}

test('return-lobby authenticates and rejects unfinished or invalid opening without mutation', async () => {
  await reset();const before=raw;
  assert.equal((await call('host',{action:'return-lobby',code:'wrong'})).status,403);assert.equal(raw,before);
  assert.equal((await returnLobby()).status,409);assert.equal(raw,before);
  for(const startedAt of [Date.now(),null,-1]) {
    raw=JSON.stringify({...state(),phase:'opening',startedAt});const snapshot=raw;
    assert.equal((await returnLobby()).status,409);assert.equal(raw,snapshot);
  }
});

test('return-lobby preserves complete cast, simulated players, tokens and all state; same cast can replay', async () => {
  await reset();const a=(await call('join',{name:'Real A'})).data.player,b=(await call('join',{name:'Real B'})).data.player;
  await pair([a,b]);for(const p of [a,b])assert.equal((await call('player',{...p,action:'ready',ready:true})).status,200);
  assert.equal((await call('host',{action:'test-fill',code:'test-host'})).status,200);assert.equal((await start()).status,200);
  const seeded=state();seeded.startedAt=Date.now()-44001;seeded.customSession={preserved:true};
  seeded.players[0].inventory=['evidence'];seeded.players[0].customPlayer={note:'preserved'};
  raw=JSON.stringify(seeded);const before=state();
  assert.equal((await returnLobby()).status,200);const after=state();
  assert.equal(after.phase,'lobby');assert.equal(after.startedAt,null);assert.deepEqual(after.players,before.players);
  for(const key of Object.keys(before).filter(k=>!['phase','startedAt','updatedAt','revision'].includes(k)))assert.deepEqual(after[key],before[key]);
  assert.notEqual(after.revision,before.revision);assert.equal(after.generation,before.generation);
  for(const p of after.players)assert.equal((await call('me',{id:p.id,token:p.token})).status,200);
  assert.equal(after.players.filter(p=>p.simulated).length,10);
  assert.equal((await start()).status,200);const replay=state();
  assert.equal(replay.phase,'opening');assert(replay.startedAt>before.startedAt);assert.deepEqual(replay.players,before.players);
  for(const p of [a,b])assert.equal((await call('me',p)).status,200);
});

test('destructive reset fences an in-flight return-lobby and retains destructive semantics', async () => {
  await reset();const players=await cast();await pair(players);await ready(players);await start();
  raw=JSON.stringify({...state(),startedAt:Date.now()-45000});
  const gate={entered:deferred(),release:deferred()};heldCommit=gate;const old=returnLobby();
  await gate.entered.promise;await reset();const resetRaw=raw;gate.release.resolve();
  assert.equal((await old).status,409);assert.equal(raw,resetRaw);assert.equal(state().players.length,0);
  assert.equal((await call('me',players[0])).status,401);
});

test('12 overlapping joins persist all 12 unique players, including an initially missing key', async () => {
  const players = await cast(true);
  assert.equal(state().players.length, 12);
  assert.equal(new Set(state().players.map(p => p.id)).size, 12);
  assert.equal(new Set(players.map(p => p.token)).size, 12);
  const publicState = (await call('state', {}, 'GET')).data;
  assert(publicState.players.every(p => !('token' in p)));
  assert.equal((await call('join', { name: 'Overflow' })).status, 409);
});

test('overlapping pairing and 12 readiness updates persist six pairs and all readiness', async () => {
  await reset(); const players = await cast(true);
  await pair(players, true); await ready(players);
  assert.equal(new Set(state().players.map(p => [p.id, p.partnerId].sort().join(':'))).size, 6);
  assert.equal((await start()).status, 200);
  assert.equal(state().phase, 'opening');
});

for (const operation of ['join', 'ready', 'start']) {
  test(`reset fences an in-flight old ${operation} commit`, async () => {
    await reset();
    let players = [];
    if (operation !== 'join') { players = await cast(); await pair(players); }
    if (operation === 'start') await ready(players);
    const gate = { entered: deferred(), release: deferred() }; heldCommit = gate;
    const old = operation === 'join' ? call('join', { name: 'Stale join' }) : operation === 'start' ? start() : call('player', { ...players[0], action: 'ready', ready: true });
    await gate.entered.promise;
    assert.equal((await reset()).status, 200);
    const resetRaw = raw;
    gate.release.resolve();
    assert.equal((await old).status, 409);
    assert.equal(raw, resetRaw);
    assert.equal(state().players.length, 0);
    assert.equal(state().startedAt, null);
    for (const p of players) assert.equal((await call('me', p)).status, 401);
  });
}

test('delayed pre-reset read is fenced and cannot overwrite fresh post-reset joins', async () => {
  await reset();
  const gate = { entered: deferred(), release: deferred() }; heldRead = gate;
  const old = call('join', { name: 'Stale' });
  await gate.entered.promise; await reset();
  const fresh = await call('join', { name: 'Fresh' });
  gate.release.resolve(); assert.equal((await old).status, 409);
  assert.equal(state().players.length, 1);
  assert.equal(state().players[0].id, fresh.data.player.id);
});

test('reset invalidates every token; fresh concurrent 12-player lobby pairs, readies and starts', async () => {
  await reset(); const old = await cast(true); await pair(old); await ready(old); await start();
  const generation = state().generation;
  await reset(); assert.notEqual(state().generation, generation);
  for (const p of old) {
    assert.equal((await call('me', p)).status, 401);
    assert.equal((await call('player', { ...p, action: 'ready', ready: true })).status, 401);
  }
  const fresh = await cast(true);
  assert(fresh.every(p => !old.some(o => o.id === p.id || o.token === p.token)));
  await pair(fresh, true); await ready(fresh);
  assert.equal((await start()).status, 200);
  assert.equal(state().players.length, 12);
  assert.equal(state().phase, 'opening'); assert(state().startedAt);
});

test('concurrent duplicate names and last-slot joins enforce validation after retries', async () => {
  await reset(); overlapReads(2);
  const duplicates = await Promise.all([call('join', { name: 'Same' }), call('join', { name: 'SAME' })]);
  assert.deepEqual(duplicates.map(r => r.status).sort(), [200, 409]);
  for (let i = 0; i < 10; i++) await call('join', { name: `Other ${i}` });
  overlapReads(2);
  const lastSlot = await Promise.all([call('join', { name: 'Last A' }), call('join', { name: 'Last B' })]);
  assert.deepEqual(lastSlot.map(r => r.status).sort(), [200, 409]);
  assert.equal(state().players.length, 12);
});

test('mixed simultaneous join and readiness both survive', async () => {
  await reset();
  const a = (await call('join', { name: 'A' })).data.player;
  const b = (await call('join', { name: 'B' })).data.player;
  await call('player', { ...a, action: 'partner', partnerId: b.id });
  overlapReads(2);
  const results = await Promise.all([
    call('join', { name: 'C' }),
    call('player', { ...a, action: 'ready', ready: true })
  ]);
  assert(results.every(r => r.status === 200));
  assert.equal(state().players.length, 3);
  assert(state().players.find(p => p.id === a.id).ready);
});

test('authorization and readiness gates are preserved', async () => {
  await reset(); const players = await cast();
  assert.equal((await call('me', { id: players[0].id })).status, 401);
  assert.equal((await call('player', { ...players[0], token: 'wrong', action: 'ready', ready: true })).status, 401);
  assert.equal((await call('player', { ...players[0], action: 'ready', ready: true })).status, 400);
  assert.equal((await call('host', { action: 'start', code: 'wrong' })).status, 403);
  assert.equal((await start()).status, 409);
  await pair(players); assert.equal((await start()).status, 409);
  await ready(players); await start();
  assert.equal((await call('player', { ...players[0], action: 'ready', ready: false })).status, 409);
});

test('legacy v3 data remains usable and corrupt data is not silently overwritten', async () => {
  raw = JSON.stringify({ room: '1031', phase: 'lobby', players: [], startedAt: null });
  assert.equal((await call('join', { name: 'Legacy' })).status, 200);
  assert.equal(state().generation, 'legacy');
  raw = '{broken';
  assert.equal((await call('join', { name: 'No overwrite' })).status, 503);
  assert.equal(raw, '{broken');
});

test('Redis/network errors return safe 503 responses and retries are bounded', async () => {
  await reset(); const original = raw;
  for (const mode of ['network', 'http', 'redis', 'invalid']) {
    fault = mode;
    const result = await call('join', { name: 'Failure' });
    assert.equal(result.status, 503);
    assert(!result.data.error.includes('secret'));
    assert.equal(raw, original);
  }
  fault = 'conflict';
  assert.equal((await call('join', { name: 'Busy' })).status, 409);
  assert.equal(raw, original);
});

const testFill = () => call('host', { action: 'test-fill', code: 'test-host' });
async function twoRealPlayers() {
  await reset();
  return [(await call('join', { name: 'Real A' })).data.player, (await call('join', { name: 'Real B' })).data.player];
}
test('host test-fill creates ten ready simulated players and leaves real players unchanged', async () => {
  const real = await twoRealPlayers();
  const before = structuredClone(state().players);
  assert.equal((await call('host', { action: 'test-fill', code: 'wrong' })).status, 403);
  assert.equal((await testFill()).status, 200);
  assert.deepEqual(state().players.slice(0, 2), before);
  const simulated = state().players.filter(p => p.simulated);
  assert.equal(simulated.length, 10);
  assert.deepEqual(simulated.map(p => p.name), Array.from({ length: 5 }, (_, i) => [`Test ${i + 1}A`, `Test ${i + 1}B`]).flat());
  for (let i = 0; i < 10; i += 2) {
    assert.equal(simulated[i].partnerId, simulated[i + 1].id);
    assert.equal(simulated[i + 1].partnerId, simulated[i].id);
  }
  assert(simulated.every(p => p.ready && p.token));
  assert.equal(new Set(state().players.map(p => p.id)).size, 12);
  assert.equal((await start()).status, 409);
  await call('player', { ...real[0], action: 'partner', partnerId: real[1].id });
  for (const p of real) await call('player', { ...p, action: 'ready', ready: true });
  assert.equal((await start()).status, 200);
  assert.equal((await testFill()).status, 409);
  await reset(); assert.equal(state().players.length, 0);
});

test('test-fill rejects wrong counts, simulated occupants, and reserved name collisions', async () => {
  await reset(); assert.equal((await testFill()).status, 409);
  await call('join', { name: 'One' }); assert.equal((await testFill()).status, 409);
  await call('join', { name: 'Two' }); await call('join', { name: 'Three' });
  assert.equal((await testFill()).status, 409);
  await twoRealPlayers();
  const altered = state(); altered.players[0].simulated = true; raw = JSON.stringify(altered);
  assert.equal((await testFill()).status, 409);
  await reset(); await call('join', { name: 'test 1a' }); await call('join', { name: 'Real' });
  assert.equal((await testFill()).status, 409);
});

test('concurrent test-fill executes once and reset fences an old test-fill', async () => {
  await twoRealPlayers(); overlapReads(2);
  const result = await Promise.all([testFill(), testFill()]);
  assert.deepEqual(result.map(r => r.status).sort(), [200, 409]);
  assert.equal(state().players.length, 12);
  await twoRealPlayers();
  const gate = { entered: deferred(), release: deferred() }; heldCommit = gate;
  const old = testFill(); await gate.entered.promise; await reset(); gate.release.resolve();
  assert.equal((await old).status, 409); assert.equal(state().players.length, 0);
});
