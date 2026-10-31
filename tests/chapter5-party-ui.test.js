import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {installCastControls} from '../chapter5-controls.js';
const flush=()=>new Promise(r=>setImmediate(r));
function setup(request){const nodes=new Map(),document={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:true,value:'',textContent:'',disabled:false,addEventListener(){},focus(){}});return nodes.get(id);}};let latest;
 const controls=installCastControls({document,request,acceptState:s=>{latest=s;controls.update(s);},now:()=>1});return {controls,node:id=>document.getElementById(id),latest:()=>latest};}
const waiting={generation:'review',phase:'chapter5-waiting',chapter5:{startedAt:1000,round:{votingActive:false}}};
test('READY is hidden for nonhosts; login uses existing session and duplicate ready clicks send one existing action',async()=>{
 let authorized=false,release;const calls=[];const e=setup(async(url,body)=>{calls.push(body);if(body.action==='maze-session'&&!authorized)throw Object.assign(Error('Host authentication required'),{status:403});if(body.action==='maze-login'){authorized=true;return {authenticated:true};}if(body.action==='casting-ready'){await new Promise(r=>release=r);return {state:{...waiting,phase:'chapter5-rules'}};}return {};});
 e.controls.update(waiting);await flush();assert(e.node('chapter5ReadyButton').hidden);await e.controls.ready();assert.equal(calls.filter(c=>c.action==='casting-ready').length,0);
 e.node('chapter5HostCode').value='entered-by-host';await e.node('chapter5HostLogin').onclick();assert(!e.node('chapter5ReadyButton').hidden);assert.equal(e.node('chapter5HostCode').value,'');
 const first=e.controls.ready(),second=e.controls.ready();assert(e.node('chapter5ReadyButton').disabled);assert.equal(calls.filter(c=>c.action==='casting-ready').length,1);release();await Promise.all([first,second]);assert.equal(e.latest().phase,'chapter5-rules');assert(e.node('chapter5ReadyButton').hidden);
});
test('valid session restores READY without a PIN and late authentication cannot revive controls after navigation',async()=>{
 let finish;const e=setup(()=>new Promise(r=>finish=r));e.controls.update(waiting);e.controls.update({...waiting,phase:'lobby',chapter5:null});finish({authenticated:true});await flush();assert(e.node('chapter5ReadyButton').hidden);
 const yes=setup(async()=>({authenticated:true}));yes.controls.update(waiting);await flush();assert(!yes.node('chapter5ReadyButton').hidden);yes.controls.update(waiting);assert(!yes.node('chapter5ReadyButton').hidden);
 yes.controls.update({...waiting,phase:'chapter5-casting',chapter5:{...waiting.chapter5,round:{votingActive:true}}});assert(yes.node('chapter5ReadyButton').hidden);assert(yes.node('chapter5Host').hidden);yes.node('chapter5HostToggle').onclick();assert(!yes.node('chapter5Host').hidden);
});
test('cast presentation keeps original card assets, removes round counter, and deals on the canonical clock',()=>{
 const html=fs.readFileSync('tv.html','utf8'),source=fs.readFileSync('chapter5.js','utf8'),css=fs.readFileSync('chapter5.css','utf8');
 assert(!html.includes('id="chapter5-roundProgress"'));assert(!source.includes("'ROUND '"));assert(html.includes('Who would be perfect for that role?'));assert(!source.includes("?'WAITING FOR THE HOST'"));
 for(const name of ['01-the-screamer.png','02-the-terrible-decision-make.png','03-the-tripper.png','04-the-denier.png','05-the-sacrifice.png','06-the-killer.png'])assert(html.includes('/assets/chapter5/'+name));
 assert(source.includes('--cast-deal-clock'));assert(css.includes('animation-play-state:paused'));assert(css.includes('prefers-reduced-motion'));assert(css.includes('background:#000'));
});
