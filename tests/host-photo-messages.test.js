import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CAS_SCRIPT,publicState} from '../api/_state.js';
import join from '../api/join.js';
import host from '../api/host.js';
import me from '../api/me.js';
import player from '../api/player.js';
import progress from '../api/progress.js';
import chapter3 from '../api/chapter3.js';
let raw,now,originalFetch,originalNow;
beforeEach(()=>{
 raw=null;now=10000000;originalFetch=global.fetch;originalNow=Date.now;Date.now=()=>now;
 process.env.KV_REST_API_URL='https://redis.invalid';process.env.KV_REST_API_TOKEN='isolated';process.env.HOST_KEY='local-host';
 global.fetch=async(url,options)=>{assert.equal(url,'https://redis.invalid');const a=JSON.parse(options.body);let result;
  if(a[0]==='GET')result=raw;else if(a[0]==='SET'){raw=a[2];result='OK';}else{assert.equal(a[1],CAS_SCRIPT);result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}
  return {ok:true,json:async()=>({result})};};
});
afterEach(()=>{global.fetch=originalFetch;Date.now=originalNow;});
const saved=()=>JSON.parse(raw);
async function call(handler,body={},cookie){let status,data,headers={};await handler({method:'POST',body,headers:cookie?{cookie}:{}},{status(n){status=n;return this;},setHeader(k,v){headers[k]=v;},json(j){data=j;return j;}});return {status,data,headers};}
async function guests(n){const players=[];for(let i=0;i<n;i++){const r=await call(join,{name:'Independent '+i});assert.equal(r.status,200);players.push(r.data.player);}return players;}

import {messageTemplates,createAssignments} from '../api/_chapter3-messages.js';
test('host alone completes the photo with session cookie; guests, players and stale requests cannot',async()=>{
 const ps=await guests(6);await call(host,{action:'lock-room',code:'local-host'});await call(host,{action:'start',code:'local-host'});
 const s=saved();now+=200000;await call(progress);assert.equal(saved().phase,'photo');
 const body={action:'photo-taken',generation:s.generation,startedAt:s.startedAt};
 assert.equal((await call(host,body)).status,403);
 assert.equal((await call(player,{...ps[0],action:'photo-confirm'})).status,403);
 const auth=await call(host,{action:'maze-login',code:'local-host'}),cookie=auth.headers['Set-Cookie'].split(';')[0];
 assert.equal((await call(host,{...body,generation:'old'},cookie)).status,409);
 assert.equal((await call(host,body,cookie)).status,200);assert.equal(saved().phase,'photo-complete');
 const complete=saved();assert.deepEqual(complete.photo.confirmedPlayerIds,ps.map(p=>p.id));
 assert.equal((await call(host,body,cookie)).status,200);assert.deepEqual(saved().photo,complete.photo);
 const refreshed=await call(me,ps[0]);assert.equal(refreshed.status,200);assert(refreshed.data.photo.complete);
 await call(chapter3);assert.equal(saved().phase,'chapter3-opening');
 assert.equal((await call(host,body,cookie)).status,200);assert.equal(saved().phase,'chapter3-opening');
});
test('25 distinct messages support unique private assignments for 20, 12 and one player, with saved assignment persistence',async()=>{
 assert.equal(messageTemplates.length,25);assert.equal(new Set(messageTemplates.map(t=>t.id)).size,25);assert.equal(new Set(messageTemplates.map(t=>t.body)).size,25);
 for(const n of [1,12,20]){const ps=Array.from({length:n},(_,i)=>({id:'p'+i,name:'Guest '+i})),a=createAssignments(ps);assert.equal(Object.keys(a).length,n);assert.equal(new Set(Object.values(a).map(a=>a.templateId)).size,n);for(const x of Object.values(a)){assert(!/[{}]/.test(x.body));assert(x.body.length<300);}}
 const ps=await guests(20);await call(host,{action:'lock-room',code:'local-host'});await call(host,{action:'start',code:'local-host'});now+=200000;await call(progress);
 const s=saved();await call(host,{action:'photo-taken',generation:s.generation,startedAt:s.startedAt,code:'local-host'});await call(chapter3);
 const a=saved().chapter3.assignments;assert.equal(new Set(Object.values(a).map(a=>a.templateId)).size,20);await call(chapter3);assert.deepEqual(saved().chapter3.assignments,a);
 now+=13000;await call(progress);await call(player,{...ps[0],action:'message-open'});
 const own=await call(me,ps[0]),other=await call(me,ps[1]);assert.equal(own.data.chapter3.assignment.body,a[ps[0].id].body);assert.equal(other.data.chapter3.assignment,undefined);
 assert.equal((await call(me,{id:ps[1].id,token:ps[0].token})).status,401);
 assert(!JSON.stringify(publicState(saved())).includes(a[ps[0].id].body));
});
test('existing twelve-person simulation identities remain intact',async()=>{
 await guests(2);assert.equal((await call(host,{action:'test-fill',code:'local-host'})).status,200);assert.equal(saved().players.length,12);assert.equal(saved().players.filter(p=>p.simulated).length,10);
});

