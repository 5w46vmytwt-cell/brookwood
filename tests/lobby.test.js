import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CAS_SCRIPT, publicState,makeDoorVoter } from '../api/_state.js';
import join from '../api/join.js';
import player from '../api/player.js';
import host from '../api/host.js';
import me from '../api/me.js';
import stateHandler from '../api/state.js';
import progress from '../api/progress.js';
import chapter3 from '../api/chapter3.js';
import {createAssignments,messageTemplates} from '../api/_chapter3-messages.js';
import {makeCastingVoter} from '../api/_chapter5.js';
import {castingRoles,castingVotingOffset,castingCompletionMs,castingRevealOffset,CHAPTER5_INTRO_MS,CHAPTER5_FINALE_MS} from '../chapter5-timing.js';
import {CHAPTER5_RULES_MS,chapter5Opening,recordingFor} from '../chapter5-audio-timing.js';

const handlers = { join, player, host, me, state: stateHandler, progress, chapter3 };
let raw, readBarrier, heldCommit, heldRead, fault, persisted;
const KEY = 'brookwood:1031:v3:state';
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const state = () => JSON.parse(raw);

beforeEach(() => {
  raw = null; readBarrier = heldCommit = heldRead = fault = null;
  persisted=[];
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
      raw = args[2]; persisted.push(JSON.parse(raw)); result = 'OK';
    } else {
      assert.equal(args[0], 'EVAL');
      assert.equal(args[1], CAS_SCRIPT);
      assert.equal(args[2], 1);
      assert.equal(args[3], KEY);
      if (heldCommit) {
        const held = heldCommit; heldCommit = null;
        held.candidate=JSON.parse(args[5]);
        held.entered.resolve(); await held.release.promise;
      }
      if ((raw ?? '') === args[4] && fault !== 'conflict') {
        if(args[5]!==args[4]){persisted.push(JSON.parse(args[5]));raw=args[5];}
        result = 1;
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

const beginPhoto=()=>call('host',{action:'begin-photo',code:'test-host'});
const testConfirm=()=>call('host',{action:'test-confirm-simulated',code:'test-host'});
const photoConfirm=(p,extra={})=>call('player',{...extra,id:p.id,token:p.token,action:'photo-confirm'});
async function checkpoint(simulated=false){
  let players;
  if(simulated){players=await twoRealPlayers();await pair(players);for(const p of players)await call('player',{...p,action:'ready',ready:true});await testFill();}
  else{await reset();players=await cast();await pair(players);await ready(players);}
  assert.equal((await start()).status,200);assert.equal((await beginPhoto()).status,200);
  return players;
}

test('begin-photo authenticates, only initializes from opening, and uses server time', async()=>{
  await reset();const original=raw;
  assert.equal((await call('host',{action:'begin-photo',code:'wrong'})).status,403);
  assert.equal((await beginPhoto()).status,409);assert.equal(raw,original);
  const players=await cast();await pair(players);await ready(players);await start();const before=state();
  const earliest=Date.now();assert.equal((await call('host',{action:'begin-photo',code:'test-host',promptedAt:1,photo:{confirmedPlayerIds:players.map(p=>p.id),confirmedAt:1},complete:true})).status,200);
  const after=state();assert.equal(after.phase,'photo');assert(after.photo.promptedAt>=earliest&&after.photo.promptedAt<=Date.now());
  assert.deepEqual(after.photo.confirmedPlayerIds,[]);assert.equal(after.photo.confirmedAt,null);
  assert.deepEqual(after.players,before.players);assert.equal(after.generation,before.generation);assert.equal(after.startedAt,before.startedAt);
});

test('begin-photo retries and concurrent requests preserve initial prompt and confirmations without writes', async()=>{
  const players=await checkpoint();await photoConfirm(players[0]);const original=raw,writeCount=persisted.length;
  overlapReads(2);assert((await Promise.all([beginPhoto(),beginPhoto()])).every(r=>r.status===200));
  assert.equal(raw,original);assert.equal(persisted.length,writeCount);
});

test('simultaneous first begin-photo calls initialize exactly once',async()=>{
  await reset();const players=await cast();await pair(players);await ready(players);await start();
  overlapReads(2);assert((await Promise.all([beginPhoto(),beginPhoto()])).every(r=>r.status===200));
  assert.equal(persisted.filter(s=>s.phase==='photo').length,1);assert.deepEqual(state().photo.confirmedPlayerIds,[]);
  const original=raw;await beginPhoto();assert.equal(raw,original);
});

test('photo-confirm authenticates current sessions and requires an active checkpoint', async()=>{
  await reset();const players=await cast();const original=raw;
  assert.equal((await photoConfirm({...players[0],token:'wrong'})).status,401);
  assert.equal((await photoConfirm({id:'foreign',token:players[0].token})).status,401);
  assert.equal((await photoConfirm(players[0])).status,409);assert.equal(raw,original);
  await pair(players);await ready(players);await start();assert.equal((await photoConfirm(players[0])).status,409);
  await beginPhoto();await reset();assert.equal((await photoConfirm(players[0])).status,401);
});

test('unique confirmations increment, ignore client identity/time/count, and duplicates are byte-for-byte no-ops', async()=>{
  const players=await checkpoint();const prompt=state().photo.promptedAt;
  assert.equal((await photoConfirm(players[0],{playerId:players[1].id,confirmedPlayerIds:players.map(p=>p.id),confirmedAt:1,confirmedCount:12,complete:true})).status,200);
  assert.deepEqual(state().photo.confirmedPlayerIds,[players[0].id]);assert.equal(state().phase,'photo');assert.equal(state().photo.confirmedAt,null);
  const original=raw,writeCount=persisted.length;assert.equal((await photoConfirm(players[0])).status,200);
  assert.equal(raw,original);assert.equal(persisted.length,writeCount);
  await photoConfirm(players[1]);assert.equal(state().photo.confirmedPlayerIds.length,2);assert.equal(state().photo.promptedAt,prompt);
});

test('public state and reconnect projections expose derived progress without private IDs or tokens', async()=>{
  const players=await checkpoint();for(const p of players.slice(0,8))await photoConfirm(p);
  const projection=(await call('state',{},'GET')).data;
  assert.deepEqual(projection.photo,{promptedAt:state().photo.promptedAt,confirmedCount:8,complete:false,confirmedAt:null});
  assert(!('confirmedPlayerIds' in projection.photo));assert(projection.players.every(p=>!('token' in p)));
  for(const [p,confirmed] of [[players[0],true],[players[8],false]]){
    for(let i=0;i<2;i++){
      const result=await call('me',p);assert.equal(result.status,200);
      assert.deepEqual(result.data.photo,{confirmed,confirmedCount:8,complete:false,confirmedAt:null});
      assert(!JSON.stringify(result.data).includes(p.token));assert(!JSON.stringify(result.data).includes('confirmedPlayerIds'));
    }
  }
});

test('test-confirm-simulated confirms exactly ten, then real confirmations atomically complete the cast', async()=>{
  const real=await checkpoint(true),before=structuredClone(state().players);
  assert.equal((await call('host',{action:'test-confirm-simulated',code:'wrong'})).status,403);
  assert.equal((await testConfirm()).status,200);assert.equal(state().photo.confirmedPlayerIds.length,10);
  assert(real.every(p=>!state().photo.confirmedPlayerIds.includes(p.id)));assert.deepEqual(state().players,before);
  const original=raw;assert.equal((await testConfirm()).status,200);assert.equal(raw,original);
  await photoConfirm(real[0]);assert.equal(state().photo.confirmedPlayerIds.length,11);assert.equal(state().phase,'photo');
  const earliest=Date.now();assert.equal((await photoConfirm(real[1],{confirmedAt:1})).status,200);
  assert.equal(state().phase,'photo-complete');assert.equal(new Set(state().photo.confirmedPlayerIds).size,12);
  assert(state().photo.confirmedAt>=earliest&&state().photo.confirmedAt<=Date.now());
  assert(persisted.filter(s=>s.photo?.confirmedPlayerIds.length===12).every(s=>s.phase==='photo-complete'&&s.photo.confirmedAt>0));
  for(const p of state().players){const response=await call('me',p);assert.equal(response.status,200);assert.deepEqual(response.data.photo,{confirmed:true,confirmedCount:12,complete:true,confirmedAt:state().photo.confirmedAt});}
});

test('completion timestamp is write-once; duplicate confirms and begin-photo after completion do not write', async()=>{
  const players=await checkpoint();for(const p of players)await photoConfirm(p);
  const original=raw,writeCount=persisted.length;
  for(const p of players)assert.equal((await photoConfirm(p,{confirmedAt:999})).status,200);
  assert.equal((await beginPhoto()).status,200);assert.equal(raw,original);assert.equal(persisted.length,writeCount);
  assert.equal((await testConfirm()).status,409);assert.equal(raw,original);
  const projection=(await call('state',{},'GET')).data.photo;assert.equal(projection.confirmedCount,12);assert.equal(projection.complete,true);
});

test('two simultaneous real confirmations from 10/12 survive CAS retries and commit complete atomically', async()=>{
  const real=await checkpoint(true);await testConfirm();overlapReads(2);
  const earliest=Date.now();const result=await Promise.all(real.map(p=>photoConfirm(p)));
  assert(result.every(r=>r.status===200));assert.equal(state().phase,'photo-complete');
  assert.equal(new Set(state().photo.confirmedPlayerIds).size,12);assert(state().players.every(p=>state().photo.confirmedPlayerIds.includes(p.id)));
  assert(state().photo.confirmedAt>=earliest);assert.equal(persisted.filter(s=>s.phase==='photo-complete').length,1);
  assert(persisted.filter(s=>s.photo?.confirmedPlayerIds.length===12).every(s=>s.phase==='photo-complete'));
});

test('concurrent duplicate final confirmations create one ID and one completion timestamp', async()=>{
  const players=await checkpoint();for(const p of players.slice(0,11))await photoConfirm(p);
  overlapReads(3);assert((await Promise.all(Array.from({length:3},()=>photoConfirm(players[11])))).every(r=>r.status===200));
  assert.equal(state().photo.confirmedPlayerIds.length,12);assert.equal(persisted.filter(s=>s.phase==='photo-complete').length,1);
  const original=raw;await photoConfirm(players[11]);assert.equal(raw,original);
});

test('all twelve simultaneous photo confirmations persist uniquely', async()=>{
  const players=await checkpoint();overlapReads(12);
  assert((await Promise.all(players.map(p=>photoConfirm(p)))).every(r=>r.status===200));
  assert.equal(state().phase,'photo-complete');assert.equal(new Set(state().photo.confirmedPlayerIds).size,12);
});

test('simulated confirmation rejects wrong phases and absent simulated cast without changing real players', async()=>{
  await reset();assert.equal((await testConfirm()).status,409);
  const players=await checkpoint(),original=raw;assert.equal((await testConfirm()).status,409);assert.equal(raw,original);
  assert(state().players.every(p=>!state().photo.confirmedPlayerIds.includes(p.id)));assert.equal(players.length,12);
});

for(const operation of ['confirm','begin-noop','confirm-noop','simulated'])test(`reset fences in-flight photo ${operation}`,async()=>{
  const players=await checkpoint(operation==='simulated');
  if(operation==='confirm-noop')await photoConfirm(players[0]);
  const gate={entered:deferred(),release:deferred()};heldCommit=gate;
  const old=operation==='begin-noop'?beginPhoto():operation==='simulated'?testConfirm():photoConfirm(players[0]);
  await gate.entered.promise;await reset();const original=raw;gate.release.resolve();
  assert.equal((await old).status,409);assert.equal(raw,original);assert.equal(state().players.length,0);
});

for(const complete of [false,true])test(`return-lobby preserves cast and replay clears ${complete?'completed':'partial'} photo data`,async()=>{
  const players=await checkpoint();for(const p of players.slice(0,complete?12:1))await photoConfirm(p);
  const current=state();current.startedAt=Date.now()-43000;raw=JSON.stringify(current);const early=raw;
  assert.equal((await returnLobby()).status,409);assert.equal(raw,early);
  current.startedAt=Date.now()-45000;raw=JSON.stringify(current);const before=state();
  assert.equal((await returnLobby()).status,200);assert.equal(state().phase,'lobby');assert.deepEqual(state().players,before.players);assert.deepEqual(state().photo,before.photo);
  assert.equal((await start()).status,200);assert.equal(state().phase,'opening');assert(!('photo' in state()));assert.deepEqual(state().players,before.players);
  assert.equal((await beginPhoto()).status,200);assert.deepEqual(state().photo.confirmedPlayerIds,[]);assert.equal(state().photo.confirmedAt,null);
  for(const p of players)assert.equal((await call('me',p)).status,200);
});

for(const operation of ['confirm','begin','simulated'])test(`an in-flight old photo ${operation} cannot mutate a replay checkpoint`,async()=>{
  const players=await checkpoint(operation==='simulated');
  const current=state();current.startedAt=Date.now()-45000;
  if(operation==='begin'){current.phase='opening';delete current.photo;}
  raw=JSON.stringify(current);
  const gate={entered:deferred(),release:deferred()};heldCommit=gate;
  const old=operation==='begin'?beginPhoto():operation==='simulated'?testConfirm():photoConfirm(players[0]);
  await gate.entered.promise;assert.equal((await returnLobby()).status,200);
  assert.equal((await start()).status,200);assert.equal((await beginPhoto()).status,200);const fresh=raw;
  gate.release.resolve();assert.equal((await old).status,409);assert.equal(raw,fresh);assert.deepEqual(state().photo.confirmedPlayerIds,[]);
});

test('corrupted photo checkpoints fail closed without repair or writes',async()=>{
  const players=await checkpoint();const valid=state();
  const variants=[
    {photo:null},{photo:{...valid.photo,promptedAt:0}},{photo:{...valid.photo,promptedAt:'123'}},
    {photo:{...valid.photo,confirmedPlayerIds:[players[0].id,players[0].id]}},
    {photo:{...valid.photo,confirmedPlayerIds:['foreign']}},
    {photo:{...valid.photo,confirmedPlayerIds:players.map(p=>p.id)}},
    {photo:{...valid.photo,confirmedAt:Date.now()}},{photo:{...valid.photo,confirmedPlayerIds:null}},
    {players:valid.players.slice(0,11)},
    {players:[valid.players[0],...valid.players.slice(0,11)]},
    {phase:'photo-complete',photo:{...valid.photo,confirmedAt:Date.now()}},
    {phase:'photo-complete',photo:{...valid.photo,confirmedPlayerIds:players.map(p=>p.id),confirmedAt:null}},
    {phase:'photo-complete',photo:{...valid.photo,confirmedPlayerIds:players.map(p=>p.id),confirmedAt:-1}},
    {phase:'photo-complete',photo:{...valid.photo,confirmedPlayerIds:[...players.slice(0,11).map(p=>p.id),'foreign'],confirmedAt:Date.now()}},
  ];
  for(const variant of variants){
    raw=JSON.stringify({...valid,...variant});const corrupt=raw;
    assert.equal((await call('state',{},'GET')).status,503);
    assert.equal((await photoConfirm(players[0])).status,503);
    assert.equal((await beginPhoto()).status,503);assert.equal(raw,corrupt);
  }
});

test('public serverNow is response-only UTC metadata; repeated reads preserve Redis and private projection',async()=>{
  await checkpoint(true);await testConfirm();const original=raw,before=state(),originalNow=Date.now;
  let utc=1893456000000;
  try{
    Date.now=()=>utc;
    const first=(await call('state',{},'GET')).data;utc+=123;const second=(await call('state',{},'GET')).data;
    assert.equal(first.serverNow,1893456000000);assert.equal(second.serverNow,1893456000123);
    assert.equal(typeof first.serverNow,'number');assert.equal(raw,original);
    assert.equal(state().revision,before.revision);assert.equal(state().updatedAt,before.updatedAt);assert(!('serverNow' in state()));
    const {serverNow,...projected}=first;assert.deepEqual(projected,publicState(before));
    assert(!('confirmedPlayerIds' in first.photo));assert(first.players.every(p=>!('token' in p)));
    for(const p of before.players)assert(!JSON.stringify(first).includes(p.token));
  }finally{Date.now=originalNow;}
});

async function progressionRun(simulated=false){
  const players=await checkpoint(simulated),s=state();s.phase='opening';s.startedAt=1000000;delete s.photo;
  raw=JSON.stringify(s);persisted=[];return players;
}
async function serverClock(now,job){const original=Date.now;try{Date.now=()=>now;return await job();}finally{Date.now=original;}}
test('public progression is POST-only and cannot create or change a lobby',async()=>{
  assert.equal((await call('progress',{},'GET')).status,405);
  const result=await call('progress',{phase:'photo',elapsed:999999,startedAt:1});
  assert.equal(result.status,200);assert.equal(result.data.eligible,false);assert.equal(raw,null);
});
test('progress ignores forged client timing and is byte-identical before 88000',async()=>{
  await progressionRun();const before=raw;
  await serverClock(1087999,async()=>{
    const r=await call('progress',{elapsed:999999,startedAt:1,serverNow:99999999999,phase:'photo',promptedAt:1});
    assert.equal(r.status,200);assert.equal(r.data.eligible,false);assert.equal(raw,before);assert.equal(persisted.length,0);
  });
});
test('progress at exactly 88000 initializes canonical photo once while preserving cast and startedAt',async()=>{
  await progressionRun(true);const before=state();
  await serverClock(1088000,async()=>{
    const r=await call('progress',{confirmedPlayerIds:before.players.map(p=>p.id),confirmedAt:1});
    assert.deepEqual(r.data,{ok:true,eligible:true,phase:'photo'});
    const s=state();assert.equal(s.startedAt,before.startedAt);assert.deepEqual(s.players,before.players);
    assert.deepEqual(s.photo,{promptedAt:1088000,confirmedPlayerIds:[],confirmedAt:null});
    const saved=raw;await call('progress');assert.equal(raw,saved);assert.equal(persisted.length,1);
  });
});
test('concurrent progression initializes exactly once with one persisted photo state',async()=>{
  await progressionRun();overlapReads(12);
  await serverClock(1088000,async()=>{
    const results=await Promise.all(Array.from({length:12},()=>call('progress')));
    assert(results.every(r=>r.status===200&&r.data.phase==='photo'));
    assert.equal(persisted.length,1);assert.equal(state().startedAt,1000000);
  });
});
test('progress is a no-op with partial or complete confirmations, preserving revision and timestamps',async()=>{
  const players=await checkpoint();await photoConfirm(players[0]);let original=raw;await call('progress');assert.equal(raw,original);
  for(const p of players.slice(1))await photoConfirm(p);original=raw;
  const r=await call('progress');assert.equal(r.data.phase,'photo-complete');assert.equal(raw,original);
});
test('invalid start or invalid cast cannot progress',async()=>{
  await progressionRun();const valid=state();
  for(const startedAt of [null,0,-1,'1']){raw=JSON.stringify({...valid,startedAt});const before=raw;assert.equal((await call('progress')).data.eligible,false);assert.equal(raw,before);}
  for(const mutate of [s=>s.players.pop(),s=>s.players[0].partnerId=s.players[0].id,s=>s.players[0].ready=false,s=>s.players[0].token='']){
    const s=structuredClone(valid);mutate(s);raw=JSON.stringify(s);const before=raw;
    await serverClock(1088000,async()=>{assert.equal((await call('progress')).status,409);assert.equal(raw,before);});
  }
});
test('reset fences an overlapping public progression request',async()=>{
  await progressionRun();const gate={entered:deferred(),release:deferred()};heldCommit=gate;
  await serverClock(1088000,async()=>{
    const old=call('progress');await gate.entered.promise;await reset();gate.release.resolve();
    assert.equal((await old).status,409);assert.equal(state().phase,'lobby');assert.equal(state().players.length,0);
  });
});
test('replay startedAt fences an old public progression request',async()=>{
  await progressionRun();const gate={entered:deferred(),release:deferred()};heldCommit=gate;
  await serverClock(1088000,async()=>{
    const old=call('progress');await gate.entered.promise;await returnLobby();await start();gate.release.resolve();
    assert.equal((await old).status,409);assert.equal(state().phase,'opening');assert.equal(state().startedAt,1088000);assert(!state().photo);
  });
});
test('automatic progress supports host-only simulated confirmation and concurrent authenticated real final confirmations',async()=>{
  const real=await progressionRun(true);
  await serverClock(1088000,async()=>{
    await call('progress');assert.equal((await call('host',{action:'test-confirm-simulated'})).status,403);
    await testConfirm();assert.equal(state().photo.confirmedPlayerIds.length,10);
    assert.equal((await photoConfirm({id:real[1].id,token:real[0].token})).status,401);
    overlapReads(2);assert((await Promise.all(real.map(p=>photoConfirm(p)))).every(r=>r.status===200));
    assert.equal(state().phase,'photo-complete');assert.equal(new Set(state().photo.confirmedPlayerIds).size,12);
    assert.equal(state().photo.confirmedAt,1088000);
    assert.equal(persisted.filter(s=>s.phase==='photo-complete').length,1);
    const original=raw;await photoConfirm(real[0]);await call('progress');assert.equal(raw,original);
  });
});

async function completedCast(simulated=false){
  const players=await checkpoint(simulated);if(simulated)await testConfirm();for(const p of players)await photoConfirm(p);
  const s=state();s.startedAt=1000000;s.photo.promptedAt=1088000;s.photo.confirmedAt=1088000;raw=JSON.stringify(s);persisted=[];return players;
}
async function chapter3Run(simulated=false){const players=await completedCast(simulated);await serverClock(2000000,()=>call('chapter3'));return players;}
const messageOpen=p=>call('player',{id:p.id,token:p.token,action:'message-open'});
const messageRead=p=>call('player',{id:p.id,token:p.token,action:'message-read'});
const testRead=()=>call('host',{action:'test-read-simulated',code:'test-host'});
const selectChapter=(checkpoint,extra={})=>call('host',{action:'chapter-select',checkpoint,code:'test-host',...extra});
async function chapter4Run(){const real=await testCast();await serverClock(4000000,()=>selectChapter('chapter4'));persisted=[];return real;}
const doorVote=(p,target,run=4000000)=>call('player',{id:p.id,token:p.token,action:'door-vote',targetId:target,chapter4StartedAt:run});
const simulatedVotes=()=>call('host',{action:'test-vote-simulated',code:'test-host',chapter4StartedAt:4000000});
test('Chapter 4 natural start waits for full 2000ms completion, ignores clocks, and races safely',async()=>{
  const players=await chapter3Run();await serverClock(2012600,async()=>{for(const p of players){await messageOpen(p);await messageRead(p);}});
  const complete=state(),before=raw;await serverClock(2014599,async()=>{assert.equal((await call('progress',{elapsed:999999999,startedAt:1})).status,200);assert.equal(raw,before);});
  overlapReads(8);await serverClock(2014600,async()=>{const results=await Promise.all(Array.from({length:8},()=>call('progress')));assert(results.every(r=>r.status===200));});
  assert.equal(state().phase,'chapter4-opening');assert.equal(state().chapter4.startedAt,2014600);assert.equal(state().generation,complete.generation);assert.deepEqual(state().chapter3,complete.chapter3);assert.deepEqual(state().players,complete.players);
  const after=raw;await serverClock(2014600,()=>call('progress'));assert.equal(raw,after);
});
test('Chapter 4 chapter-select creates coherent completed prerequisites and fresh unopened voting state',async()=>{
  await chapter4Run();const a=state();assert.equal(a.phase,'chapter4-opening');assert.equal(a.chapter4.startedAt,4000000);assert.deepEqual(a.chapter4.votes,{});assert.equal(a.chapter4.completedAt,null);assert.equal(a.chapter4.selectedPlayerId,null);assert.equal(publicState(a).chapter3.readCount,12);
  await serverClock(4000000,()=>selectChapter('chapter4'));assert.notEqual(state().generation,a.generation);assert.notEqual(state().chapter4.startedAt,a.chapter4.startedAt);assert.deepEqual(state().chapter4.votes,{});
});
test('door voting requires player token, valid other target and matching run, rejecting early or malformed votes',async()=>{
  const real=await chapter4Run();const before=raw;
  await serverClock(4114473,async()=>{assert.equal((await doorVote(real[0],real[1].id)).status,409);assert.equal((await simulatedVotes()).status,409);assert.equal(raw,before);});
  await serverClock(4114474,async()=>{
    assert.equal((await doorVote({...real[0],token:'wrong'},real[1].id)).status,401);
    for(const target of [real[0].id,'missing',null,{},12])assert.equal((await doorVote(real[0],target)).status,400);
    assert.equal((await doorVote(real[0],real[1].id,1)).status,409);
    assert.equal((await call('player',{...real[0],action:'door-vote',targetId:real[1].id})).status,409);
    assert.equal(raw,before);assert.equal(publicState(state()).chapter4.active,true);
  });
});
test('one vote per player is persisted; duplicates cannot change choices or revision',async()=>{
  const real=await chapter4Run();await serverClock(4114474,async()=>{
    assert.equal((await doorVote(real[0],real[1].id)).status,200);const before=raw;
    assert.equal((await doorVote(real[0],state().players[2].id)).status,200);assert.equal(raw,before);assert.equal(state().chapter4.votes[real[0].id],real[1].id);assert.equal(state().phase,'door-vote');
  });
});
test('simulated door helper remains host-only, confirms only ten, then real phones reach 11 and 12',async()=>{
  const real=await chapter4Run();await serverClock(4114474,async()=>{
    assert.equal((await call('host',{action:'test-vote-simulated',chapter4StartedAt:4000000})).status,403);
    assert.equal((await simulatedVotes()).status,200);assert.equal(Object.keys(state().chapter4.votes).length,10);assert(!Object.hasOwn(state().chapter4.votes,real[0].id));assert(!Object.hasOwn(state().chapter4.votes,real[1].id));
    const before=raw;await simulatedVotes();assert.equal(raw,before);
    await doorVote(real[0],real[1].id);assert.equal(publicState(state()).chapter4.voteCount,11);await doorVote(real[1],real[0].id);assert.equal(state().phase,'door-vote-complete');assert.equal(publicState(state()).chapter4.voteCount,12);assert.equal(state().chapter4.completedAt,4114474);
    const completed=raw;await doorVote(real[1],state().players[2].id);await simulatedVotes();assert.equal(raw,completed);
  });
});
test('concurrent final door votes and duplicates finalize a correct maximum exactly once',async()=>{
  const real=await chapter4Run();await serverClock(4114474,async()=>{
    await simulatedVotes();overlapReads(4);const responses=await Promise.all([doorVote(real[0],real[1].id),doorVote(real[1],real[0].id),doorVote(real[0],real[1].id),doorVote(real[1],real[0].id)]);assert(responses.every(r=>r.status===200));
    const s=state(),counts={};for(const id of Object.values(s.chapter4.votes))counts[id]=(counts[id]||0)+1;assert.equal(Object.keys(s.chapter4.votes).length,12);assert.equal(counts[s.chapter4.selectedPlayerId],Math.max(...Object.values(counts)));assert.equal(persisted.filter(s=>s.phase==='door-vote-complete').length,1);
  });
});
test('door tie-break is uniform over tied leaders and cached across mutation retries',async()=>{
  await chapter4Run();await serverClock(4114474,async()=>{
    const s=state(),ids=s.players.map(p=>p.id),entries=ids.map((id,i)=>[id,ids[(i+1)%12]]);let draws=0;
    const vote=makeDoorVoter(length=>{draws++;assert.equal(length,12);return 7;});
    const a=structuredClone(s),b=structuredClone(s);vote(a,entries);vote(b,entries);assert.equal(draws,1);assert.equal(a.chapter4.selectedPlayerId,[...ids].sort()[7]);assert.deepEqual(a.chapter4,b.chapter4);
    // Every injected fair random index can select its corresponding tied candidate.
    for(let index=0;index<12;index++){const c=structuredClone(s);makeDoorVoter(()=>index)(c,entries);assert.equal(c.chapter4.selectedPlayerId,[...ids].sort()[index]);}
  });
});
test('unique majority needs no tie resolution and corrupt or non-maximum completion is rejected',async()=>{
  await chapter4Run();await serverClock(4114474,async()=>{
    const s=state(),ids=s.players.map(p=>p.id),vote=makeDoorVoter(n=>{assert.equal(n,1);return 0;});vote(s,ids.map((id,i)=>[id,i===0?ids[1]:ids[0]]));raw=JSON.stringify(s);assert.equal((await call('state',{},'GET')).status,200);assert.equal(s.chapter4.selectedPlayerId,ids[0]);
    for(const mutate of [s=>s.chapter4.selectedPlayerId=ids[1],s=>s.chapter4.votes[ids[0]]=ids[0],s=>s.chapter4.completedAt=null,s=>delete s.chapter4.votes[ids[3]]]){const corrupt=structuredClone(s);mutate(corrupt);raw=JSON.stringify(corrupt);assert.equal((await call('state',{},'GET')).status,503);}
  });
});
test('public Chapter 4 projection reveals only aggregate counts and result; me restores own vote without private assignments',async()=>{
  const real=await chapter4Run();await serverClock(4114474,async()=>{
    await doorVote(real[0],real[1].id);const pub=(await call('state',{},'GET')).data;
    for(const secret of ['votes','templateId','assignments','openedAt','readAt','token'])assert(!Object.hasOwn(pub.chapter4,secret)&&!JSON.stringify(pub).includes('"'+secret+'"'));
    const mine=(await call('me',real[0])).data,other=(await call('me',real[1])).data;assert.equal(mine.chapter4.voted,true);assert.equal(other.chapter4.voted,false);assert(!mine.chapter3.assignment);assert.equal(mine.chapter3.readAt,state().chapter3.assignments[real[0].id].readAt);
  });
});
test('reset, return and chapter-select fence in-flight door votes and clear downstream Chapter 4',async()=>{
  for(const action of ['reset','return','select']){
    const real=await chapter4Run();await serverClock(4114474,async()=>{
      const gate={entered:deferred(),release:deferred()};heldCommit=gate;const old=doorVote(real[0],real[1].id);await gate.entered.promise;
      if(action==='reset')await reset();else if(action==='return')await returnLobby();else await selectChapter('photo');
      const after=raw;gate.release.resolve();assert.equal((await old).status,409);assert.equal(raw,after);assert(!state().chapter4);
    });await reset();
  }
});
test('fresh Chapter 4 run rejects delayed old votes even with same valid player token',async()=>{
  const real=await chapter4Run();await serverClock(4200000,async()=>{await selectChapter('chapter4');const before=raw;assert.equal((await doorVote(real[0],real[1].id)).status,409);assert.equal(raw,before);});
});
async function testCast(){const a=(await call('join',{name:'Real A'})).data.player,b=(await call('join',{name:'Real B'})).data.player;await pair([a,b]);for(const p of [a,b])await call('player',{...p,action:'ready',ready:true});await call('host',{action:'test-fill',code:'test-host'});return [a,b];}
test('Chapter Select is host-only, uses a fixed allowlist and rejects incomplete or invalid couples',async()=>{
  assert.equal((await selectChapter('photo',{code:'wrong'})).status,403);
  assert.equal((await selectChapter('unknown')).status,400);
  assert.equal((await selectChapter('photo')).status,409);
  await testCast();const valid=state();
  for(const mutate of [s=>s.players.pop(),s=>s.players[0].partnerId=s.players[0].id,s=>s.players[0].partnerId=s.players[2].id,s=>s.players[0].token='',s=>s.players[0].id=s.players[1].id]){
    const s=structuredClone(valid);mutate(s);raw=JSON.stringify(s);const before=raw;assert.equal((await selectChapter('photo')).status,409);assert.equal(raw,before);
  }
});
test('Chapter Select chapter1 uses normal Start validation and clears downstream data preserving cast',async()=>{
  await chapter3Run(true);const castBefore=state().players;await serverClock(3000000,async()=>{
    assert.equal((await selectChapter('chapter1')).status,200);assert.equal(state().phase,'opening');assert.equal(state().startedAt,3000000);assert(!state().photo);assert(!state().chapter3);assert.deepEqual(state().players,castBefore);
    const s=state();s.players[0].ready=false;raw=JSON.stringify(s);const before=raw;assert.equal((await selectChapter('chapter1')).status,409);assert.equal(raw,before);
  });
});
test('Chapter Select chapter2 is server-clock derived, ignores supplied timing and clears downstream state',async()=>{
  await chapter3Run(true);await serverClock(3000000,async()=>{
    assert.equal((await selectChapter('chapter2',{elapsed:1,startedAt:1,serverNow:1})).status,200);const s=state();assert.equal(s.phase,'opening');assert.equal(3000000-s.startedAt,44000);assert(!s.photo);assert(!s.chapter3);
  });
});
test('Chapter Select photo creates fresh 0/12 and existing simulated helper reaches 10/12',async()=>{
  await chapter3Run(true);const castBefore=state().players;await serverClock(3000000,async()=>{
    assert.equal((await selectChapter('photo')).status,200);const s=state();assert.equal(s.phase,'photo');assert.equal(3000000-s.startedAt,88000);assert.deepEqual(s.photo,{promptedAt:3000000,confirmedPlayerIds:[],confirmedAt:null});assert(!s.chapter3);assert.deepEqual(s.players,castBefore);
    await testConfirm();assert.equal(state().photo.confirmedPlayerIds.length,10);assert.equal(state().phase,'photo');
    assert.equal((await selectChapter('chapter2')).status,200);assert(!state().photo);assert(!state().chapter3);
  });
});
test('Chapter Select chapter3 creates completed photo, twelve fresh assignments, and normal activation/helper',async()=>{
  await testCast();await serverClock(3000000,async()=>{
    assert.equal((await selectChapter('chapter3')).status,200);const s=state();assert.equal(s.phase,'chapter3-opening');assert.equal(s.chapter3.startedAt,3000000);assert.equal(s.photo.confirmedPlayerIds.length,12);assert.equal(s.photo.confirmedAt,3000000);assert.equal(s.chapter3.privateMessagesActivatedAt,null);assert.equal(s.chapter3.completedAt,null);
    assert.equal(new Set(Object.values(s.chapter3.assignments).map(a=>a.templateId)).size,12);assert(Object.values(s.chapter3.assignments).every(a=>a.openedAt===null&&a.readAt===null));assert(!JSON.stringify(publicState(s)).includes('templateId'));
  });
  await serverClock(3012599,async()=>{await call('progress');assert.equal(state().phase,'chapter3-opening');});
  await serverClock(3012600,async()=>{await call('progress');assert.equal(state().phase,'private-messages');assert.equal((await testRead()).status,200);assert.equal(publicState(state()).chapter3.readCount,10);});
});
test('Chapter Select repeated chapter3 intentionally creates a new run and reset assignments',async()=>{
  await testCast();await serverClock(3000000,async()=>{
    await selectChapter('chapter3');const a=state();await selectChapter('chapter3');const b=state();assert.notEqual(b.chapter3.startedAt,a.chapter3.startedAt);assert.notEqual(b.startedAt,a.startedAt);assert.notEqual(b.generation,a.generation);assert.notDeepEqual(b.chapter3.assignments,a.chapter3.assignments);assert(Object.values(b.chapter3.assignments).every(x=>x.readAt===null&&x.openedAt===null));
  });
});
test('Chapter Select CAS retry preserves prepared randomized assignments',async()=>{
  await testCast();const gate={entered:deferred(),release:deferred()};heldCommit=gate;
  await serverClock(3000000,async()=>{
    const pending=selectChapter('chapter3');await gate.entered.promise;const prepared=gate.candidate.chapter3;
    const s=state();s.revision='conflict';raw=JSON.stringify(s);gate.release.resolve();assert.equal((await pending).status,200);assert.deepEqual(state().chapter3,prepared);
  });
});
test('Chapter Select generation fences old OPEN/READ and reset fences pending chapter selection',async()=>{
  const players=await chapter3Run(true);await serverClock(2012600,async()=>{
    await call('progress');const gate={entered:deferred(),release:deferred()};heldCommit=gate;const old=messageOpen(players[0]);await gate.entered.promise;await selectChapter('photo');const selected=raw;gate.release.resolve();assert.equal((await old).status,409);assert.equal(raw,selected);
    const nextGate={entered:deferred(),release:deferred()};heldCommit=nextGate;const pending=selectChapter('chapter3');await nextGate.entered.promise;await reset();nextGate.release.resolve();assert.equal((await pending).status,409);assert.equal(state().players.length,0);
  });
});
test('Chapter 3 template pool is exact, unique, and placeholders never target the recipient',()=>{
  assert.equal(messageTemplates.length,20);assert.equal(new Set(messageTemplates.map(t=>t.id)).size,20);
  assert(messageTemplates.some(t=>t.id==='your-partner'));assert(!messageTemplates.some(t=>t.id==='your-partartner'));
  const players=Array.from({length:12},(_,i)=>({id:`id-${i}`,name:`[PLAYER_${i}]`,partnerId:`id-${i^1}`}));
  let seed=0x19961031;const choose=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let i=0;i<500;i++){
    const assignments=createAssignments(players,choose);assert.equal(Object.keys(assignments).length,12);assert.equal(new Set(Object.values(assignments).map(a=>a.templateId)).size,12);
    for(const p of players){const a=assignments[p.id],t=messageTemplates.find(t=>t.id===a.templateId);
      assert.equal(a.title,'KEEP THIS TO YOURSELF');assert(!a.body.includes(p.name));
      if(t.body.includes('{partner}'))assert(a.body.includes(players.find(q=>q.id===p.partnerId).name));
      if(t.body.includes('{name}'))assert(players.some(q=>q.id!==p.id&&a.body.includes(q.name)));
      assert(!/\{name\}|\{partner\}/.test(a.body));assert.equal(a.openedAt,null);assert.equal(a.readAt,null);
    }
  }
});
test('Chapter 3 start requires photo-complete and a valid reciprocal cast; request values ignored',async()=>{
  assert.equal((await call('chapter3',{},'GET')).status,405);assert.equal((await call('chapter3')).status,409);
  await completedCast();const valid=state();raw=JSON.stringify({...valid,players:valid.players.map((p,i)=>i===0?{...p,partnerId:null}:p)});
  const corrupt=raw;assert.equal((await call('chapter3')).status,409);assert.equal(raw,corrupt);raw=JSON.stringify(valid);
  await serverClock(2000000,async()=>{
    assert.equal((await call('chapter3',{startedAt:1,assignments:{},phase:'lobby'})).status,200);
    assert.equal(state().phase,'chapter3-opening');assert.equal(state().chapter3.startedAt,2000000);assert.equal(state().startedAt,1000000);
  });
});
test('concurrent automatic starts assign once; repeats never reroll or write',async()=>{
  await completedCast();overlapReads(12);
  await serverClock(2000000,async()=>{
    assert((await Promise.all(Array.from({length:12},()=>call('chapter3')))).every(r=>r.status===200));assert.equal(persisted.length,1);
    assert.equal(new Set(Object.values(state().chapter3.assignments).map(a=>a.templateId)).size,12);
    const before=raw;await call('chapter3');assert.equal(raw,before);
  });
});
test('CAS retry reuses the prepared rendered assignments',async()=>{
  await completedCast();const gate={entered:deferred(),release:deferred()};heldCommit=gate;
  await serverClock(2000000,async()=>{
    const start=call('chapter3');await gate.entered.promise;const candidate=gate.candidate.chapter3;
    const s=state();s.revision='intervening';raw=JSON.stringify(s);gate.release.resolve();assert.equal((await start).status,200);
    assert.deepEqual(state().chapter3,candidate);
  });
});
test('public Chapter 3 state never exposes private assignments, IDs, text, targets, or per-player timestamps',async()=>{
  const players=await chapter3Run();await serverClock(2012600,()=>messageOpen(players[0]));
  const result=(await call('state',{},'GET')).data,serialized=JSON.stringify(result);
  assert.deepEqual(Object.keys(result.chapter3).sort(),['startedAt','privateMessagesActivatedAt','completedAt','readCount'].sort());
  for(const key of ['assignments','templateId','title','body','openedAt','readAt'])assert(!serialized.includes(`"${key}"`));
  for(const a of Object.values(state().chapter3.assignments)){assert(!serialized.includes(a.templateId));assert(!serialized.includes(a.body));}
  assert(!result.players.some(p=>'token' in p));
});
test('before activation phones receive no body; authenticated me exposes only own opened/unread assignment',async()=>{
  const players=await chapter3Run();const unopened=(await call('me',players[0])).data;assert(!unopened.chapter3.assignment);
  await serverClock(2012600,()=>messageOpen(players[0]));
  const own=(await call('me',players[0])).data;assert.deepEqual(own.chapter3.assignment,{title:state().chapter3.assignments[players[0].id].title,body:state().chapter3.assignments[players[0].id].body});
  assert(!own.chapter3.assignments);assert(!(await call('me',players[1])).data.chapter3.assignment);
  assert.equal((await call('me',{id:players[0].id,token:players[1].token})).status,401);
});
test('private activation is server gated at exactly 12600 and idempotent',async()=>{
  const players=await chapter3Run(),before=raw;
  await serverClock(2012599,async()=>{await call('progress',{elapsed:999999});assert.equal(raw,before);assert.equal((await messageOpen(players[0])).status,409);});
  await serverClock(2012600,async()=>{await call('progress');assert.equal(state().phase,'private-messages');assert.equal(state().chapter3.privateMessagesActivatedAt,2012600);const activated=raw;await call('progress');assert.equal(raw,activated);});
});
test('OPEN is authenticated, recipient-only, atomic and write-once',async()=>{
  const players=await chapter3Run();
  await serverClock(2012600,async()=>{
    assert.equal((await messageOpen({...players[1],token:players[0].token})).status,401);
    assert.equal((await call('player',{...players[0],action:'message-open',playerId:players[1].id,openedAt:1})).status,200);
    assert.equal(state().chapter3.assignments[players[0].id].openedAt,2012600);assert.equal(state().chapter3.assignments[players[1].id].openedAt,null);
    const before=raw;await messageOpen(players[0]);assert.equal(raw,before);
  });
});
test('READ requires opening, counts once, clears own body projection and preserves timestamp on retry',async()=>{
  const players=await chapter3Run();
  await serverClock(2012600,async()=>{
    assert.equal((await messageRead(players[0])).status,409);await messageOpen(players[0]);await messageRead(players[0]);
    assert.equal(state().chapter3.assignments[players[0].id].readAt,2012600);const saved=raw;
    await messageRead(players[0]);assert.equal(raw,saved);const result=(await call('me',players[0])).data;assert.equal(result.chapter3.readCount,1);assert(!result.chapter3.assignment);
  });
});
test('twelve concurrent reads and duplicate final reads complete atomically once, without stored readCount',async()=>{
  const players=await chapter3Run();
  await serverClock(2012600,async()=>{for(const p of players)await messageOpen(p);overlapReads(12);assert((await Promise.all(players.map(messageRead))).every(r=>r.status===200));
    assert.equal(state().phase,'private-messages-complete');assert.equal(state().chapter3.completedAt,2012600);assert(!('readCount' in state().chapter3));
    assert.equal(persisted.filter(s=>s.phase==='private-messages-complete').length,1);
    const before=raw;overlapReads(3);assert((await Promise.all(Array.from({length:3},()=>messageRead(players[11])))).every(r=>r.status===200));assert.equal(raw,before);
  });
});
test('host simulated reads yield 10/12, then concurrent real reads complete exactly once',async()=>{
  const real=await chapter3Run(true);assert.equal((await testRead()).status,409);
  await serverClock(2012600,async()=>{
    await call('progress');assert.equal((await call('host',{action:'test-read-simulated',code:'wrong'})).status,403);await testRead();
    assert.equal(Object.values(state().chapter3.assignments).filter(a=>a.readAt!==null).length,10);
    for(const p of real)assert.equal(state().chapter3.assignments[p.id].readAt,null);
    const before=raw;await testRead();assert.equal(raw,before);for(const p of real)await messageOpen(p);
    overlapReads(2);assert((await Promise.all(real.map(messageRead))).every(r=>r.status===200));assert.equal(state().phase,'private-messages-complete');assert.equal(state().chapter3.completedAt,2012600);
  });
});
test('return-to-lobby preserves cast, clears Chapter 3, and a future start prepares fresh assignments',async()=>{
  await chapter3Run();const cast=structuredClone(state().players);
  await serverClock(2100000,async()=>{assert.equal((await returnLobby()).status,200);assert(!state().chapter3);assert.deepEqual(state().players,cast);await start();assert(!state().chapter3);});
});
for(const operation of ['open','read','start'])test(`reset fences in-flight Chapter 3 ${operation} and clears all private state`,async()=>{
  const players=operation==='start'?await completedCast():await chapter3Run();
  await serverClock(2012600,async()=>{
    if(operation==='read')await messageOpen(players[0]);const gate={entered:deferred(),release:deferred()};heldCommit=gate;
    const pending=operation==='start'?call('chapter3'):operation==='open'?messageOpen(players[0]):messageRead(players[0]);await gate.entered.promise;await reset();gate.release.resolve();
    assert.equal((await pending).status,409);assert(!state().chapter3);assert.equal(state().players.length,0);
  });
});
test('corrupt private state is rejected without repair or public leakage',async()=>{
  const players=await chapter3Run(),valid=state();
  for(const mutate of [s=>delete s.chapter3.assignments[players[0].id],s=>s.chapter3.assignments[players[0].id].readAt=1,s=>s.chapter3.completedAt=1,s=>s.chapter3.assignments[players[0].id].templateId='unknown']){
    const s=structuredClone(valid);mutate(s);raw=JSON.stringify(s);const before=raw;const r=await call('state',{},'GET');assert.equal(r.status,503);assert.equal(raw,before);assert(!r.data.chapter3);
  }
});

async function packageTestRun(checkpoint='package'){
  const real=await testCast();const selected=await serverClock(5000000,()=>selectChapter(checkpoint));assert.equal(selected.status,200);persisted=[];return real;
}
const packageOpen=p=>call('player',{id:p.id,token:p.token,action:'package-open',chapter4StartedAt:state().chapter4.startedAt});
async function castingRun(){
  const real=await packageTestRun('chapter5');
  await serverClock(state().chapter5.startedAt+CHAPTER5_INTRO_MS,async()=>{
    assert.equal((await call('progress')).status,200);assert.equal((await castingReady()).status,200);
  });
  await serverClock(state().chapter5.rulesStartedAt+CHAPTER5_RULES_MS,async()=>{assert.equal((await call('progress')).status,200);});return real;
}
const castingReady=(body={})=>call('host',{code:'test-host',action:'casting-ready',chapter5StartedAt:state().chapter5.startedAt,...body});
const castVote=(p,target,roleId=state().chapter5.rounds[state().chapter5.roundIndex].id,run=state().chapter5.startedAt)=>call('player',{id:p.id,token:p.token,action:'casting-vote',targetId:target,roleId,chapter5StartedAt:run});
const castSimulated=()=>call('host',{code:'test-host',action:'test-cast-simulated',chapter5StartedAt:state().chapter5.startedAt,roleId:state().chapter5.rounds[state().chapter5.roundIndex].id});
function votingTime(){const c=state().chapter5,r=c.rounds[c.roundIndex];return r.startedAt+castingVotingOffset(r.id);}
async function finishCastingRound(real){
  await serverClock(votingTime(),async()=>{assert.equal((await castSimulated()).status,200);assert.equal((await castVote(real[0],real[1].id)).status,200);assert.equal((await castVote(real[1],real[0].id)).status,200);});
  return state().chapter5.rounds[state().chapter5.roundIndex];
}

test('package retrieval checkpoint constructs valid prerequisites and only the selected session can open it',async()=>{
  const real=await packageTestRun(),before=raw;
  assert.equal(state().phase,'door-vote-complete');assert.equal(state().chapter4.selectedPlayerId,real[0].id);
  assert.equal((await packageOpen({...real[0],token:'wrong'})).status,401);assert.equal((await packageOpen(real[1])).status,403);assert.equal(raw,before);
  const selected=(await call('me',real[0])).data,other=(await call('me',real[1])).data;
  assert.equal(selected.chapter4.canOpenPackage,true);assert.equal(other.chapter4.canOpenPackage,false);
  assert.equal((await call('player',{...real[0],action:'package-open',chapter4StartedAt:1})).status,409);assert.equal(raw,before);
  await serverClock(5000100,async()=>{assert.equal((await packageOpen(real[0])).status,200);});
  assert.equal(state().phase,'chapter5-intro');assert.equal(state().packageOpenedAt,5000100);assert.equal(state().macheteHolderPlayerId,real[0].id);assert.equal(state().chapter5.startedAt,5000100);
  assert.equal(state().chapter5.rounds.length,6);assert(state().chapter5.rounds.every(r=>r.startedAt===null&&!Object.keys(r.votes).length));
  const after=raw;await serverClock(5000200,async()=>{assert.equal((await packageOpen(real[0])).status,200);});assert.equal(raw,after);
});

test('package opening concurrent duplicate requests start Chapter 5 exactly once with no replay or inventory mutation',async()=>{
  const real=await packageTestRun(),players=structuredClone(state().players);overlapReads(8);
  await serverClock(5000100,async()=>{const results=await Promise.all(Array.from({length:8},()=>packageOpen(real[0])));assert(results.every(r=>r.status===200));});
  assert.equal(persisted.length,1);assert.equal(state().chapter5.startedAt,5000100);assert.deepEqual(state().players,players);
});

test('Chapter 5 intro is server-time gated and ignores client clocks/phase parameters',async()=>{
  await packageTestRun('chapter5');const before=raw,start=state().chapter5.startedAt;
  await serverClock(start+CHAPTER5_INTRO_MS-1,async()=>{assert.equal((await call('progress',{elapsed:999999,phase:'chapter5-casting',startedAt:1})).status,200);});assert.equal(raw,before);
  await serverClock(start+CHAPTER5_INTRO_MS,async()=>{overlapReads(4);const result=await Promise.all(Array.from({length:4},()=>call('progress')));assert(result.every(r=>r.status===200));});
  assert.equal(state().phase,'chapter5-waiting');assert.equal(state().chapter5.readyAt,start+CHAPTER5_INTRO_MS);assert.equal(state().chapter5.rounds[0].startedAt,null);assert.equal(persisted.length,1);
});

test('casting validates tokens, self-votes, current targets, current run/round and server voting activation',async()=>{
  const real=await castingRun(),before=raw;
  await serverClock(votingTime()-1,async()=>{assert.equal((await castVote(real[0],real[1].id)).status,409);assert.equal((await castSimulated()).status,409);});assert.equal(raw,before);
  await serverClock(votingTime(),async()=>{
    assert.equal((await castVote({...real[0],token:'wrong'},real[1].id)).status,401);
    assert.equal((await castVote(real[0],real[0].id)).status,400);
    for(const target of [null,{},'foreign'])assert.equal((await castVote(real[0],target)).status,400);
    assert.equal((await castVote(real[0],real[1].id,'killer')).status,409);
    assert.equal((await castVote(real[0],real[1].id,'screamer',1)).status,409);
    assert.equal((await call('host',{code:'wrong',action:'test-cast-simulated'})).status,403);
  });assert.equal(raw,before);
});

test('casting ballots are immutable and duplicate requests are atomic no-ops',async()=>{
  const real=await castingRun();await serverClock(votingTime(),async()=>{
    assert.equal((await castVote(real[0],real[1].id)).status,200);const before=raw;
    assert.equal((await castVote(real[0],state().players[2].id)).status,200);assert.equal(raw,before);
    assert.equal(state().chapter5.rounds[0].votes[real[0].id],real[1].id);
    const mine=(await call('me',real[0])).data,other=(await call('me',real[1])).data;
    assert.equal(mine.chapter5.round.voted,true);assert.equal(other.chapter5.round.voted,false);
    assert.equal(mine.chapter5.round.voteCount,1);assert(!('votes' in mine.chapter5.round));
  });
});

test('twelve simultaneous casting votes persist all ballots and atomically finalize exactly one valid winner',async()=>{
  await castingRun();const players=state().players;overlapReads(12);
  await serverClock(votingTime(),async()=>{const out=await Promise.all(players.map((p,i)=>castVote(p,players[(i+1)%12].id)));assert(out.every(r=>r.status===200));});
  const r=state().chapter5.rounds[0];assert.equal(Object.keys(r.votes).length,12);assert(r.completedAt);assert(players.some(p=>p.id===r.winnerPlayerId));
  assert(persisted.every(s=>Object.keys(s.chapter5.rounds[0].votes).length!==12||(s.chapter5.rounds[0].completedAt!==null&&s.chapter5.rounds[0].winnerPlayerId!==null)));
});

test('simulated helper confirms exactly ten votes, concurrent real finals and retries finish 12/12 once',async()=>{
  const real=await castingRun();await serverClock(votingTime(),async()=>{
    assert.equal((await castSimulated()).status,200);const before=raw;assert.equal((await castSimulated()).status,200);assert.equal(raw,before);
    assert.equal(Object.keys(state().chapter5.rounds[0].votes).length,10);assert(real.every(p=>!Object.hasOwn(state().chapter5.rounds[0].votes,p.id)));
    overlapReads(4);const out=await Promise.all([castVote(real[0],real[1].id),castVote(real[1],real[0].id),castVote(real[0],real[1].id),castVote(real[1],real[0].id)]);assert(out.every(r=>r.status===200));
    const completed=raw;assert.equal((await castVote(real[0],real[1].id)).status,200);assert.equal(raw,completed);
  });assert.equal(Object.keys(state().chapter5.rounds[0].votes).length,12);assert(state().chapter5.rounds[0].completedAt);
});

test('casting fair tie selection is among highest candidates and cached across CAS-style retries',async()=>{
  await castingRun();const original=state(),players=original.players;
  const r=original.chapter5.rounds[0];for(let i=0;i<11;i++)r.votes[players[i].id]=players[(i+1)%12].id;
  let choices=0;const vote=makeCastingVoter(n=>{assert.equal(n,12);choices++;return n-1;});
  await serverClock(votingTime(),async()=>{const a=structuredClone(original),b=structuredClone(original);vote(a,[[players[11].id,players[0].id]],a.chapter5.startedAt,'screamer');vote(b,[[players[11].id,players[0].id]],b.chapter5.startedAt,'screamer');assert.equal(a.chapter5.rounds[0].winnerPlayerId,b.chapter5.rounds[0].winnerPlayerId);assert.equal(a.chapter5.rounds[0].winnerPlayerId,players.map(p=>p.id).sort().at(-1));});assert.equal(choices,1);
});

test('unrevealed winners and all individual casting ballots remain private on state and me',async()=>{
  const real=await castingRun(),round=await finishCastingRound(real);
  for(const offset of [0,999,1000,2199])await serverClock(round.completedAt+offset,async()=>{
    const pub=(await call('state',{},'GET')).data,mine=(await call('me',real[0])).data;
    for(const projection of [pub,mine]){assert.equal(projection.chapter5.round.winner,null);assert.equal(projection.chapter5.winners.length,0);assert(!JSON.stringify(projection).includes('winnerPlayerId'));assert(!JSON.stringify(projection).includes('"votes"'));}
  });
  await serverClock(round.completedAt+2200,async()=>{const p=(await call('state',{},'GET')).data;assert.equal(p.chapter5.round.winner.id,round.winnerPlayerId);assert.equal(p.chapter5.winners.length,1);});
});

test('all six ordered casting rounds advance at exact server gates, preserve package, then finish on black',async()=>{
  const real=await castingRun(),packageTime=state().packageOpenedAt,holder=state().macheteHolderPlayerId;
  for(const [index,role] of castingRoles.entries()){
    assert.equal(state().chapter5.roundIndex,index);assert.equal(state().chapter5.rounds[index].id,role.id);
    const round=await finishCastingRound(real),before=raw;
    await serverClock(round.completedAt+castingCompletionMs(role.id)-1,()=>call('progress'));assert.equal(raw,before);
    await serverClock(round.completedAt+castingCompletionMs(role.id),()=>call('progress'));
    assert.equal(state().packageOpenedAt,packageTime);assert.equal(state().macheteHolderPlayerId,holder);
    if(index<5){assert.equal(state().chapter5.roundIndex,index+1);assert.equal(Object.keys(state().chapter5.rounds[index+1].votes).length,0);
      await serverClock(votingTime(),async()=>{assert.equal((await castVote(real[0],real[1].id,role.id)).status,409);});}
  }
  assert.equal(state().phase,'chapter5-finale');const c=state().chapter5,before=raw;
  await serverClock(c.castStartedAt+CHAPTER5_FINALE_MS-1,()=>call('progress'));assert.equal(raw,before);
  await serverClock(c.castStartedAt+CHAPTER5_FINALE_MS,()=>call('progress'));
  assert.equal(state().phase,'chapter5-complete');assert.equal(state().chapter5.completedAt,c.castStartedAt+CHAPTER5_FINALE_MS);
  const complete=raw;await serverClock(c.castStartedAt+CHAPTER5_FINALE_MS+10000,()=>call('progress'));assert.equal(raw,complete);
  assert.equal((await call('me',real[0])).data.chapter5.winners.length,6);
});

test('killer voting waits for its 2500ms entry plus narration/tail and result stays private until the frozen 6300ms reveal',async()=>{
  const real=await castingRun();for(let i=0;i<5;i++){const r=await finishCastingRound(real);await serverClock(r.completedAt+castingCompletionMs(r.id),()=>call('progress'));}
  assert.equal(state().chapter5.rounds[5].id,'killer');const before=raw;
  await serverClock(votingTime()-1,async()=>{assert.equal((await castVote(real[0],real[1].id)).status,409);});assert.equal(raw,before);
  const round=await finishCastingRound(real);
  await serverClock(round.completedAt+6299,async()=>{assert.equal((await call('state',{},'GET')).data.chapter5.round.winner,null);});
  await serverClock(round.completedAt+6300,async()=>{assert.equal((await call('state',{},'GET')).data.chapter5.round.winner.id,round.winnerPlayerId);});
});

test('casting waits indefinitely and only the existing authenticated host can start rules, once',async()=>{
  const real=await packageTestRun('chapter5'),start=state().chapter5.startedAt;
  assert.equal((await castingReady()).status,409);
  await serverClock(start+CHAPTER5_INTRO_MS,()=>call('progress'));const waiting=raw;
  await serverClock(start+CHAPTER5_INTRO_MS+3600000,async()=>{
    await call('progress',{phase:'chapter5-casting',serverNow:999999999});assert.equal(raw,waiting);
    assert.equal((await castingReady({code:'wrong'})).status,403);
    assert.equal((await castingReady({code:null})).status,403);
    assert.equal((await call('player',{...real[0],action:'casting-ready'})).status,409);
    assert.equal((await castingReady({chapter5StartedAt:start-1})).status,409);assert.equal(raw,waiting);
    overlapReads(8);const out=await Promise.all(Array.from({length:8},()=>castingReady({rulesStartedAt:1})));
    assert(out.every(r=>r.status===200));assert.equal(state().phase,'chapter5-rules');assert.equal(state().chapter5.rulesStartedAt,Date.now());
    const after=raw;await castingReady();assert.equal(raw,after);
  });
});

test('rules narration and all six role narrations finish before server permits a single ballot',async()=>{
  await packageTestRun('chapter5');await serverClock(state().chapter5.startedAt+CHAPTER5_INTRO_MS,async()=>{await call('progress');await castingReady();});
  const rules=state().chapter5.rulesStartedAt,before=raw;
  await serverClock(rules+CHAPTER5_RULES_MS-1,async()=>{await call('progress');assert.equal(raw,before);assert.equal((await castSimulated()).status,409);});
  await serverClock(rules+CHAPTER5_RULES_MS,()=>call('progress'));assert.equal(state().chapter5.rounds[0].startedAt,rules+CHAPTER5_RULES_MS);
  const real=state().players.filter(p=>!p.simulated);
  for(const role of castingRoles){
    assert.equal(state().chapter5.rounds[state().chapter5.roundIndex].id,role.id);
    const r=state().chapter5.rounds[state().chapter5.roundIndex],gate=votingTime(),start=r.startedAt+(role.id==='killer'?2500:1200),duration=recordingFor(role.id).durationMs;
    for(const time of [start,start+duration-1,start+duration,gate-1])await serverClock(time,async()=>{
      const before=raw;assert.equal((await castVote(real[0],real[1].id)).status,409);assert.equal((await castSimulated()).status,409);assert.equal(raw,before);
      assert.equal((await call('me',real[0])).data.chapter5.round.votingActive,false);
    });
    await serverClock(gate,async()=>{assert.equal((await call('me',real[0])).data.chapter5.round.votingActive,true);});
    const completed=await finishCastingRound(real);await serverClock(completed.completedAt+castingCompletionMs(role.id),()=>call('progress'));
  }
});

test('host-ready transaction is fenced against reset and Chapter Select while in flight',async()=>{
  for(const destination of ['reset','chapter5']){
    await packageTestRun('chapter5');await serverClock(state().chapter5.startedAt+CHAPTER5_INTRO_MS,async()=>{
      await call('progress');const gate={entered:deferred(),release:deferred()};heldCommit=gate;const old=castingReady();await gate.entered.promise;
      if(destination==='reset')await reset();else await selectChapter('chapter5');const after=raw;gate.release.resolve();assert.equal((await old).status,409);assert.equal(raw,after);
    });
  }
});

test('existing persisted Chapter 5 runs remain valid and silent rather than replaying new recordings on deployment',async()=>{
  await castingRun();const s=state();delete s.chapter5.audioVersion;delete s.chapter5.readyAt;delete s.chapter5.rulesStartedAt;
  s.chapter5.rounds[0].startedAt=s.chapter5.startedAt+10000;raw=JSON.stringify(s);
  await serverClock(s.chapter5.startedAt+11200,async()=>{
    const result=await call('state',{},'GET');assert.equal(result.status,200);assert.equal(result.data.chapter5.audioVersion,0);assert.equal(result.data.chapter5.round.votingActive,true);
    assert.equal((await castingReady()).status,409);assert.equal((await castSimulated()).status,200);
  });
});

test('reset, return-lobby and Chapter Select fence in-flight casting writes and clear package/Chapter 5',async()=>{
  for(const operation of ['reset','return','select']){
    const real=await castingRun();await serverClock(votingTime(),async()=>{
      const gate={entered:deferred(),release:deferred()};heldCommit=gate;const old=castVote(real[0],real[1].id);await gate.entered.promise;
      if(operation==='reset')await reset();else if(operation==='return')await returnLobby();else await selectChapter('photo');
      const after=raw;gate.release.resolve();assert.equal((await old).status,409);assert.equal(raw,after);
      assert.equal(state().chapter5,undefined);assert.equal(state().packageOpenedAt,undefined);assert.equal(state().macheteHolderPlayerId,undefined);
    });await reset();
  }
});

test('package confirmation is generation-fenced against reset and replay',async()=>{
  for(const operation of ['reset','select']){
    const real=await packageTestRun();await serverClock(5000200,async()=>{
      const gate={entered:deferred(),release:deferred()};heldCommit=gate;const old=packageOpen(real[0]);await gate.entered.promise;
      if(operation==='reset')await reset();else await selectChapter('package');const after=raw;
      gate.release.resolve();assert.equal((await old).status,409);assert.equal(raw,after);assert(!state().packageOpenedAt);
    });await reset();
  }
});

test('Chapter Select package/Chapter 5 remains host-only, preserves cast and creates distinct clean runs',async()=>{
  const real=await packageTestRun('chapter5'),players=structuredClone(state().players),run=state().chapter5.startedAt,generation=state().generation;
  assert.equal((await selectChapter('chapter5',{code:'wrong'})).status,403);
  await serverClock(5000000,async()=>{assert.equal((await selectChapter('chapter5')).status,200);});assert.notEqual(state().chapter5.startedAt,run);assert.notEqual(state().generation,generation);assert.deepEqual(state().players,players);
  const before=raw;assert.equal((await castVote(real[0],real[1].id,'screamer',run)).status,409);assert.equal(raw,before);
  assert.equal((await selectChapter('package')).status,200);assert.equal(state().phase,'door-vote-complete');assert(!state().chapter5);assert(!state().packageOpenedAt);
});

test('Chapter Select uses one captured server timestamp even when preparation spans multiple milliseconds',async()=>{
  await packageTestRun();await serverClock(6000000,async()=>{
    let clock=6000000;Date.now=()=>clock++;
    assert.equal((await selectChapter('chapter5')).status,200);
    assert(state().chapter5.startedAt>=state().packageOpenedAt);assert.equal((await call('state',{},'GET')).status,200);
  });
});

test('corrupt package, casting ballots, round clocks and winner states are rejected',async()=>{
  await castingRun();const valid=state();const variants=[
    s=>{s.packageOpenedAt=null;},s=>{s.macheteHolderPlayerId='foreign';},s=>{s.chapter5.rounds[0].votes[s.players[0].id]=s.players[0].id;},
    s=>{s.chapter5.rounds[0].votes.foreign=s.players[0].id;},s=>{s.chapter5.rounds[0].winnerPlayerId=s.players[0].id;},
    s=>{s.chapter5.rounds[0].startedAt=1;},s=>{s.chapter5.roundIndex=5;},s=>{s.chapter5.castStartedAt=Date.now();}
  ];
  for(const mutate of variants){const s=structuredClone(valid);mutate(s);raw=JSON.stringify(s);assert.equal((await call('state',{},'GET')).status,503);}
});

test('a unique highest-vote player may win multiple casting roles and adjacent rounds share one black tail',async()=>{
  await castingRun();const cast=structuredClone(state().players),winner=cast[0];
  for(let i=0;i<2;i++){
    await serverClock(votingTime(),async()=>{
      const results=await Promise.all(cast.map(p=>castVote(p,p.id===winner.id?cast[1].id:winner.id)));
      assert(results.every(r=>r.status===200));
    });
    const r=state().chapter5.rounds[i];assert.equal(r.winnerPlayerId,winner.id);
    await serverClock(r.completedAt+castingCompletionMs(r.id),()=>call('progress'));
    assert.equal(state().chapter5.rounds[i+1].startedAt,r.completedAt+castingCompletionMs(r.id)-500);
  }
});
