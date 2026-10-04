import { randomUUID } from "node:crypto";
const KEY = "brookwood:1031:v3:state";
// Compare the exact snapshot and write in one Redis operation, across all instances.
export const CAS_SCRIPT = `local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`;
export const fresh = () => ({room:"1031",phase:"lobby",players:[],startedAt:null,updatedAt:Date.now(),generation:randomUUID(),revision:randomUUID()});
export class LobbyError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export async function command(args){
  const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token)throw new Error("Redis environment variables are missing.");
  const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(args),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error(`Redis HTTP failure (${r.status}).`);
  const j=await r.json();
  if(j.error)throw new Error("Redis command failed: "+j.error);
  if(!Object.hasOwn(j,"result"))throw new Error("Invalid Redis response.");
  return j.result;
}
async function snapshot(){
  const raw=await command(["GET",KEY]);
  if(raw===null)return {raw:"",state:{...fresh(),generation:"initial"}};
  const state=JSON.parse(raw);
  if(!state||!Array.isArray(state.players)||state.room!=="1031"||!["lobby","opening"].includes(state.phase))throw new Error("Invalid lobby data.");
  // Existing v3 data predating concurrency protection remains readable.
  return {raw,state:{...state,generation:state.generation||"legacy"}};
}
export async function getState(){return (await snapshot()).state;}
export async function updateState(change){
  let current=await snapshot();
  const generation=current.state.generation;
  for(let attempt=0;attempt<32;attempt++){
    if(current.state.generation!==generation)throw new LobbyError(409,"The lobby was reset. Please join again.");
    const result=change(current.state);
    current.state.updatedAt=Date.now();
    current.state.revision=randomUUID();
    const committed=await command(["EVAL",CAS_SCRIPT,1,KEY,current.raw,JSON.stringify(current.state)]);
    if(committed===1)return result;
    if(committed!==0)throw new Error("Invalid Redis commit response.");
    current=await snapshot();
  }
  throw new LobbyError(409,"The lobby is busy. Please try again.");
}
// Reset writes only fresh data. Its new generation fences every earlier snapshot.
export async function resetState(){await command(["SET",KEY,JSON.stringify(fresh())]);}
export function send(res,status,data){res.status(status);res.setHeader("Cache-Control","no-store, no-cache, must-revalidate");return res.json(data);}
export function fail(res,error){
  if(error instanceof LobbyError)return send(res,error.status,{error:error.message});
  console.error("Lobby request failed:",error.message);
  return send(res,503,{error:"Brookwood could not reach the lobby database. Please try again."});
}
export function publicState(s){return {room:s.room,phase:s.phase,startedAt:s.startedAt,players:s.players.map(p=>({id:p.id,name:p.name,partnerId:p.partnerId||null,ready:!!p.ready,alive:p.alive!==false,hearts:p.hearts??3}))};}
