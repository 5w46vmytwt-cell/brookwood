import {chapter8Checkpoints,makeChapter8Starter,withinChapter8Run,chapter8HostAction} from './_chapter8.js';
import {isChapter7,withinBroadcastRun,broadcastHostAction,makeBroadcastTestSelector} from './_chapter7.js';
import {envelopeCandidates,previousRetrievers,investigationHostAction} from './_chapter7-story.js';
import {storyCheckpoints} from '../chapter7-story-timing.js';
import crypto from "node:crypto";
import {issueHostSession,validHostSession} from './_host-session.js';
import {isChapter6,withinMazeRun,mazeHostAction,makeMazeTestSelector,makeFinalCastTestSelector} from './_chapter6.js';
import {isChapter5,makeCastingTestSelector,makeCastingVoter,withinCastingRun,confirmCastingReady,castingCandidates} from './_chapter5.js';
import {isChapter4,withinChapter4Run,makeDoorVoter} from './_state.js';
import {getState,updateState,resetState,send,fail,LobbyError,UNCHANGED,confirmPhoto,withinCinematicRun,withinChapter3Run,privateMessageAction,isChapter3,startSession,makeTestChapterSelector,publicState} from "./_state.js";
function fillSimulatedPlayers(s){
        if(s.players.length!==2||s.players.some(p=>p.simulated))throw new LobbyError(409,"Test fill requires exactly 2 real players.");
        const names=Array.from({length:5},(_,i)=>[`Test ${i+1}A`,`Test ${i+1}B`]).flat();
        if(s.players.some(p=>names.some(n=>n.toLowerCase()===p.name.toLowerCase())))throw new LobbyError(409,"A real player is using a reserved test name.");
        for(let i=0;i<5;i++){
          const couple=['A','B'].map(suffix=>({id:crypto.randomUUID(),token:crypto.randomBytes(24).toString("hex"),name:`Test ${i+1}${suffix}`,partnerId:null,ready:true,alive:true,hearts:3,inventory:[],simulated:true}));
          couple[0].partnerId=couple[1].id;couple[1].partnerId=couple[0].id;
          s.players.push(...couple);
        }
}
export default async function handler(req,res){
  if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
  const chapter8Checkpoint=req.body?.action==='chapter-select'&&chapter8Checkpoints.includes(req.body?.checkpoint);
  const chapter8Action=['chapter8-start','chapter8-photo-sent','chapter8-reveal','chapter8-continue','chapter8-audio-playing','chapter8-audio-ended','chapter8-finale-ready','chapter8-finale-playing','chapter8-finale-ended'].includes(req.body?.action);
  const broadcastCheckpoint=req.body?.action==='chapter-select'&&['chapter7','chapter7-after',...storyCheckpoints.map(c=>c[0])].includes(req.body?.checkpoint);
  const investigationAction=['investigation-audio-playing','investigation-audio-ended','investigation-close-voting','investigation-envelope-return','investigation-host-retrieval','investigation-test-vote','investigation-photo-sound'].includes(req.body?.action);
  const sessionAction=chapter8Checkpoint||chapter8Action||req.body?.action==='investigation-test-options'||req.body?.action==='investigation-test-fill'||req.body?.action==='investigation-checkpoint-options'||investigationAction||broadcastCheckpoint||['broadcast-playing','broadcast-ended'].includes(req.body?.action)||['maze-login','maze-session','maze-audio-ended','maze-answer','maze-start-games','maze-show-image','maze-image-ready','maze-begin-silence','maze-verdict','maze-token-return','maze-close-voting','maze-test-vote'].includes(req.body?.action);
  const pinValid=String(req.body?.code||"")===String(process.env.HOST_KEY||"1031");
  if(!pinValid&&!(sessionAction&&validHostSession(req)))return send(res,403,{error:sessionAction?'Host authentication required.':'Wrong host code.'});
  if(pinValid)issueHostSession(req,res);
  try{
    if(chapter8Action||chapter8Checkpoint){let state;const change=chapter8Checkpoint?makeChapter8Starter(req.body,req.body.checkpoint):req.body.action==='chapter8-start'?makeChapter8Starter(req.body):withinChapter8Run(s=>chapter8HostAction(s,req.body));await updateState(s=>{const result=change(s);state=publicState(s);return result;});return send(res,200,{ok:true,state:{...state,serverNow:Date.now()}});}
    if(req.body.action==='investigation-test-options'){
      const s=await getState(),i=s.chapter7?.investigation;
      if(s.phase!=='chapter7'||!i?.testMode)throw new LobbyError(403,'Enable an explicit Chapter 7 test checkpoint first.');
      const key=i.step==='theory-vote'?'theory':'envelope',e=i.testElections?.[key];
      return send(res,200,{simulated:s.players.filter(p=>p.simulated).map(p=>({id:p.id,name:p.name,voted:!!e&&Object.hasOwn(e.votes,p.id)})),candidates:e?.candidateIds.map(id=>({id,name:key==='theory'?id:s.players.find(p=>p.id===id)?.name}))??[]});
    }
    if(req.body.action==='investigation-test-fill'){
      let state;await updateState(withinBroadcastRun(s=>{
        const i=s.chapter7?.investigation;
        if(!i?.testMode||req.body.generation!==s.generation||req.body.broadcastId!==s.chapter7.id||req.body.investigationId!==i.id||req.body.sequence!==i.sequence)throw new LobbyError(409,'Enable the current Chapter 7 test checkpoint.');
        if(s.players.filter(p=>p.simulated).length===10){state=publicState(s);return UNCHANGED;}
        if(Object.values(i.testElections??{}).some(e=>e.closedAt===null))throw new LobbyError(409,'Fill test players before opening a poll.');
        fillSimulatedPlayers(s);state=publicState(s);
      }));return send(res,200,{ok:true,...(state?{state:{...state,serverNow:Date.now()}}:{})});
    }
    if(req.body.action==='investigation-checkpoint-options'){const s=await getState();return send(res,200,{candidates:(s.chapter7?.investigation?.testMode?s.players.filter(p=>!previousRetrievers(s).has(p.id)):envelopeCandidates(s)).map(p=>({id:p.id,name:p.name}))});}
    if(['maze-login','maze-session'].includes(req.body.action))return send(res,200,{ok:true,authenticated:true});
    if(investigationAction){let state,playSound=false;await updateState(withinBroadcastRun(s=>{const result=investigationHostAction(s,req.body);playSound=result?.playSound===true;state=publicState(s);return result;}));return send(res,200,{ok:true,playSound,state:{...state,serverNow:Date.now()}});}
    if(['broadcast-playing','broadcast-ended'].includes(req.body.action)){let state;await updateState(withinBroadcastRun(s=>{const result=broadcastHostAction(s,req.body);state=publicState(s);return result;}));return send(res,200,{ok:true,state:{...state,serverNow:Date.now()}});}
    if(req.body.action==="reset"){await resetState();return send(res,200,{ok:true});}
    if(['maze-audio-ended','maze-answer','maze-start-games','maze-show-image','maze-image-ready','maze-begin-silence','maze-verdict','maze-token-return','maze-close-voting','maze-test-vote'].includes(req.body.action)){
      let state;await updateState(withinMazeRun(s=>{const result=mazeHostAction(s,req.body);state=publicState(s);return result;}));
      return send(res,200,{ok:true,state:{...state,serverNow:Date.now()}});
    }
    if(req.body.action==='casting-ready'){
      let state;
      await updateState(withinCastingRun(s=>{const result=confirmCastingReady(s,req.body.chapter5StartedAt);state=publicState(s);return result;}));
      return send(res,200,{ok:true,state:{...state,serverNow:Date.now()}});
    }
    if(req.body.action==='test-cast-simulated'){
      const vote=makeCastingVoter(),targets=new Map();
      await updateState(withinCastingRun(s=>{
        const simulated=s.players.filter(p=>p.simulated===true);
        if(!simulated.length)throw new LobbyError(409,'No simulated players to vote.');
        const entries=simulated.map(p=>{if(!targets.has(p.id)){const others=castingCandidates(s).filter(q=>q.id!==p.id);targets.set(p.id,others[crypto.randomInt(others.length)].id);}return [p.id,targets.get(p.id)];});
        return vote(s,entries,req.body.chapter5StartedAt,req.body.roleId);
      }));return send(res,200,{ok:true});
    }
    if(req.body.action==='test-vote-simulated'){
      const vote=makeDoorVoter(),targets=new Map();
      await updateState(withinChapter4Run(s=>{
        if(!isChapter4(s))throw new LobbyError(409,'Chapter 4 voting is not active.');
        if(req.body.chapter4StartedAt!==s.chapter4.startedAt)throw new LobbyError(409,'Chapter 4 changed.');
        const simulated=s.players.filter(p=>p.simulated===true);
        if(!simulated.length)throw new LobbyError(409,'No simulated players to vote.');
        const entries=simulated.map(p=>{if(!targets.has(p.id)){const others=s.players.filter(q=>q.id!==p.id);targets.set(p.id,others[crypto.randomInt(others.length)].id);}return [p.id,targets.get(p.id)];});
        return vote(s,entries);
      }));return send(res,200,{ok:true});
    }
    if(req.body.action==='chapter-select'){
      const select=broadcastCheckpoint?makeBroadcastTestSelector(req.body.checkpoint,req.body):req.body.checkpoint==='chapter5-finale'?makeFinalCastTestSelector():['chapter6','chapter6-ready'].includes(req.body.checkpoint)?makeMazeTestSelector(req.body.checkpoint):['package','chapter5'].includes(req.body.checkpoint)?makeCastingTestSelector(req.body.checkpoint):makeTestChapterSelector(req.body.checkpoint);
      let state;
      await updateState(s=>{const mazeNavigation=broadcastCheckpoint||isChapter7(s)||isChapter6(s)||['chapter6','chapter6-ready','chapter5-finale'].includes(req.body.checkpoint);const result=select(s);if(mazeNavigation)state=publicState(s);return result;});
      return send(res,200,{ok:true,...(state?{state:{...state,serverNow:Date.now()}}:{})});
    }
    if(req.body.action==='test-read-simulated'){
      await updateState(withinChapter3Run(s=>{
        if(!isChapter3(s)||s.phase==='chapter3-opening')throw new LobbyError(409,'Private messages must be active before test reads.');
        const ids=s.players.filter(p=>p.simulated===true).map(p=>p.id);
        if(!ids.length)throw new LobbyError(409,'There are no simulated players to acknowledge.');
        return privateMessageAction(s,ids,'simulated-read');
      }));
      return send(res,200,{ok:true});
    }
    if(req.body.action==="begin-photo"){
      await updateState(withinCinematicRun(s=>{
        if(["photo","photo-complete"].includes(s.phase))return UNCHANGED;
        if(s.phase!=="opening")throw new LobbyError(409,"The photo checkpoint requires an opening session.");
        s.photo={promptedAt:Date.now(),confirmedPlayerIds:[],confirmedAt:null};s.phase="photo";
      }));
      return send(res,200,{ok:true});
    }
    if(req.body.action==="test-confirm-simulated"){
      await updateState(withinCinematicRun(s=>{
        if(s.phase!=="photo")throw new LobbyError(409,"Test photo confirmation is only available during the photo checkpoint.");
        const ids=s.players.filter(p=>p.simulated===true).map(p=>p.id);
        if(!ids.length)throw new LobbyError(409,"There are no simulated players to confirm.");
        return confirmPhoto(s,ids);
      }));
      return send(res,200,{ok:true});
    }
    if(req.body.action==="return-lobby"){
      await updateState(s=>{
        if(!(["opening","photo","photo-complete"].includes(s.phase)||isChapter3(s)||isChapter4(s)||isChapter5(s)||isChapter6(s))||!Number.isFinite(s.startedAt)||s.startedAt<=0||Date.now()-s.startedAt<44000)
          throw new LobbyError(409,"Chapter 1 must finish before returning to the lobby.");
        s.phase="lobby";s.startedAt=null;delete s.chapter3;delete s.chapter4;delete s.chapter5;delete s.chapter6;delete s.chapter7;delete s.packageOpenedAt;delete s.macheteHolderPlayerId;
      });
      return send(res,200,{ok:true});
    }
    if(req.body.action==="test-fill"){
      await updateState(s=>{
        if(s.phase!=="lobby")throw new LobbyError(409,"Test fill is only available during the lobby.");
        fillSimulatedPlayers(s);
      });
      return send(res,200,{ok:true});
    }
    if(req.body.action!=="start")return send(res,400,{error:"Unknown action."});
    await updateState(s=>startSession(s));
    return send(res,200,{ok:true});
  }catch(e){return fail(res,e);}
}
