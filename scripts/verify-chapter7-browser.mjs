// One local, real-time playback rehearsal. Native media is never accelerated.
// Starts the existing isolated-memory dev server at the Chapter 6 ending.
// Requires Chrome and Node 22+; never connects to production Redis.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3077',debug='http://127.0.0.1:9337',pause=ms=>new Promise(r=>setTimeout(r,ms));
mkdirSync('logs',{recursive:true});
const serverSource=readFileSync('scripts/dev.mjs','utf8').replace("const nativeFetch=global.fetch;let raw=null,timeOffset=0;","import {finalNarrationFixture} from '../tests/chapter7-fixture.js';\nconst nativeFetch=global.fetch;let raw=JSON.stringify(finalNarrationFixture(Date.now()+6000)),timeOffset=0;");
assert(serverSource.includes('raw=JSON.stringify(finalNarrationFixture'));
writeFileSync('logs/chapter7-rehearsal-server.mjs',serverSource);
const server=spawn(process.execPath,['logs/chapter7-rehearsal-server.mjs'],{env:{...process.env,PORT:'3077'},windowsHide:true,stdio:['ignore','pipe','pipe']});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
const browser=spawn(process.env.BROOKWOOD_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9337','--user-data-dir='+mkdtempSync(join(tmpdir(),'brookwood-ch7-')),'--no-first-run','--no-default-browser-check','--disable-background-networking','--autoplay-policy=no-user-gesture-required','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,id=0;const pending=new Map(),errors=[],report={};
try{
 let version;for(let i=0;i<80;i++){try{version=await(await fetch(debug+'/json/version')).json();await fetch(base+'/api/state');break;}catch{await pause(100);}}
 assert(version,'Chrome did not start');ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
 ws.onmessage=event=>{const j=JSON.parse(event.data);if(j.id){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(Error(j.error.message)):p.resolve(j.result);}else if(j.method==='Runtime.exceptionThrown')errors.push(j.params.exceptionDetails.exception?.description??j.params.exceptionDetails.text);};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const evaluate=async(session,expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},session);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const state=async()=>await(await fetch(base+'/api/state')).json();
 async function until(check,label,timeout=12000){const start=Date.now();while(Date.now()-start<timeout){const result=await check();if(result)return result;await pause(100);}throw Error('Timed out: '+label+'\n'+serverLog);}
 const instrument=`const OriginalAudio=window.Audio;window.Audio=function(...args){const a=new OriginalAudio(...args);(window.__audio??=[]).push(a);for(const type of ['playing','ended'])a.addEventListener(type,()=>{(window.__audioEvents??=[]).push({type,src:a.src,at:Date.now()});});return a;};window.__videoEvents=[];document.addEventListener('playing',e=>{if(e.target.tagName!=='VIDEO')return;window.__videoEvents.push({type:'playing',at:Date.now(),position:e.target.currentTime});if(!window.__analyser){const ctx=new AudioContext(),source=ctx.createMediaElementSource(e.target),analyser=ctx.createAnalyser();source.connect(analyser);analyser.connect(ctx.destination);ctx.resume();window.__analyser=analyser;window.__audioPeak=0;setInterval(()=>{const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);window.__audioPeak=Math.max(window.__audioPeak,...data.map(Math.abs));},100);}},true);document.addEventListener('ended',e=>{if(e.target.tagName==='VIDEO')window.__videoEvents.push({type:'ended',at:Date.now(),position:e.target.currentTime});},true);`;
 async function page(path,phoneId){const context=await send('Target.createBrowserContext'),target=await send('Target.createTarget',{url:'about:blank',browserContextId:context.browserContextId}),attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true}),session=attached.sessionId;await send('Runtime.enable',{},session);await send('Page.enable',{},session);await send('Page.addScriptToEvaluateOnNewDocument',{source:instrument+(phoneId?`localStorage.setItem('brookwood-player-v3',JSON.stringify({id:'${phoneId}',token:'t${phoneId.slice(1)}'}));`:'')},session);await send('Page.navigate',{url:base+path},session);await until(()=>evaluate(session,"document.readyState==='complete'"),'page loaded');return session;}
 const tv=await page('/tv');await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false},tv);
 await evaluate(tv,"lobbyRequest('/api/host',{action:'maze-login',code:'1031'})");
 const phone=await page('/join','p0'),phoneB=await page('/join','p1');
 await until(()=>evaluate(tv,"(window.__audio??[]).some(a=>a.src.endsWith('ch6_31_token_return.mp3')&&!a.paused)"),'final narration playing');
 assert(await evaluate(tv,"!document.getElementById('chapter6Waveform').hidden && document.getElementById('chapter7TV').hidden"));
 console.log('Chapter 6 final waveform narration playing naturally; waiting for native completion.');
 const before=await state();
 await until(async()=>{const s=await state();return s.phase==='chapter7'&&s;},'Chapter 7 blackout',47000);
 const blackout=await state();assert.equal(blackout.chapter7.step,'blackout');assert.equal(blackout.chapter7.playbackStartedAt,null);
 const finalAudio=await evaluate(tv,"window.__audioEvents.find(e=>e.type==='ended'&&e.src.endsWith('ch6_31_token_return.mp3'))");assert(finalAudio,'Recording 31 must end naturally');
 assert(await evaluate(tv,"getComputedStyle(document.getElementById('chapter7Video')).opacity==='0' && document.getElementById('chapter6TV').hidden"));
 await until(async()=>{const s=await state();return s.chapter7?.step==='playing'&&s;},'broadcast playing',12000);
 const playing=await state();report.blackoutMs=playing.chapter7.playbackStartedAt-blackout.chapter7.startedAt;assert(report.blackoutMs>=3000);assert(report.blackoutMs<4500);report.finalNarrationEndedAt=finalAudio.at;
 assert(playing.chapter7.playbackStartedAt>=finalAudio.at+3000);
 const media=await evaluate(tv,"(()=>{const v=document.getElementById('chapter7Video'),r=v.getBoundingClientRect();return {src:new URL(v.currentSrc).pathname,duration:v.duration,width:v.videoWidth,height:v.videoHeight,muted:v.muted,volume:v.volume,paused:v.paused,fit:getComputedStyle(v).objectFit,rect:{width:r.width,height:r.height},legacyPlaying:(window.__audio??[]).filter(a=>!a.paused).map(a=>a.src),buttonHidden:document.getElementById('chapter7Play').hidden};})()");
 assert.equal(media.src,'/assets/chapter7/ch7_breaking_news.mp4');assert(Math.abs(media.duration-51.223)<.1);assert.equal(media.width,1280);assert.equal(media.height,720);assert.equal(media.fit,'contain');assert.equal(media.rect.width,1920);assert.equal(media.rect.height,1080);assert.equal(media.muted,false);assert.equal(media.volume,1);assert.equal(media.paused,false);assert.deepEqual(media.legacyPlaying,[]);assert(media.buttonHidden);report.media=media;
 for(const p of [phone,phoneB]){await until(()=>evaluate(p,"document.getElementById('mazePhoneCopy').textContent==='Watch the TV.'"),'phone Chapter 7');assert(await evaluate(p,"document.querySelectorAll('video').length===0 && (window.__audio??[]).every(a=>a.paused)"));}
 console.log('Broadcast loaded: 1280×720, original audio, full viewport with contain; blackout '+report.blackoutMs+' ms; phones synchronized and silent.');
 await pause(6000);const shot=await send('Page.captureScreenshot',{format:'png'},tv);writeFileSync('logs/chapter7-broadcast.png',Buffer.from(shot.data,'base64'));
 await until(()=>evaluate(tv,"(window.__audioPeak??0)>.001"),'embedded audio signal');report.audioPeak=await evaluate(tv,'window.__audioPeak');
 await until(async()=>{const s=await state();return s.chapter7?.step==='waiting'&&s;},'full playback and black waiting',60000);
 const complete=await state();report.videoEvents=await evaluate(tv,'window.__videoEvents');assert.equal(report.videoEvents.filter(e=>e.type==='playing').length,1);assert.equal(report.videoEvents.filter(e=>e.type==='ended').length,1);report.playbackMs=report.videoEvents[1].at-report.videoEvents[0].at;assert(report.playbackMs>=51000);
 assert(await evaluate(tv,"document.getElementById('chapter7Video').paused && getComputedStyle(document.getElementById('chapter7Video')).opacity==='0' && document.getElementById('chapter7Play').hidden && document.getElementById('chapter7Error').hidden"));
 const black=await send('Page.captureScreenshot',{format:'png'},tv);writeFileSync('logs/chapter7-black.png',Buffer.from(black.data,'base64'));
 await send('Page.reload',{},tv);await pause(1600);assert.equal((await state()).chapter7.id,complete.chapter7.id);assert(await evaluate(tv,"document.getElementById('chapter7Video').paused && !document.getElementById('chapter7Video').currentSrc"));
 console.log('Full native playback ended after '+report.playbackMs+' ms; embedded audio signal verified; stable black survives refresh.');
 async function checkpoint(value){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'C',code:'KeyC',modifiers:10},tv);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'C',code:'KeyC',modifiers:10},tv);await until(()=>evaluate(tv,"!document.getElementById('chapterSelectPanel').hidden && document.getElementById('chapterSelectCode').hidden"),'authenticated checkpoint selector');await evaluate(tv,`document.getElementById('chapterSelectCheckpoint').value='${value}';document.getElementById('chapterSelectCheckpoint').dispatchEvent(new Event('change'));document.getElementById('chapterSelectSubmit').click()`);await until(()=>evaluate(tv,"document.getElementById('chapterSelectPanel').hidden"),'checkpoint selected');}
 await checkpoint('chapter7');await until(()=>evaluate(tv,"document.getElementById('chapter7Video').currentTime>2"),'direct broadcast checkpoint');
 const priorRefresh=await state();await send('Page.reload',{},tv);await until(()=>evaluate(tv,"document.getElementById('chapter7Video').currentTime>2 && !document.getElementById('chapter7Video').paused"),'broadcast refresh recovery');const afterRefresh=await state();assert.equal(afterRefresh.chapter7.id,priorRefresh.chapter7.id);assert.equal(afterRefresh.chapter7.playbackStartedAt,priorRefresh.chapter7.playbackStartedAt);report.refreshPosition=await evaluate(tv,"document.getElementById('chapter7Video').currentTime");
 await checkpoint('chapter7-after');assert.equal((await state()).chapter7.step,'waiting');assert(await evaluate(tv,"document.getElementById('chapter7Video').paused && getComputedStyle(document.getElementById('chapter7Video')).opacity==='0'"));
 // Both explicit checkpoints preserve the original saved cast, votes and lives.
 const after=await state();assert.deepEqual(after.players,before.players);for(const p of [phone,phoneB])assert(await evaluate(p,"document.querySelectorAll('video').length===0 && (window.__audio??[]).every(a=>a.paused)"));
 assert.deepEqual(errors,[]);report.exceptions=errors;report.status='PASS';report.phones=2;report.checkedAt=new Date().toISOString();writeFileSync('logs/chapter7-browser-report.json',JSON.stringify(report,null,2));
 console.log('Browser PASS: native Chapter 6 ending → three-second black → complete real MP4/audio → fade/black; refresh recovery; both cookie-authenticated checkpoints; TV + two silent phones; no runtime exceptions.');
}catch(error){writeFileSync('logs/chapter7-browser-failure.json',JSON.stringify({message:error.message,errors,serverLog,report},null,2));throw error;}
finally{ws?.close();browser.kill();server.kill();writeFileSync('logs/chapter7-rehearsal-server.log',serverLog);}
