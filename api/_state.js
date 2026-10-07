import { randomUUID,randomInt } from "node:crypto";
import {createAssignments,messageTemplates} from './_chapter3-messages.js';
import {chapter3Phases,PRIVATE_MESSAGES_MS} from '../chapter3-timing.js';
import {CHAPTER2_START_MS,PHOTO_CHECKPOINT_MS} from '../cinematic-timeline.js';
import {chapter4Phases,CHAPTER4_VOTING_MS} from '../chapter4-timing.js';
import {chapter3CompletionTimeline} from '../chapter3.js';
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
  if(!s||!Array.isArray(s.players)||s.room!=="1031"||!["lobby","opening",...photoPhases,...chapter3Phases,...chapter4Phases].includes(s.phase))throw new Error("Invalid lobby data.");
  if(photoPhases.includes(s.phase))validatePhoto(s);
  if(chapter3Phases.includes(s.phase))validateChapter3(s);
  if(isChapter4(s))validateChapter4(s);
}
export const isChapter3=s=>chapter3Phases.includes(s.phase);
export const isChapter4=s=>chapter4Phases.includes(s.phase);
export function validChapter3Cast(s){
  const cast=new Map(s.players.map(p=>[p.id,p]));
  return s.players.length===12&&cast.size===12&&s.players.every(p=>typeof p.id==='string'&&p.id&&typeof p.name==='string'&&p.name&&
    typeof p.token==='string'&&p.token&&p.partnerId!==p.id&&cast.get(p.partnerId)?.partnerId===p.id);
}
export function validateChapter3(s){
  const c=s.chapter3;
  validatePhoto({...s,phase:'photo-complete'});
  if(!validChapter3Cast(s)||!c||!positiveTime(c.startedAt)||!c.assignments||Array.isArray(c.assignments)||
    Object.keys(c.assignments).length!==12)throw Error('Invalid Chapter 3 state.');
  const templates=new Set(messageTemplates.map(t=>t.id)),used=new Set();let count=0;
  const active=c.privateMessagesActivatedAt!==null;
  if(active&&(!positiveTime(c.privateMessagesActivatedAt)||c.privateMessagesActivatedAt<c.startedAt+PRIVATE_MESSAGES_MS))throw Error('Invalid message activation.');
  for(const p of s.players){
    const a=Object.hasOwn(c.assignments,p.id)?c.assignments[p.id]:null;
    if(!a||!templates.has(a.templateId)||used.has(a.templateId)||typeof a.title!=='string'||!a.title||typeof a.body!=='string'||!a.body)
      throw Error('Invalid private assignment.');
    used.add(a.templateId);
    if(a.openedAt!==null&&(!active||!positiveTime(a.openedAt)||a.openedAt<c.privateMessagesActivatedAt))throw Error('Invalid message opening.');
    if(a.readAt!==null&&(!positiveTime(a.readAt)||a.openedAt===null||a.readAt<a.openedAt))throw Error('Invalid message acknowledgement.');
    if(a.readAt!==null)count++;
  }
  if(s.phase==='chapter3-opening'&&(active||count||c.completedAt!==null))throw Error('Invalid Chapter 3 opening.');
  if(s.phase==='private-messages'&&(!active||count===12||c.completedAt!==null))throw Error('Invalid private checkpoint.');
  if(s.phase==='private-messages-complete'&&(!active||count!==12||!positiveTime(c.completedAt)||c.completedAt<Math.max(...Object.values(c.assignments).map(a=>a.readAt))))throw Error('Invalid private completion.');
  return count;
}
export function withinChapter3Run(change){
  let seen=false,start;
  return s=>{if(seen&&s.chapter3?.startedAt!==start)throw new LobbyError(409,'Chapter 3 changed. Please try again.');seen=true;start=s.chapter3?.startedAt;return change(s);};
}
export function makeChapter3Starter(){
  let prepared;
  return withinCinematicRun(s=>{
    if(isChapter3(s))return UNCHANGED;
    if(s.phase!=='photo-complete')throw new LobbyError(409,'Complete the group photo before starting Chapter 3.');
    validatePhoto(s);
    if(!validChapter3Cast(s))throw new LobbyError(409,'Chapter 3 requires twelve players in reciprocal couples.');
    // Cache once per request; CAS retries never reroll the prepared selection.
    prepared??={startedAt:Date.now(),privateMessagesActivatedAt:null,assignments:createAssignments(s.players),completedAt:null};
    s.chapter3=structuredClone(prepared);s.phase='chapter3-opening';
  });
}
function setOpening(s,startedAt){
  s.phase='opening';s.startedAt=startedAt;delete s.photo;delete s.chapter3;delete s.chapter4;
}
export function startSession(s,startedAt=Date.now()){
  if(s.players.length!==12)throw new LobbyError(409,"The cast must contain exactly 12 players.");
  if(s.players.some(p=>!p.partnerId||!p.ready))throw new LobbyError(409,"Every player must have a partner and be ready.");
  const pairs=new Set(s.players.map(p=>[p.id,p.partnerId].sort().join(":")));
  if(pairs.size!==6)throw new LobbyError(409,"The cast must contain six couples.");
  setOpening(s,startedAt);
}
export function makeTestChapterSelector(checkpoint){
  if(!['chapter1','chapter2','photo','chapter3','chapter4'].includes(checkpoint))throw new LobbyError(400,'Unknown test checkpoint.');
  let prepared;
  return withinCinematicRun(s=>{
    if(!validChapter3Cast(s))throw new LobbyError(409,'Chapter Select requires twelve players in six reciprocal couples.');
    if(!prepared){
      const now=Date.now(),offset=checkpoint==='chapter1'?0:checkpoint==='chapter2'?CHAPTER2_START_MS:PHOTO_CHECKPOINT_MS;
      // Distinct server-generated clocks also distinguish intentional same-ms reruns.
      const startedAt=now-offset+(now-offset===s.startedAt?1:0);
      prepared={startedAt,now,generation:randomUUID(),chapter3:['chapter3','chapter4'].includes(checkpoint)?{
        startedAt:Math.max(now,(s.chapter3?.startedAt??0)+1),privateMessagesActivatedAt:null,
        assignments:createAssignments(s.players),completedAt:null
      }:null};
      if(checkpoint==='chapter4'){
        const c=prepared.chapter3;
        c.startedAt=now-16600;c.privateMessagesActivatedAt=now-4000;c.completedAt=now-chapter3CompletionTimeline.end;
        for(const a of Object.values(c.assignments)){a.openedAt=c.completedAt;a.readAt=c.completedAt;}
        prepared.startedAt=c.startedAt-PHOTO_CHECKPOINT_MS;
        prepared.chapter4=freshChapter4(Math.max(now,(s.chapter4?.startedAt??0)+1));
      }
    }
    s.generation=prepared.generation;
    if(checkpoint==='chapter1'){startSession(s,prepared.startedAt);return;}
    setOpening(s,prepared.startedAt);
    if(checkpoint==='chapter2')return;
    s.photo={promptedAt:prepared.now,confirmedPlayerIds:checkpoint==='chapter3'?s.players.map(p=>p.id):[],confirmedAt:checkpoint==='chapter3'?prepared.now:null};
    s.phase=checkpoint==='photo'?'photo':'chapter3-opening';
    if(prepared.chapter3)s.chapter3=structuredClone(prepared.chapter3);
    if(prepared.chapter4){s.photo={promptedAt:prepared.chapter3.startedAt,confirmedPlayerIds:s.players.map(p=>p.id),confirmedAt:prepared.chapter3.startedAt};s.chapter4=structuredClone(prepared.chapter4);s.phase='chapter4-opening';}
  });
}
export function activatePrivateMessages(s){
  if(!isChapter3(s))return UNCHANGED;
  if(s.phase!=='chapter3-opening'||Date.now()-s.chapter3.startedAt<PRIVATE_MESSAGES_MS)return UNCHANGED;
  s.chapter3.privateMessagesActivatedAt=Date.now();s.phase='private-messages';
}
export function privateMessageAction(s,ids,action){
  if(!isChapter3(s)||Date.now()-s.chapter3.startedAt<PRIVATE_MESSAGES_MS)throw new LobbyError(409,'Private messages are not active.');
  activatePrivateMessages(s);let changed=false;
  for(const id of new Set(ids)){
    const a=Object.hasOwn(s.chapter3.assignments,id)?s.chapter3.assignments[id]:null;
    if(!a)throw new LobbyError(409,'Private assignment not found.');
    if(action==='message-read'&&a.openedAt===null)throw new LobbyError(409,'Open your message before acknowledging it.');
    if(action==='message-open'||action==='simulated-read')if(a.openedAt===null){a.openedAt=Date.now();changed=true;}
    if(action==='message-read'||action==='simulated-read')if(a.readAt===null){a.readAt=Date.now();changed=true;}
  }
  if(!changed)return UNCHANGED;
  if(Object.values(s.chapter3.assignments).every(a=>a.readAt!==null)){
    s.chapter3.completedAt??=Date.now();s.phase='private-messages-complete';
  }
}
export function chapter3Progress(s){
  if(isChapter4(s))return chapter3Progress({...s,phase:'private-messages-complete'});
  if(!isChapter3(s))return null;
  return {startedAt:s.chapter3.startedAt,privateMessagesActivatedAt:s.chapter3.privateMessagesActivatedAt,completedAt:s.chapter3.completedAt,readCount:validateChapter3(s)};
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
  if(isChapter3(s)||isChapter4(s))return photoProgress({...s,phase:'photo-complete'});
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
export function publicState(s){const photo=photoProgress(s),chapter3=chapter3Progress(s),chapter4=chapter4Progress(s);return {room:s.room,phase:s.phase,startedAt:s.startedAt,...(photo?{photo}:{}),...(chapter3?{chapter3}:{}),...(chapter4?{chapter4}:{}),players:s.players.map(p=>({id:p.id,name:p.name,partnerId:p.partnerId||null,ready:!!p.ready,alive:p.alive!==false,hearts:p.hearts??3}))};}
const freshChapter4=startedAt=>({startedAt,votingActivatedAt:null,votes:{},selectedPlayerId:null,completedAt:null});
export function validateChapter4(s){
  validateChapter3({...s,phase:'private-messages-complete'});
  const c=s.chapter4,cast=new Set(s.players.map(p=>p.id));
  if(!c||!positiveTime(c.startedAt)||c.startedAt<s.chapter3.completedAt+chapter3CompletionTimeline.end||!c.votes||Array.isArray(c.votes))throw Error('Invalid Chapter 4 state.');
  const entries=Object.entries(c.votes),active=c.votingActivatedAt!==null;
  if(active&&(!positiveTime(c.votingActivatedAt)||c.votingActivatedAt<c.startedAt+CHAPTER4_VOTING_MS))throw Error('Invalid door voting activation.');
  if(entries.some(([voter,target])=>!cast.has(voter)||!cast.has(target)||voter===target))throw Error('Invalid door votes.');
  if(s.phase==='chapter4-opening'&&(active||entries.length||c.completedAt!==null||c.selectedPlayerId!==null))throw Error('Invalid Chapter 4 opening.');
  if(s.phase==='door-vote'&&(!active||entries.length>=12||c.completedAt!==null||c.selectedPlayerId!==null))throw Error('Invalid incomplete vote.');
  if(s.phase==='door-vote-complete'){
    const counts=new Map();for(const [,target] of entries)counts.set(target,(counts.get(target)||0)+1);
    if(!active||entries.length!==12||!positiveTime(c.completedAt)||c.completedAt<c.votingActivatedAt||!cast.has(c.selectedPlayerId)||counts.get(c.selectedPlayerId)!==Math.max(...counts.values()))throw Error('Invalid completed vote.');
  }
  return entries.length;
}
export function chapter4Progress(s){
  if(!isChapter4(s))return null;
  const c=s.chapter4,p=s.players.find(p=>p.id===c.selectedPlayerId);
  return {startedAt:c.startedAt,votingActivatedAt:c.votingActivatedAt,active:c.votingActivatedAt!==null||Date.now()>=c.startedAt+CHAPTER4_VOTING_MS,voteCount:validateChapter4(s),complete:s.phase==='door-vote-complete',completedAt:c.completedAt,selectedPlayer:p?{id:p.id,name:p.name}:null};
}
export function withinChapter4Run(change){let seen=false,start;return s=>{if(seen&&s.chapter4?.startedAt!==start)throw new LobbyError(409,'Chapter 4 changed. Please try again.');seen=true;start=s.chapter4?.startedAt;return change(s);};}
export function makeChapter4Starter(){
  let prepared;
  return withinChapter3Run(s=>{
    if(isChapter4(s))return UNCHANGED;
    if(s.phase!=='private-messages-complete'||Date.now()-s.chapter3.completedAt<chapter3CompletionTimeline.end)return UNCHANGED;
    validateChapter3(s);prepared??=freshChapter4(Date.now());s.chapter4=structuredClone(prepared);s.phase='chapter4-opening';
  });
}
export function activateDoorVoting(s){
  if(!isChapter4(s)||s.phase!=='chapter4-opening'||Date.now()-s.chapter4.startedAt<CHAPTER4_VOTING_MS)return UNCHANGED;
  s.chapter4.votingActivatedAt=Date.now();s.phase='door-vote';
}
export function makeDoorVoter(choose=randomInt){
  const decisions=new Map();
  return (s,entries)=>{
    if(!isChapter4(s)||Date.now()-s.chapter4.startedAt<CHAPTER4_VOTING_MS)throw new LobbyError(409,'Door voting is not active.');
    const cast=new Set(s.players.map(p=>p.id));
    if(entries.some(([voter,target])=>typeof target!=='string'||!cast.has(voter)||!cast.has(target)||voter===target))throw new LobbyError(400,'Choose another current player.');
    const pending=entries.filter(([id])=>!Object.hasOwn(s.chapter4.votes,id));
    if(!pending.length)return UNCHANGED;
    activateDoorVoting(s);for(const [id,target] of pending)s.chapter4.votes[id]=target;
    if(Object.keys(s.chapter4.votes).length===12){
      const counts=new Map();for(const target of Object.values(s.chapter4.votes))counts.set(target,(counts.get(target)||0)+1);
      const maximum=Math.max(...counts.values()),leaders=[...counts].filter(([,n])=>n===maximum).map(([id])=>id).sort(),key=JSON.stringify(leaders);
      if(!decisions.has(key))decisions.set(key,leaders[choose(leaders.length)]);
      s.chapter4.selectedPlayerId=decisions.get(key);s.chapter4.completedAt=Date.now();s.phase='door-vote-complete';
    }
  };
}
