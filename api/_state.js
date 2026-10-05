import { randomUUID } from "node:crypto";
const KEY = "brookwood:1031:v3:state";
// Compare the exact snapshot and write in one Redis operation, across all instances.
export const CAS_SCRIPT = `local current = redis.call('GET', KEYS[1])
if (current or '') ~= ARGV[1] then return 0 end
if ARGV[2] ~= ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]) end
return 1`;
export const fresh = () => ({room:"1031",phase:"lobby",players:[],startedAt:null,updatedAt:Date.now(),generation:randomUUID(),revision:randomUUID()});
export class LobbyError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
// No-op mutations still compare their snapshot atomically, including reset fencing.
export const UNCHANGED = Symbol("unchanged");
// A photo request may retry against newer confirmations, but never a replay.
// Reuse the existing cinematic clock; no additional run identifier is stored.
export function withinCinematicRun(change){
  let seen=false,startedAt;
  return s=>{
    if(seen&&s.startedAt!==startedAt)throw new LobbyError(409,"The cinematic run changed. Please try again.");
    seen=true;startedAt=s.startedAt;
    return change(s);
  };
}
const photoPhases = ["photo","photo-complete"];
const positiveTime = value => Number.isFinite(value) && value > 0;
export function validatePhoto(s){
  const cast=new Set(s.players.map(p=>p.id)),photo=s.photo;
  if(s.players.length!==12||cast.size!==12||[...cast].some(id=>typeof id!=="string"||!id)||
    !photo||!positiveTime(photo.promptedAt)||!Array.isArray(photo.confirmedPlayerIds))throw new Error("Invalid photo data.");
  const confirmed=new Set(photo.confirmedPlayerIds);
  if(confirmed.size!==photo.confirmedPlayerIds.length||[...confirmed].some(id=>!cast.has(id)))throw new Error("Invalid photo confirmations.");
  if(s.phase==="photo"&&(confirmed.size>11||photo.confirmedAt!==null))throw new Error("Invalid incomplete photo data.");
  if(s.phase==="photo-complete"&&(confirmed.size!==12||!positiveTime(photo.confirmedAt)))throw new Error("Invalid completed photo data.");
  return confirmed;
}
function validateState(s){
  if(!s||!Array.isArray(s.players)||s.room!=="1031"||!["lobby","opening",...photoPhases].includes(s.phase))throw new Error("Invalid lobby data.");
  if(photoPhases.includes(s.phase))validatePhoto(s);
}
export function confirmPhoto(s,ids){
  if(!photoPhases.includes(s.phase))throw new LobbyError(409,"The photo checkpoint is not active.");
  const confirmed=validatePhoto(s),cast=new Set(s.players.map(p=>p.id));
  if(ids.some(id=>!cast.has(id)))throw new LobbyError(409,"Player is not in the current cast.");
  const added=ids.filter(id=>!confirmed.has(id));
  if(!added.length)return UNCHANGED;
  if(s.phase==="photo-complete")throw new LobbyError(409,"Player is missing from the completed photo.");
  for(const id of added)confirmed.add(id);
  s.photo.confirmedPlayerIds=[...confirmed];
  if(confirmed.size===12&&[...cast].every(id=>confirmed.has(id))){s.photo.confirmedAt=Date.now();s.phase="photo-complete";}
}
export function photoProgress(s){
  if(!photoPhases.includes(s.phase))return null;
  const confirmed=validatePhoto(s);
  return {promptedAt:s.photo.promptedAt,confirmedCount:confirmed.size,complete:s.phase==="photo-complete",confirmedAt:s.photo.confirmedAt};
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
  validateState(state);
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
    validateState(current.state);
    const unchanged=result===UNCHANGED;
    if(!unchanged){current.state.updatedAt=Date.now();current.state.revision=randomUUID();}
    const committed=await command(["EVAL",CAS_SCRIPT,1,KEY,current.raw,unchanged?current.raw:JSON.stringify(current.state)]);
    if(committed===1)return unchanged?undefined:result;
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
export function publicState(s){const photo=photoProgress(s);return {room:s.room,phase:s.phase,startedAt:s.startedAt,...(photo?{photo}:{}),players:s.players.map(p=>({id:p.id,name:p.name,partnerId:p.partnerId||null,ready:!!p.ready,alive:p.alive!==false,hearts:p.hearts??3}))};}
