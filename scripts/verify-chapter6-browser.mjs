// Reproducible local browser flow. Start npm run dev -- --built --automation.
// Requires Chrome (or BROOKWOOD_CHROME) and Node 22+ for native WebSocket.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
const browser=spawn(process.env.BROOKWOOD_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=9336','--user-data-dir='+mkdtempSync(join(tmpdir(),'brookwood-ch6-')),'--no-first-run','--no-default-browser-check','--disable-background-networking','--autoplay-policy=no-user-gesture-required','about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=0;const pending=new Map(),errors=[];
try{
 let version;for(let i=0;i<60;i++){try{version=await (await fetch('http://127.0.0.1:9336/json/version')).json();break;}catch{await pause(100);}}
 if(!version)throw Error('Chrome did not start');
 ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((ok,no)=>{ws.onopen=ok;ws.onerror=no;});
 ws.onmessage=event=>{const j=JSON.parse(event.data);if(j.id){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(Error(j.error.message)):p.resolve(j.result);}else if(j.method==='Runtime.exceptionThrown')errors.push(j.params.exceptionDetails.exception?.description??j.params.exceptionDetails.text);};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const evaluate=async(session,expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},session);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 async function page(path){const context=await send('Target.createBrowserContext');const t=await send('Target.createTarget',{url:'about:blank',browserContextId:context.browserContextId});const a=await send('Target.attachToTarget',{targetId:t.targetId,flatten:true});const session=a.sessionId;await send('Runtime.enable',{},session);await send('Page.enable',{},session);await send('Page.navigate',{url:base+path},session);for(let i=0;i<50;i++){if(await evaluate(session,"document.readyState==='complete'"))break;await pause(100);}return session;}
 async function post(path,body={}){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(path+': '+JSON.stringify(j));return j;}
 const state=async()=>await (await fetch(base+'/api/state')).json();
 async function advance(){const s=await state();assert(s.chapter6.deadline!==null);await post('/__test/time',{advanceMs:Math.max(0,s.chapter6.deadline-s.serverNow)+20});await post('/api/progress');await pause(1500);}
 async function waitStep(step){for(let i=0;i<50;i++){const s=await state();if(s.chapter6.step===step)return s;await pause(100);}throw Error('Expected '+step);}
 mkdirSync('logs',{recursive:true});
 await post('/api/host',{action:'reset',code:'1031'});const a=(await post('/api/join',{name:'Rehearsal Alex'})).player,b=(await post('/api/join',{name:'Rehearsal Emma'})).player;
 await post('/api/player',{...a,action:'partner',partnerId:b.id});await post('/api/host',{action:'test-fill',code:'1031'});await post('/api/host',{action:'chapter-select',checkpoint:'chapter6',code:'1031'});
 const tv=await page('/tv'),phone=await page('/join'),phoneB=await page('/join');
 await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false},tv);
 for(const [tab,auth] of [[phone,a],[phoneB,b]]){await evaluate(tab,`localStorage.setItem('brookwood-player-v3',${JSON.stringify(JSON.stringify(auth))});location.reload()`);}
 await pause(1600);
 async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'png'},tv);writeFileSync('logs/chapter6-'+name+'.png',Buffer.from(r.data,'base64'));}
 let loginCount=0;
 async function hostChoice(text){
  await evaluate(tv,"document.getElementById('chapter6HostToggle').click()");await pause(300);
  if(await evaluate(tv,"!document.getElementById('chapter6HostCode').hidden")){
   assert.equal(loginCount++,0,'Host must authenticate only once, including after TV reload');
   await evaluate(tv,"document.getElementById('chapter6HostCode').value='1031';document.getElementById('chapter6HostLogin').click()");await pause(300);
  }
  assert(await evaluate(tv,"document.getElementById('chapter6HostCode').hidden && document.getElementById('chapter6HostCode').value===''"));
  await evaluate(tv,`(()=>{const b=[...document.querySelectorAll('#chapter6HostAnswers button')].find(x=>x.textContent===${JSON.stringify(text)});if(!b)throw Error('Missing host choice');b.click();})()`);
  await waitStep(text==='Player Returned With Token'?'return':text.startsWith('TEST:')?'vote':'result');await pause(1500);
 }
 async function transition(game){
  await waitStep('transition');
  if(game===0){await send('Page.reload',{},tv);await pause(500);}
  assert.equal(await evaluate(tv,"getComputedStyle(document.getElementById('chapter6Curtain')).opacity"),'1');
  assert(await evaluate(tv,"document.getElementById('chapter6Content').hidden && document.getElementById('chapter6HUD').hidden"));
  assert(await evaluate(phone,"document.getElementById('mazePhoneCopy').textContent.includes('next scene')"));
  await screenshot('transition-'+game);await advance();await waitStep(game===4?'finale':'intro');
 }
 assert(await evaluate(tv,"!document.getElementById('chapter6TV').hidden"));
 assert(await evaluate(phone,"!document.getElementById('mazePhoneBox').classList.contains('hidden')"));
 await screenshot('doors');
 const labels=['Black — IX','The Sixth Sense (1999)','3:45','17 minutes'];
 for(let game=0;game<4;game++){
  if(game===2){const s=await state();const {gate}=await import('../chapter6-timing.js');await post('/__test/time',{advanceMs:s.chapter6.phaseAt+gate(14)+100-s.serverNow});await pause(1500);assert(await evaluate(tv,"!document.getElementById('chapter6Image').hidden && document.getElementById('chapter6Image').src.endsWith('morgue_memory.png')"));assert(!(await evaluate(phone,"document.body.innerHTML.includes('morgue_memory.png')")));await screenshot('memory');}
  await advance();await waitStep('answer');
  if(game===2)assert(await evaluate(tv,"document.getElementById('chapter6Image').hidden"));
  if(game===3)await screenshot('bridge');
  await hostChoice(labels[game]);const s=await state();assert.equal(s.chapter6.results[game].correct,true);assert.equal(s.chapter6.lives,3);await advance();await transition(game);
 }
 await advance();assert.equal((await state()).chapter6.step,'silence');await screenshot('silence');await advance();await waitStep('verdict');
 assert.equal(await evaluate(tv,"document.getElementById('chapter6Question').textContent"),'SILENCE COMPLETE — AWAITING VERDICT');
 assert.equal(await evaluate(tv,"document.getElementById('chapter6Screamer')"),null);await hostChoice('PASS');await advance();await transition(4);
 // Keep both real phones connected as finale transitions into the vote.
 await post('/api/me',a);await post('/api/me',b);await advance();await waitStep('vote');
 await hostChoice('TEST: VOTE SIMULATED PLAYERS (BEFORE REAL BALLOTS)');
 const selected=(await post('/api/me',a)).chapter6.candidates.find(x=>x.name==='Test 1A');assert(selected);
 for(const tab of [phone,phoneB]){await pause(1500);const options=await evaluate(tab,"[...document.getElementById('mazePhoneTarget').options].map(x=>x.textContent)");assert(!options.includes(a.name));await evaluate(tab,`document.getElementById('mazePhoneTarget').value=${JSON.stringify(selected.id)};document.getElementById('mazePhoneVote').click()`);await pause(1600);}
 await waitStep('selected');await advance();await waitStep('waiting');await hostChoice('Player Returned With Token');await advance();await waitStep('complete');
 assert(await evaluate(tv,"document.getElementById('chapter6Content').hidden && document.getElementById('chapter6HUD').hidden && document.getElementById('chapter6Image').hidden && document.getElementById('chapter6Audio').hidden"));
 await send('Page.reload',{},tv);await pause(1700);assert(await evaluate(tv,"document.getElementById('chapter6Content').hidden"));
 assert.deepEqual(errors,[]);console.log('Browser PASS: built TV + two phones → five host answers/verdict → private token votes → return → black completion + refresh. Screenshots in logs/.');
}finally{ws?.close();browser.kill();}
