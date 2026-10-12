// Reproducible local browser flow. Start npm run dev -- --built --automation.
// Requires Chrome (or BROOKWOOD_CHROME) and Node 22+ for native WebSocket.
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000',earlyClose=process.argv.includes('--early-close');
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
 async function page(path){const context=await send('Target.createBrowserContext');const t=await send('Target.createTarget',{url:'about:blank',browserContextId:context.browserContextId});const a=await send('Target.attachToTarget',{targetId:t.targetId,flatten:true});const session=a.sessionId;await send('Runtime.enable',{},session);await send('Page.enable',{},session);await send('Page.addScriptToEvaluateOnNewDocument',{source:`const OriginalAudio=window.Audio;window.Audio=function(...args){const audio=new OriginalAudio(...args);(window.__brookwoodAudio??=[]).push(audio);return audio;};`},session);await send('Page.navigate',{url:base+path},session);for(let i=0;i<50;i++){if(await evaluate(session,"document.readyState==='complete'"))break;await pause(100);}return session;}
 async function post(path,body={}){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(path+': '+JSON.stringify(j));return j;}
 const state=async()=>await (await fetch(base+'/api/state')).json();
 async function advance(){const s=await state();assert(s.chapter6.deadline!==null);await post('/__test/time',{advanceMs:Math.max(0,s.chapter6.deadline-s.serverNow)+20});await post('/api/progress');await pause(1500);if(['intro','result','zero','finale','selected','return'].includes(s.chapter6.step)){for(let i=0;i<60;i++){const finished=await evaluate(tv,"(()=>{const audio=(window.__brookwoodAudio??[]).find(a=>!a.paused&&a.src.includes('/chapter6/'));if(!audio||!Number.isFinite(audio.duration))return false;audio.currentTime=Math.max(0,audio.duration-.05);return true;})()");if(finished)break;await pause(100);}for(let i=0;i<60;i++){if((await state()).chapter6.sequence!==s.chapter6.sequence)break;await pause(100);}assert.notEqual((await state()).chapter6.sequence,s.chapter6.sequence,'Narration ended must advance authenticated persisted scene: '+await evaluate(tv,"JSON.stringify({status:document.getElementById('chapter6Status').textContent,media:(window.__brookwoodAudio??[]).filter(a=>a.src.includes('/chapter6/')).map(a=>({src:a.src.split('/').pop(),paused:a.paused,time:a.currentTime,duration:a.duration,ended:a.ended}))})"));await pause(500);}}
 async function waitStep(step){for(let i=0;i<50;i++){const s=await state();if(s.chapter6.step===step)return s;await pause(100);}throw Error('Expected '+step);}
 mkdirSync('logs',{recursive:true});
 await post('/api/host',{action:'reset',code:'1031'});const a=(await post('/api/join',{name:'Rehearsal Alex'})).player,b=(await post('/api/join',{name:'Rehearsal Emma'})).player;
 await post('/api/player',{...a,action:'partner',partnerId:b.id});for(const auth of [a,b])await post('/api/player',{...auth,action:'ready',ready:true});await post('/api/host',{action:'test-fill',code:'1031'});await post('/api/host',{action:'chapter-select',checkpoint:'chapter6',code:'1031'});
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
  await waitStep(text==='Player Returned With Token'?'return':text.startsWith('TEST:')?'vote':text==='CLOSE VOTING'?'selected':'locked');if(!text.startsWith('TEST:')&&text!=='CLOSE VOTING'&&text!=='Player Returned With Token'){await advance();await waitStep('result');}await pause(1500);
 }
 async function transition(game){
  await waitStep('transition');
  if(game===0){await send('Page.reload',{},tv);await pause(500);}
  for(let i=0;i<25;i++){if(await evaluate(tv,"getComputedStyle(document.getElementById('chapter6Curtain')).opacity==='1'"))break;await pause(100);}
  assert.equal(await evaluate(tv,"getComputedStyle(document.getElementById('chapter6Curtain')).opacity"),'1');
  assert(await evaluate(tv,"document.getElementById('chapter6Content').hidden && document.getElementById('chapter6HUD').hidden"));
  for(let i=0;i<18;i++){if(await evaluate(phone,"document.getElementById('mazePhoneCopy').textContent.includes('next scene')"))break;await pause(100);}
  assert(await evaluate(phone,"document.getElementById('mazePhoneCopy').textContent.includes('next scene')"));
  await screenshot('transition-'+game);await advance();await waitStep(game===4?'gameover':'intro');if(game===4){await screenshot('gameover');await advance();await waitStep('finale');}
 }
 assert(await evaluate(tv,"!document.getElementById('chapter6TV').hidden"));
 assert(await evaluate(phone,"!document.getElementById('mazePhoneBox').classList.contains('hidden')"));
 if((await state()).chapter6.step==='takeover')await advance();await evaluate(tv,"document.getElementById('chapter6HostToggle').click()");await pause(300);await evaluate(tv,"document.getElementById('chapter6HostCode').value='1031';document.getElementById('chapter6HostLogin').click()");await pause(300);loginCount=1;await evaluate(tv,"document.getElementById('chapter6HostClose').click()");await screenshot('doors');
 const labels=earlyClose?['Red — XIII','The Exorcist (1973)','3:15','17 minutes']:['Black — IX','The Sixth Sense (1999)','3:45','17 minutes'];
 for(let game=0;game<4;game++){
  if(game===2){await advance();await waitStep('exposure');assert(await evaluate(tv,"!document.getElementById('chapter6Image').hidden && document.getElementById('chapter6Image').src.endsWith('morgue_memory.png')"));assert(!(await evaluate(phone,"document.body.innerHTML.includes('morgue_memory.png')")));await screenshot('memory');await advance();}
  while((await state()).chapter6.step!=='answer')await advance();await waitStep('answer');
  if(game===0){const order=(await state()).chapter6.doorOrder;
   const rendered=()=>evaluate(tv,"[...document.querySelectorAll('#chapter6Doors img')].map(img=>img.src.split('/').pop().replace('_door.png',''))");assert.deepEqual(await rendered(),order);assert.notDeepEqual(order,['red','blue','green','black']);await screenshot('shuffled-doors');await send('Page.reload',{},tv);await pause(1700);assert.deepEqual(await rendered(),order);assert.deepEqual((await state()).chapter6.doorOrder,order);
  }
  if(game===1)await screenshot('boxoffice-question');if(game===2){assert(await evaluate(tv,"document.getElementById('chapter6Image').hidden"));await screenshot('memory-question');}
  if(game===3)await screenshot('bridge');
  await hostChoice(labels[game]);const s=await state();assert.equal(s.chapter6.results[game].correct,!earlyClose||game===3);assert.equal(s.chapter6.lives,earlyClose?Math.max(0,2-game):3);await screenshot('result-'+game);await advance();
  if((await state()).chapter6.step==='zero'){assert(earlyClose&&game===2);assert(await evaluate(tv,"!document.getElementById('chapter6Waveform').hidden && document.getElementById('chapter6Image').hidden"));await screenshot('zero-lives');await advance();}
  await transition(game);
 }
 while((await state()).chapter6.step!=='silence')await advance();assert.equal((await state()).chapter6.step,'silence');await screenshot('silence');
 for(const [offset,number] of [[12000,23],[26000,24],[40000,25]]){const s=await state();await post('/__test/time',{advanceMs:Math.max(0,s.chapter6.phaseAt+offset-s.serverNow)});await pause(1500);const file='ch6_'+number+'_';assert(await evaluate(tv,`(window.__brookwoodAudio??[]).filter(a=>!a.paused&&a.src.includes('/chapter6/')).length===1`));assert(await evaluate(tv,`(()=>{const a=(window.__brookwoodAudio??[]).find(a=>!a.paused&&a.src.includes(${JSON.stringify(file)}));if(!a)return false;a.currentTime=a.duration-.05;return true;})()`));await pause(250);}
 await advance();await waitStep('verdict');
 assert.equal(await evaluate(tv,"document.getElementById('chapter6Question').textContent"),'SILENCE COMPLETE — AWAITING VERDICT');
 assert.equal(await evaluate(tv,"document.getElementById('chapter6Screamer')"),null);await hostChoice(earlyClose?'FAIL':'PASS');if(earlyClose){assert(await evaluate(tv,"!document.getElementById('chapter6Image').hidden && document.getElementById('chapter6Image').src.endsWith('silence_jumpscare.png')"));await screenshot('silence-failure');}await advance();await transition(4);
 // Keep both real phones connected as finale transitions into the vote.
 await post('/api/me',a);await post('/api/me',b);await advance();await waitStep('vote');
 await hostChoice('TEST: VOTE SIMULATED PLAYERS (BEFORE REAL BALLOTS)');
 const selected=(await post('/api/me',a)).chapter6.candidates.find(x=>x.name==='Test 1A');assert(selected);
 for(const [index,tab] of [phone,phoneB].entries()){await pause(1500);const options=await evaluate(tab,"[...document.getElementById('mazePhoneTarget').options].map(x=>x.textContent)");assert(!options.includes(a.name));await evaluate(tab,`document.getElementById('mazePhoneTarget').value=${JSON.stringify(selected.id)};document.getElementById('mazePhoneVote').click()`);await pause(1600);
  if(index===0){const partial=await state();assert.equal(partial.chapter6.step,'vote');assert.equal(partial.chapter6.voteCount,11);assert.equal(partial.chapter6.voterCount,12);assert.equal(partial.chapter6.selectedPlayer,null);await screenshot('pending-vote');await send('Page.reload',{},phone);await pause(1600);assert.equal((await state()).chapter6.voteCount,11);assert.equal((await state()).chapter6.step,'vote');
   if(earlyClose){await hostChoice('CLOSE VOTING');assert.equal((await state()).chapter6.voteCount,11);break;}
  }
 }
 await waitStep('selected');await advance();await waitStep('waiting');await hostChoice('Player Returned With Token');await advance();await waitStep('complete');
 assert(await evaluate(tv,"document.getElementById('chapter6Content').hidden && document.getElementById('chapter6HUD').hidden && document.getElementById('chapter6Image').hidden && document.getElementById('chapter6Audio').hidden"));
 await send('Page.reload',{},tv);await pause(1700);assert(await evaluate(tv,"document.getElementById('chapter6Content').hidden"));
 async function navigateChapter(checkpoint,code='1031'){
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'C',code:'KeyC',windowsVirtualKeyCode:67,modifiers:10},tv);
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'C',code:'KeyC',windowsVirtualKeyCode:67,modifiers:0},tv);await pause(150);
  assert(await evaluate(tv,"!document.getElementById('chapterSelectPanel').hidden && document.elementFromPoint(innerWidth/2,innerHeight/2).closest('#chapterSelectPanel')!==null"),'Existing navigation must be visible above Chapter 6');
  assert(await evaluate(tv,"[...document.getElementById('chapterSelectCheckpoint').options].some(option=>option.value==='chapter6')"));
  await evaluate(tv,`document.getElementById('chapterSelectCheckpoint').value=${JSON.stringify(checkpoint)};document.getElementById('chapterSelectCode').value=${JSON.stringify(code)};document.getElementById('chapterSelectSubmit').click()`);await pause(1500);
  if(code==='1031')assert(await evaluate(tv,"document.getElementById('chapterSelectPanel').hidden"),await evaluate(tv,"document.getElementById('chapterSelectError').textContent"));
 }
 const completed=await state();await navigateChapter('chapter1','wrong-pin');
 assert.equal((await state()).chapter6.startedAt,completed.chapter6.startedAt);assert(await evaluate(tv,"!document.getElementById('chapterSelectPanel').hidden && document.getElementById('chapterSelectError').textContent.length>0"));
 await evaluate(tv,"closeChapterSelect()");await navigateChapter('chapter1');
 assert.equal((await state()).phase,'opening');assert(!(await state()).chapter6);assert(await evaluate(tv,"document.getElementById('chapter6TV').hidden"));
 await send('Page.reload',{},tv);await pause(1600);assert(await evaluate(tv,"document.getElementById('chapter6TV').hidden"));
 await navigateChapter('chapter6');const fresh=await state();assert.equal(fresh.chapter6.lives,3);assert.equal(fresh.chapter6.step,'takeover');assert.equal(fresh.chapter6.results.length,0);assert.notEqual(fresh.generation,completed.generation);
 assert.equal(fresh.chapter6.screamer.id,fresh.players[0].id);assert.equal(fresh.chapter6.macheteId,fresh.players[0].id);
 await send('Page.reload',{},tv);await pause(1600);assert(await evaluate(tv,"!document.getElementById('chapter6TV').hidden"));assert.equal((await state()).chapter6.startedAt,fresh.chapter6.startedAt);
 const castBefore=(await state()).chapter6.screamer;await navigateChapter('chapter5-finale');assert.equal((await state()).phase,'chapter5-finale');assert.equal((await state()).chapter5.winners.length,6);assert.equal((await state()).chapter5.winners[0].player.id,castBefore.id);await send('Page.reload',{},tv);await pause(1600);assert(await evaluate(tv,"!document.getElementById('chapter5TV').hidden"));await navigateChapter('chapter6');
 const finalFresh=await state();
 const denied=await fetch(base+'/api/host',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chapter-select',checkpoint:'chapter1',...a})});assert.equal(denied.status,403);assert.equal((await state()).generation,finalFresh.generation);
 assert.deepEqual(errors,[]);console.log('Browser PASS: built TV + two phones → five host answers/verdict → private token votes → return → black completion + refresh. Screenshots in logs/.');
 console.log('Voting PASS: first real vote remains pending at 11/12; refresh preserves ballots; '+(earlyClose?'authenticated early close':'all ballots automatic completion'));
 console.log('Navigation PASS: real Ctrl+Shift+C above maze → wrong PIN rejected → Chapter 1 → refresh → Chapter 6 fresh state → refresh; ordinary player denied.');
}finally{ws?.close();browser.kill();}
