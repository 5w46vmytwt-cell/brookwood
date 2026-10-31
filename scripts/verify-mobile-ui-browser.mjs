// Actual player page, local fixture responses only. No production/session mutations.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import assert from 'node:assert/strict';
const base='http://127.0.0.1:3091',debug='http://127.0.0.1:9351',out='logs/mobile-ui';mkdirSync(out,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['scripts/dev.mjs'],{env:{...process.env,PORT:'3091'},windowsHide:true,stdio:'ignore'});
const browser=spawn(process.env.BROOKWOOD_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--mute-audio','--remote-debugging-port=9351','--user-data-dir='+mkdtempSync(join(tmpdir(),'brookwood-mobile-')),'--no-first-run','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws,id=0;const pending=new Map(),errors=[],report=[];
try{
 let version;for(let i=0;i<100;i++){try{version=await(await fetch(debug+'/json/version')).json();if((await fetch(base+'/join')).ok)break;}catch{}await pause(100);}assert(version);
 ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 ws.onmessage=e=>{const j=JSON.parse(e.data);if(j.id){const p=pending.get(j.id);pending.delete(j.id);j.error?p.reject(Error(j.error.message)):p.resolve(j.result);}else if(j.method==='Runtime.exceptionThrown')errors.push(j.params.exceptionDetails.exception?.description??j.params.exceptionDetails.text);};
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
 const target=await send('Target.createTarget',{url:'about:blank'}),{sessionId:s}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},s);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 await send('Page.enable',{},s);await send('Runtime.enable',{},s);
 const setup=`(()=>{
  window.__calls=[];window.__failure=false;window.__rejectVote=false;
  window.__base=()=>({phase:'lobby',generation:crypto.randomUUID(),serverNow:Date.now(),player:{id:'review-player',name:'Alex Morgan',partner:'Jamie',partnerId:'review-partner',inventory:[],ready:false},others:[{id:'review-partner',name:'Jamie'},{id:'other',name:'Taylor'},{id:'long',name:'Avery with a wonderfully long display name'}]});
  window.__state=__base();const native=window.fetch;
  window.fetch=async(url,options)=>{
   if(!String(url).startsWith('/api/'))return native(url,options);
   const body=options?.body?JSON.parse(options.body):{};__calls.push({url,action:body.action});
   if(__failure)throw new TypeError('Fixture offline');
   if(url==='/api/join')return new Response(JSON.stringify({player:{id:'review-player',token:'local-ui-fixture'}}),{status:200});
   if(url==='/api/player'){
    if(window.__actionGate)await window.__actionGate;
    if(__rejectVote)return new Response(JSON.stringify({error:'Please choose an eligible player and try again.'}),{status:400});
    if(body.action==='door-vote')__state.chapter4.voted=true;
    if(body.action==='ready')__state.player.ready=body.ready;
    if(body.action==='partner'){__state.player.partnerId=body.partnerId;__state.player.partner='Jamie';}
   }
   return new Response(JSON.stringify({...__state,serverNow:Date.now()}),{status:200});
  };
 })();`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:setup},s);
 const until=async(expression,label)=>{for(let n=0;n<70;n++){if(await evaluate(expression))return;await pause(80);}throw Error('Timed out: '+label);};
 const snapshot=async(name,width)=>{
  await pause(230);
  const layout=await evaluate(`(()=>{const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden';const controls=[...document.querySelectorAll('button,input,select')].filter(visible);return {width:innerWidth,scroll:document.documentElement.scrollWidth,controls:controls.map(n=>({id:n.id,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})),overflow:[...document.querySelectorAll('.panel,button,input,select,.app-header-inner,.app-footer-inner')].filter(visible).filter(n=>n.getBoundingClientRect().right>innerWidth+1||n.getBoundingClientRect().left< -1).map(n=>n.id||n.className),audio:document.querySelectorAll('audio,video').length};})()`);
  assert(layout.scroll<=layout.width,name+' horizontal overflow');assert.deepEqual(layout.overflow,[],name+' clipped controls');assert(layout.controls.every(c=>c.height>=44),name+' touch targets');assert.equal(layout.audio,0);
  const shot=await send('Page.captureScreenshot',{format:'png'},s);writeFileSync(`${out}/${width}-${name}.png`,Buffer.from(shot.data,'base64'));report.push({name,...layout});
 };
 const state=async expression=>{await evaluate(`window.__state=(()=>{const j=__base();${expression};return j;})()`);await pause(1550);};
 for(const [width,height,label] of [[390,844,'iphone'],[412,915,'android'],[320,640,'small']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true},s);
  await evaluate("try{localStorage.removeItem('brookwood-player-v3')}catch{}");
  await send('Page.navigate',{url:base+'/join'},s);await until("document.readyState==='complete'&&typeof joinGame==='function'",'player assets');
  await snapshot('welcome',width);
  await evaluate("document.getElementById('name').value='Alex Morgan';joinGame()");await until("!document.getElementById('playerBox').classList.contains('hidden')&&document.getElementById('playerName').textContent==='Alex Morgan'",'joined');
  await snapshot('lobby',width);
  await state("j.player.partner=null;j.player.partnerId=null");
  const rect=await evaluate("(()=>{const r=document.getElementById('partner').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect},s);await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect},s);await snapshot('dropdown-open',width);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40},s);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13},s);
  assert(await evaluate("!!document.getElementById('partner').value"),'native dropdown selection');await evaluate('choosePartner()');await until("document.getElementById('partnerControls').classList.contains('hidden')",'paired');
  await state("j.phase='door-vote';j.chapter4={startedAt:4000000,active:true,votingActivatedAt:4114474,voted:false,complete:false,voteCount:3}");await until("!document.getElementById('voteBox').classList.contains('hidden')",'vote');
  await evaluate("const select=document.getElementById('voteTarget');select.value='other';select.dispatchEvent(new Event('change',{bubbles:true}));");await snapshot('voting-selected',width);
  assert(await evaluate("document.getElementById('voteTargetHint').textContent==='Selected · not submitted'&&!document.getElementById('voteTargetHint').hidden"));
  await evaluate('window.__rejectVote=true;castDoorVote()');await until("!!document.getElementById('voteErr').textContent",'vote failure');await snapshot('vote-error',width);assert.equal(await evaluate('__state.chapter4.voted'),false);
  await evaluate("window.__rejectVote=false;window.__actionGate=new Promise(r=>window.__releaseAction=r);document.getElementById('voteTarget').value='other';void castDoorVote()");await snapshot('voting-submitting',width);assert.equal(await evaluate('__state.chapter4.voted'),false);assert(await evaluate("document.getElementById('voteSubmit').disabled"));
  await evaluate('window.__releaseAction();window.__actionGate=null');await until("document.getElementById('voteTitle').textContent==='VOTE RECORDED'",'confirmed');await snapshot('voting-confirmed',width);
  await state("j.phase='private-messages';j.chapter3={startedAt:Date.now()-20000,openedAt:Date.now()-1000,readAt:null,assignment:{title:'KEEP THIS TO YOURSELF',body:'You notice something unusual. Keep this message private until the narrator tells you what to do.'}};j.photo={confirmed:true,confirmedCount:12,complete:true}");
  await until("!!document.getElementById('privateBody').textContent",'private message');await snapshot('message',width);
  await state("j.phase='photo';j.photo={confirmed:false,confirmedCount:7,complete:false}");await snapshot('photo-confirmation',width);
  await state("j.phase='chapter5-casting';j.chapter5={startedAt:5000000,navigationId:'ui-cast',roundIndex:0,winners:[],round:{id:'screamer',title:'THE SCREAMER',setup:'Choose the friend whose scream will wake the whole house.',question:'Who is THE SCREAMER?',votingActive:true,voted:false,voteCount:5}};");await snapshot('casting',width);
  await state("j.phase='chapter6';j.chapter6={startedAt:6000000,sequence:1,step:'vote',lives:2,canVote:true,voted:false,voteCount:4,voterCount:12,candidates:j.others}");await snapshot('maze-vote',width);
  await state("j.phase='chapter7';j.chapter7={id:'ui-investigation',sequence:1,investigation:{id:'ui-theory',sequence:1,step:'theory-vote',election:{id:'ui-election',key:'theory',canVote:true,voted:false,voteCount:6,voterCount:12,candidates:[{id:'possession',name:'POSSESSION',description:'A long theory description retained exactly as supplied by the existing game renderer, fully readable before submitting your vote.'},{id:'premeditation',name:'PREMEDITATION'},{id:'accomplice',name:'ACCOMPLICE'}]}}}");
  await evaluate("document.getElementById('mazePhoneTarget').value='possession';document.getElementById('mazePhoneTarget').dispatchEvent(new Event('change',{bubbles:true}))");await snapshot('theory-vote',width);assert(await evaluate("!document.getElementById('mazePhoneTargetDetail').hidden"));
  await state("j.phase='chapter7';j.chapter7={id:'ui-envelope',sequence:1,investigation:{id:'ui-retriever',sequence:1,step:'envelope-vote',election:{id:'ui-envelope-election',key:'envelope',canVote:true,voted:false,voteCount:3,voterCount:12,candidates:j.others}}}");await snapshot('envelope-vote',width);
  await state("j.phase='chapter8';j.chapter8={id:'ui-finale',sequence:1}");await until("document.getElementById('mazePhoneTitle').textContent==='THE INVESTIGATION CONTINUES'",'Chapter 8 waiting');await snapshot('waiting',width);
  await evaluate("window.__failure=true");await until("document.getElementById('mobileConnectionText').textContent==='Reconnecting'",'reconnection');await snapshot('reconnecting',width);
  await evaluate("window.__failure=false");await until("document.getElementById('mobileConnectionText').textContent==='Online'",'recovered');
  await state("j.phase='opening'");await snapshot('opening-wait',width);
  await send('Page.reload',{},s);await until("document.readyState==='complete'&&document.getElementById('playerName')?.textContent==='Alex Morgan'",'restored session after refresh');assert.equal(await evaluate("__calls.filter(c=>c.url==='/api/join').length"),0,'refresh must not rejoin');
  console.log('PASS: '+label+' '+width+'×'+height+' join, native picker, pairing, vote selection/error/confirmation, message, wait and reconnect');
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},s);
 assert.equal(await evaluate("getComputedStyle(document.getElementById('playerBox')).animationName"),'none');
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true},s);await snapshot('landscape',844);
 assert.deepEqual(errors,[]);writeFileSync(out+'/report.json',JSON.stringify({report,errors,reducedMotion:true,source:'actual join page; isolated fixture API responses'},null,2));
 console.log('PASS: landscape, reduced motion, no horizontal overflow, 44px+ controls, no phone media or browser exceptions');
}catch(error){console.error(error);process.exitCode=1;}finally{ws?.close();browser.kill();server.kill();}
