// One focused local TV/two-phone rehearsal, using isolated memory and real assets.
// Samples podcast playback then seeks to native ended for efficiency; photograph
// narration, its window reveal and the final image hold run at normal speed.
import {spawn} from 'node:child_process';import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';
import {storyRecording,narrationOrder,storyCheckpoints,PHOTO_ENHANCED_MS,PROPHECY_AT_MS,TRANSMISSION_MS} from '../chapter7-story-timing.js';
const base='http://127.0.0.1:3079',debug='http://127.0.0.1:9339',pause=ms=>new Promise(r=>setTimeout(r,ms));mkdirSync('logs',{recursive:true});
const resume=process.argv.includes('--resume-envelope'),resumeRadio=process.argv.includes('--resume-radio');
const seed="import {finalNarrationFixture} from '../tests/chapter7-fixture.js';import {makeBroadcastTestSelector} from '../api/_chapter7.js';import {startInvestigation} from '../api/_chapter7-story.js';const rehearsal=finalNarrationFixture(Date.now()+2000);rehearsal.players.forEach((p,i)=>p.simulated=i>=2);makeBroadcastTestSelector('chapter7-after')(rehearsal);startInvestigation(rehearsal);Object.assign(rehearsal.chapter7.investigation,{step:'podcast-intro',phaseAt:Date.now(),deadline:null,audioStartedAt:null});const nativeFetch=global.fetch;let raw=JSON.stringify(rehearsal),timeOffset=0;";
const serverCode=readFileSync('scripts/dev.mjs','utf8').replace('const nativeFetch=global.fetch;let raw=null,timeOffset=0;',seed);assert(serverCode.includes('JSON.stringify(rehearsal)'));writeFileSync('logs/ch7-story-server.mjs',serverCode);
const server=spawn(process.execPath,['logs/ch7-story-server.mjs','--automation',...(process.argv.includes('--built')?['--built']:[])],{env:{...process.env,PORT:'3079'},windowsHide:true,stdio:['ignore','pipe','pipe']});let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
const browser=spawn(process.env.BROOKWOOD_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9339','--user-data-dir='+mkdtempSync(join(tmpdir(),'brookwood-ch7-story-')),'--no-first-run','--no-default-browser-check','--disable-background-networking','--autoplay-policy=no-user-gesture-required','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,id=0;const pending=new Map(),errors=[],report={recordings:[],checkpoints:[]};
try{
 let version,healthy=false;for(let n=0;n<80;n++){if(server.exitCode!==null)throw Error('Local fixture failed: '+serverLog);try{version=await(await fetch(debug+'/json/version')).json();const r=await fetch(base+'/api/state');healthy=r.ok;if(healthy)break;}catch{}await pause(100);}assert(version&&healthy,'Local browser/server did not start');ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
 ws.onmessage=e=>{const j=JSON.parse(e.data);if(j.id){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(Error(j.error.message)):p.resolve(j.result);}else if(j.method==='Runtime.exceptionThrown')errors.push(j.params.exceptionDetails.exception?.description??j.params.exceptionDetails.text);};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const evaluate=async(session,expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},session);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const state=async()=>await(await fetch(base+'/api/state')).json();
 async function post(path,body={}){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();assert(r.ok,JSON.stringify(j));return j;}
 async function until(check,label,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){const result=await check();if(result)return result;await pause(100);}throw Error('Timed out: '+label+'\n'+JSON.stringify(await state())+'\n'+serverLog);}
 const instrument=`(()=>{if(location.protocol!=='http:')return;window.__audio=[];window.__audioEvents=JSON.parse(sessionStorage.getItem('ch7-audio-events')||'[]');const A=window.Audio;window.Audio=function(...args){const a=new A(...args);window.__audio.push(a);for(const type of ['playing','ended'])a.addEventListener(type,()=>{window.__audioEvents.push({type,src:a.src,at:performance.now(),position:a.currentTime,volume:a.volume});sessionStorage.setItem('ch7-audio-events',JSON.stringify(window.__audioEvents));});return a;};window.__overlaps=0;window.__photoAudit=[];let priorEnhanced=false;function watch(){const active=window.__audio.filter(a=>!a.paused);if(active.length>1&&!active.every(a=>/ch7_04[ab]_/.test(a.src))&&!active.some(a=>a.src.endsWith('sfx-camera-shutter.wav')))window.__overlaps++;const img=document.getElementById('ch7Enhanced'),a=window.__audio.find(a=>a.src.endsWith('ch7_09_photograph_revelation.wav')),enhanced=img&&!img.hidden&&Number(getComputedStyle(img).opacity)>.001;if(enhanced!==priorEnhanced){window.__photoAudit.push({enhanced,position:a?.currentTime,at:performance.now()});priorEnhanced=enhanced;}requestAnimationFrame(watch);}requestAnimationFrame(watch);})();`;
 async function page(path,phoneId){const context=await send('Target.createBrowserContext'),t=await send('Target.createTarget',{url:'about:blank',browserContextId:context.browserContextId}),attached=await send('Target.attachToTarget',{targetId:t.targetId,flatten:true}),session=attached.sessionId;await send('Runtime.enable',{},session);await send('Page.enable',{},session);await send('Page.addScriptToEvaluateOnNewDocument',{source:instrument+(phoneId?`localStorage.setItem('brookwood-player-v3',JSON.stringify({id:'${phoneId}',token:'t${phoneId.slice(1)}'}));`:'')},session);await send('Page.navigate',{url:base+path},session);await until(()=>evaluate(session,`location.pathname==='${path}' && document.readyState==='complete' && typeof lobbyRequest==='function'`),'page ready');return session;}
 const tv=await page('/tv');await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false},tv);await evaluate(tv,"lobbyRequest('/api/host',{action:'maze-login',code:'1031'})");await evaluate(tv,"document.getElementById('ch7Resume').click()");
 const a=await page('/join','p0'),b=await page('/join','p1'),initial=await state();
 const step=async name=>until(async()=>{const s=await state();return s.chapter7.investigation?.step===name&&s;},name);
 async function screenshot(name){const shot=await send('Page.captureScreenshot',{format:'png'},tv);writeFileSync('logs/ch7-story-'+name+'.png',Buffer.from(shot.data,'base64'));}
 async function simulatedVotes(value){await until(()=>evaluate(tv,"!document.getElementById('ch7TestVotes').hidden"),'host test vote control');await evaluate(tv,"document.getElementById('ch7TestVotes').click()");await until(()=>evaluate(tv,"!document.getElementById('ch7TestPanel').hidden && document.querySelectorAll('#ch7TestPanel select').length===10"),'ten simulated assignments');await evaluate(tv,`document.querySelectorAll('#ch7TestPanel select').forEach(s=>s.value='${value}');document.querySelector('#ch7TestPanel button').click()`);await until(async()=>{const s=await state();return s.chapter7.investigation.election?.simulatedVoteCount===10;},'ten test votes stored');}
 async function phoneVote(phone,value){await until(()=>evaluate(phone,"!document.getElementById('mazePhoneVote').hidden"),'private vote controls');await evaluate(phone,`document.getElementById('mazePhoneTarget').value='${value}';document.getElementById('mazePhoneVote').click()`);}
 const active=async suffix=>until(()=>evaluate(tv,`window.__audio.some(a=>!a.paused&&a.src.endsWith('${suffix}'))`),'playing '+suffix);
 async function finish(name,suffix,position){
  await step(name);await active(suffix);await until(async()=>(await state()).chapter7.investigation.audioStartedAt!==null,'persisted native start '+name);
  const p=await evaluate(tv,`(()=>{const a=window.__audio.find(a=>!a.paused&&a.src.endsWith('${suffix}'));return a.currentTime})()`);
  const destination=position??storyRecording(name).durationMs/1000-.35;
  await post('/__test/time',{advanceMs:Math.max(0,(destination-p)*1000)});
  await evaluate(tv,`window.__audio.find(a=>!a.paused&&a.src.endsWith('${suffix}')).currentTime=${destination}`);
 }
 await step('podcast-intro');assert.equal((await state()).chapter7.investigation.theoryVersion,1);
 await active('theories_possession_intro.wav');await pause(2500);await send('Page.reload',{},tv);await active('theories_possession_intro.wav');
 assert(await evaluate(tv,"window.__audio.find(a=>!a.paused&&a.src.endsWith('theories_possession_intro.wav')).currentTime>=2"));
 await until(()=>evaluate(tv,"window.__audioEvents.some(e=>e.type==='ended'&&e.src.endsWith('theories_possession_intro.wav'))"),'full native new introduction',18000);
 report.intro=await evaluate(tv,"window.__audioEvents.filter(e=>e.src.endsWith('theories_possession_intro.wav'))");
 assert(Math.abs(report.intro.at(-1).position-14.475)<.05);assert.equal(report.intro.at(-1).volume,1);
 await step('theory1-transition');await post('/__test/time',{advanceMs:9100});await post('/api/progress');
 await finish('possession','ch7_03_possession.mp3');
 await finish('officer','ch7_04a_police_officer.mp3',PROPHECY_AT_MS/1000+.1);
 await active('ch7_04b_prophecy_whisper.mp3');assert.equal((await state()).chapter7.investigation.step,'officer');
 await send('Page.reload',{},tv);await active('ch7_04b_prophecy_whisper.mp3');
 await finish('reaction','ch7_05_possession_reaction.mp3');
 await step('envelope-transition');await step('incoming');assert(!(await state()).chapter7.investigation.election);
 await step('envelope-instructions');await finish('envelope-instructions','ch7_10_envelope_instructions.wav');
 await step('envelope-vote');await pause(1000);assert.equal((await state()).chapter7.investigation.election.voterCount,12);
 await send('Page.reload',{},tv);await step('envelope-vote');await simulatedVotes('p2');
 await phoneVote(a,'p2');await until(async()=>(await state()).chapter7.investigation.election?.voteCount===11,'first real ballot');
 await phoneVote(b,'p2');await step('retriever-reveal');await step('envelope-waiting');
 await until(()=>evaluate(tv,"!document.getElementById('ch7EnvelopeReturned').hidden"),'host return');
 await evaluate(tv,"document.getElementById('ch7EnvelopeReturned').click()");
 await step('photograph');await active('ch7_09_photograph_revelation.wav');assert(await evaluate(tv,"!document.getElementById('ch7PhotoStage').hidden&&document.getElementById('ch7Enhanced').hidden"));
 await screenshot('possession-only-photo');
 const events=await evaluate(tv,'window.__audioEvents');
 assert(!events.some(e=>/ch7_0[678]_/.test(e.src)),'discarded narration played');
 assert(!events.some(e=>e.src.endsWith('ch7_02_podcast_intro.wav')),'legacy intro played');
 assert(events.some(e=>e.type==='ended'&&e.src.endsWith('ch7_03_possession.mp3')));
 assert(events.some(e=>e.type==='ended'&&e.src.endsWith('ch7_05_possession_reaction.mp3')));
 const final=await state();assert.equal(final.players.length,12);assert(!final.chapter7.investigation.winningTheory);
 for(const phone of [a,b])assert(await evaluate(phone,'window.__audio.every(a=>a.paused)'));
 assert.deepEqual(errors,[]);report.events=events;report.status='PASS';writeFileSync('logs/chapter7-possession-browser-report.json',JSON.stringify(report,null,2));
 console.log('PASS: complete native new intro, refresh, possession/radio/reaction native ends, skipped theories and verdict, unchanged 12-player retrieval, photograph start and silent phones');
}catch(error){writeFileSync('logs/chapter7-possession-browser-failure.json',JSON.stringify({message:error.message,report,errors,serverLog},null,2));throw error;}
finally{ws?.close();browser.kill();server.kill();}
