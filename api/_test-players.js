import crypto from 'node:crypto';
import {LobbyError,UNCHANGED} from './_state.js';
import {MAX_PLAYERS} from '../participant-limits.js';

// Prepare identities once per request; CAS retries only recompute free names.
export function makeSimulatedAdder(body={}){
 const count=body.count??10,requestId=body.requestId??crypto.randomUUID();
 if(!Number.isInteger(count)||count<1||count>MAX_PLAYERS)throw new LobbyError(400,'Choose a valid number of test players');
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw new LobbyError(400,'Invalid test request');
 const prepared=Array.from({length:count},()=>({id:crypto.randomUUID(),token:crypto.randomBytes(24).toString('hex'),partnerId:null,ready:true,alive:true,hearts:3,inventory:[],simulated:true,testFillId:requestId}));
 return s=>{
  if(body.count!==undefined&&body.generation!==s.generation)throw new LobbyError(409,'The lobby session changed. Refresh before adding players');
  const existing=s.players.filter(p=>p.testFillId===requestId);
  if(existing.length){if(existing.length!==count)throw new LobbyError(409,'This test request was already used');return UNCHANGED;}
  if(s.players.length+count>MAX_PLAYERS)throw new LobbyError(409,'Not enough room for those test players');
  const names=new Set(s.players.map(p=>p.name.toLowerCase()));let serial=0;
  for(const player of prepared){let name;do{name='Test '+(Math.floor(serial/2)+1)+(serial++%2?'B':'A');}while(names.has(name.toLowerCase()));names.add(name.toLowerCase());s.players.push({...player,name});}
 };
}
