import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Chapter6View} from '../chapter6.js';
import {gate,phaseCues,transitionVisual} from '../chapter6-timing.js';
function harness(){
 const nodes=new Map(),created=[];
 const make=()=>({hidden:false,style:{},classList:{values:new Set(),toggle(name,on){on?this.values.add(name):this.values.delete(name);},contains(name){return this.values.has(name);}},children:[],getAttribute(key){return this[key];},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);},createElement(){const node=make();created.push(node);return node;}};
 class Player{constructor(){this.media=new Map();}stop(){}update(){} }
 let elapsed=0;const view=new Chapter6View(document,Player,{elapsedNow:()=>elapsed});
 const c={startedAt:1000,phaseAt:1000,sequence:0,game:2,step:'intro',lives:3,results:[],screamer:{name:'Actual Guest'}};
 const paint=t=>{elapsed=t;view.update({chapter6:c});};
 return {document,created,c,paint};
}
test('TV reconstructs exact memory exposure and hides it permanently during question/result',()=>{
 const {document,created,c,paint}=harness(),image=document.getElementById('chapter6Image');
 paint(gate(14)-1);assert(image.hidden);
 assert.equal(created.filter(n=>n.src?.endsWith('.png')).length,11);
 paint(gate(14));assert(!image.hidden);assert(image.src.endsWith('morgue_memory.png'));
 paint(gate(14)+14999);assert(!image.hidden);
 paint(gate(14)+15000);assert(image.hidden);
 c.step='answer';c.sequence++;c.deadline=200000;paint(gate(14)+15001);assert(image.hidden);
 c.step='result';c.sequence++;c.results[2]={answer:'C',correct:true,recording:16};paint(100000);assert(image.hidden);
});
test('TV never renders the SCREAMER name, awaits verdict and finishes on black',()=>{
 const {document,c,paint}=harness();c.game=4;c.step='verdict';paint(0);
 assert(!document.getElementById('chapter6Screamer').textContent);
 assert.equal(document.getElementById('chapter6Question').textContent,'SILENCE COMPLETE — AWAITING VERDICT');
 c.step='complete';c.sequence++;paint(10);
 for(const id of ['chapter6Content','chapter6HUD','chapter6Audio','chapter6HostToggle','chapter6Image'])assert(document.getElementById(id).hidden);
});
test('modern HUD shows shared lives, a distinct exposure countdown, locked answer and bridge solution',()=>{
 const {document,c,paint}=harness();Object.assign(c,{audioVersion:2,audioIndex:0,step:'exposure',deadline:16000});paint(5000);
 assert.equal(document.getElementById('chapter6Timer').textContent,'MEMORIZE · 10');assert.equal(document.getElementById('chapter6Lives').textContent,'♥♥♥');assert.equal(document.getElementById('chapter6Question').textContent,'MEMORIZE THE SCENE');
 Object.assign(c,{game:3,step:'locked',lives:2,results:[{correct:true},{correct:true},{correct:true},{answer:'A',correct:false,recording:20}]});paint(10000);
 assert.equal(document.getElementById('chapter6Question').textContent,'ANSWER LOCKED');assert.equal(document.getElementById('chapter6Detail').textContent,'15 minutes');assert.equal(document.getElementById('chapter6Lives').textContent,'♥♥♥');
 c.step='result';paint(12000);assert.equal(document.getElementById('chapter6Lives').textContent,'♥♥♡');assert(document.getElementById('chapter6Detail').textContent.includes('TOTAL: 17 MINUTES'));
 c.game=4;c.step='gameover';paint(14000);assert.equal(document.getElementById('chapter6Title').textContent,'GAME OVER');assert.equal(document.getElementById('chapter6Detail').textContent,'');
 c.step='waiting';c.selectedPlayer={name:'Guest'};paint(15000);assert.equal(document.getElementById('chapter6Title').textContent,'SOMETHING IS WAITING FOR YOU.');assert.equal(document.getElementById('chapter6Objective').textContent,'AWAITING RETURN');
});
test('transition reconstruction fades out, holds absolute black, then reveals only the next intro without audio',()=>{
 for(const outgoing of ['result','zero'])for(let game=0;game<5;game++){
  const {document,c,paint}=harness();Object.assign(c,{game,step:'transition',deadline:5000,transitionFrom:{step:outgoing,phaseAt:500},results:Array.from({length:5},()=>({answer:'black',correct:true,recording:7}))});
  for(const [t,opacity] of [[0,0],[500,.5],[999,.999],[1000,1],[2000,1],[2999,1],[3000,1],[3500,.5],[4000,0]]){
   paint(t);assert.equal(Number(document.getElementById('chapter6Curtain').style.opacity),opacity);
   const visual=transitionVisual(structuredClone(c),1000+t);assert.equal(visual.black,opacity);
   assert.deepEqual(phaseCues(c),[]);assert.equal(document.getElementById('chapter6Timer').textContent,'');
   if(t>=1000&&t<3000){assert.equal(visual.scene,null);assert(document.getElementById('chapter6Content').hidden);assert(document.getElementById('chapter6HUD').hidden);assert(document.getElementById('chapter6Image').hidden);}
   if(t<1000)assert.equal(visual.scene.game,game);
   if(t>=3000){assert.equal(visual.scene.game,Math.min(game+1,4));assert.equal(visual.scene.step,game===4?'finale':'intro');assert(!document.getElementById('chapter6Content').hidden);}
  }
 }
});
test('SCREAMER identity never appears in any Game 5 scene and waveform, interruptions and jump remain',()=>{
 const {document,c,paint}=harness();c.game=4;c.deadline=31000;c.results[4]={answer:'pass',correct:true,recording:26};
 for(const step of ['intro','silence','verdict','result']){c.step=step;c.sequence++;paint(0);assert(!document.getElementById('chapter6Screamer').textContent);assert(!document.getElementById('chapter6Waveform').hidden);}
 c.step='silence';c.sequence++;paint(26000);assert(!document.getElementById('chapter6Chicken').hidden);
 paint(55000);assert(!document.getElementById('chapter6Image').hidden);assert(document.getElementById('chapter6Image').src.endsWith('silence_jumpscare.png'));
 paint(55500);assert(document.getElementById('chapter6Image').hidden);
});

test('complete door cards and answer identities use persisted image order after refresh',()=>{
 const order=['black','green','red','blue'];
 for(let refresh=0;refresh<2;refresh++){
  const {document,c,paint}=harness();Object.assign(c,{game:0,step:'answer',doorOrder:[...order],deadline:121000});paint(100);
  const cards=document.getElementById('chapter6Doors').children;
  assert.deepEqual(cards.map(n=>n.children[0].src),order.map(id=>'/assets/chapter6/'+id+'_door.png'));
  assert.deepEqual(cards.map(n=>n.doorId),order);assert.deepEqual(document.getElementById('chapter6Choices').children.map(n=>n.answerId),order);
  assert.equal(cards[0].children[1].textContent,'Black — IX');assert.equal(cards[0].children[0].alt,'Black — IX');
  paint(500);assert.deepEqual(document.getElementById('chapter6Doors').children,cards);
 }
});
test('trivia cards show movie years and time choices without early answer or memory image',()=>{
 const {document,c,paint}=harness();Object.assign(c,{game:1,step:'answer',deadline:121000});paint(100);
 const choices=document.getElementById('chapter6Choices').children;assert.equal(choices.length,5);for(const card of choices){assert(card.children[0].textContent);assert.match(card.children[1].textContent,/^\d{4}$/);assert(!card.className.includes('selected'));}
 assert.equal(document.getElementById('chapter6GameTitle').textContent,'HORROR BOX OFFICE');assert(document.getElementById('chapter6Title').hidden);assert(document.getElementById('chapter6TV').classList.contains('maze-question'));
 c.game=2;c.sequence++;paint(200);assert(document.getElementById('chapter6Image').hidden);assert.equal(document.getElementById('chapter6Choices').children.length,5);assert.equal(document.getElementById('chapter6GameTitle').textContent,"DON'T LOOK AWAY");assert(document.getElementById('chapter6Timer').textContent);
});
test('results use green success and red failure; zero-life scene owns the waveform and hides next question',()=>{
 const {document,c,paint}=harness();c.step='result';c.results[2]={answer:'C',correct:true,recording:16};paint(0);
 const root=document.getElementById('chapter6TV');assert(root.classList.contains('maze-success'));assert.equal(document.getElementById('chapter6Question').textContent,'CORRECT');
 c.results[2]={answer:'A',correct:false,recording:17};paint(500);assert(root.classList.contains('maze-failure'));assert(!root.classList.contains('maze-success'));assert.equal(document.getElementById('chapter6Question').textContent,'WRONG');
 c.step='zero';c.lives=0;paint(500);assert(root.classList.contains('maze-zero'));assert.equal(document.getElementById('chapter6Content').style.opacity,'0.5');assert(!document.getElementById('chapter6Waveform').hidden);assert(document.getElementById('chapter6Waveform').classList.contains('speaking'));assert.equal(document.getElementById('chapter6Title').textContent,'ALL LIVES LOST');assert.equal(document.getElementById('chapter6Choices').children.length,0);assert(document.getElementById('chapter6Image').hidden);
});
test('silence failure scare stays through the entire narration result and never appears for a pass',()=>{
 const {document,c,paint}=harness();Object.assign(c,{game:4,step:'result',deadline:1000+gate(27)});c.results[4]={answer:'fail',correct:false,recording:27};
 for(const t of [0,500,gate(27)-1,gate(27)+5000]){paint(t);assert(!document.getElementById('chapter6Image').hidden);assert(document.getElementById('chapter6Image').src.endsWith('silence_jumpscare.png'));assert.equal(document.getElementById('chapter6Question').textContent,'');assert(document.getElementById('chapter6TV').classList.contains('maze-impact')===(t<500));}
 c.results[4]={answer:'pass',correct:true,recording:26};paint(100);assert(document.getElementById('chapter6Image').hidden);assert.equal(document.getElementById('chapter6Question').textContent,'SURVIVED');
});

test('ready and expired TV scenes preserve cinematic copy, original answer cards and frozen timer',()=>{
 const {document,c,paint}=harness();Object.assign(c,{controlVersion:1,audioVersion:2,game:0,audioIndex:1,step:'ready',deadline:null});paint(1000);assert.equal(document.getElementById('chapter6Question').textContent,'EVERYONE READY?');assert(document.getElementById('chapter6HUD').hidden);assert(document.getElementById('chapter6Doors').hidden);assert.equal(document.getElementById('chapter6Choices').children.length,0);assert(document.getElementById('chapter6Detail').textContent.includes('WAITING FOR THE HOST'));
 c.step='expired';c.sequence++;paint(5000);assert.equal(document.getElementById('chapter6Timer').textContent,'00:00');assert.equal(document.getElementById('chapter6Question').textContent,"TIME'S UP");assert.equal(document.getElementById('chapter6Choices').children.length,4);assert(!document.getElementById('chapter6Doors').hidden);assert(!document.getElementById('chapter6HUD').hidden);
 c.step='result';c.results[0]={answer:'no-consensus',correct:false,recording:null};c.lives=2;paint(6000);assert.equal(document.getElementById('chapter6Detail').textContent,'NO CONSENSUS.\nTIME RAN OUT.\nONE LIFE LOST.');
});
test('intro message fade-outs and black pauses reconstruct without playing another cue',()=>{
 const {document,c,paint}=harness();Object.assign(c,{controlVersion:1,audioVersion:2,game:0,audioIndex:0,step:'intro-gap',deadline:2100});
 for(const [t,black] of [[0,0],[300,.5],[600,1],[1099,1]]){paint(t);assert.equal(Number(document.getElementById('chapter6Curtain').style.opacity),black);assert.deepEqual(phaseCues(c),[]);assert(document.getElementById('chapter6HUD').hidden);if(t>=600)assert(document.getElementById('chapter6Content').hidden);}
});

test('new result scenes show selected artwork and hide central game titles after the exclusive fade',()=>{
 for(const [game,answer,asset] of [[0,'black','black_reveal.png'],[1,'C',null],[2,'C','morgue_memory.png'],[3,'B','bridge_background.png']]){
  const {document,c,paint}=harness();Object.assign(c,{pacingVersion:1,game,step:'locked',deadline:4000});c.results[game]={answer,correct:true,recording:[7,12,16,19][game]};paint(100);assert(document.getElementById('chapter6Image').hidden||game===3);
  c.step='result-reveal';c.phaseAt=1000;c.deadline=2600;paint(799);assert.equal(document.getElementById('chapter6Question').textContent,'ANSWER LOCKED');paint(800);assert(document.getElementById('chapter6Title').hidden);assert(document.getElementById('chapter6TV').classList.contains('maze-result'));
  c.step='result';c.phaseAt=2600;paint(2000);assert(document.getElementById('chapter6Title').hidden);if(asset)assert(document.getElementById('chapter6Image').src.endsWith(asset));else assert(document.getElementById('chapter6TV').classList.contains('maze-result-boxoffice'));
  if(game===0)assert.equal(document.getElementById('chapter6Question').textContent,'YOU CHOSE THE RIGHT DOOR.');if(game===2)assert(document.getElementById('chapter6Detail').textContent.includes('3:45'));if(game===3)assert(document.getElementById('chapter6Detail').textContent.includes('17 MINUTES'));
 }
});
test('memory window shows the prepared image without consuming exposure on a fade and restores remaining countdown',()=>{
 const {document,c,paint}=harness();Object.assign(c,{pacingVersion:1,audioVersion:2,step:'exposure',phaseAt:2500,exposureStartedAt:2500,deadline:32500});paint(1499);assert(document.getElementById('chapter6Image').hidden);assert.equal(document.getElementById('chapter6Timer').textContent,'');paint(1500);assert(!document.getElementById('chapter6Image').hidden);assert.equal(document.getElementById('chapter6Timer').textContent,'MEMORIZE · 30');assert.equal(document.getElementById('chapter6Image').style.opacity,'1');paint(11500);assert.equal(document.getElementById('chapter6Timer').textContent,'MEMORIZE · 20');paint(31499);assert(!document.getElementById('chapter6Image').hidden);paint(31500);assert(document.getElementById('chapter6Image').hidden);
});
test('Game 5 failure shock fades to the killer waveform while one unchanged narration continues',()=>{
 const {document,c,paint}=harness();Object.assign(c,{pacingVersion:1,game:4,step:'result',lives:0,results:[{correct:false},{correct:false},{correct:false},{correct:true},{answer:'fail',correct:false,recording:27}]});paint(0);assert(!document.getElementById('chapter6Image').hidden);paint(2750);assert.equal(document.getElementById('chapter6Image').style.opacity,'0.5');paint(3000);assert(document.getElementById('chapter6Image').hidden);assert(!document.getElementById('chapter6Waveform').hidden);assert.equal(document.getElementById('chapter6Question').textContent,'YOU FAILED.');assert.equal(document.getElementById('chapter6Detail').textContent,'NO LIVES REMAIN.');assert.equal(phaseCues(c)[0].number,27);
 c.results[2].correct=true;paint(5000);assert.equal(document.getElementById('chapter6Detail').textContent,'ONE LIFE LOST.');
});

test('navy vignette uses the approved four navy tones and keeps scoped green/red result lighting',()=>{
 const css=fs.readFileSync('chapter6.css','utf8'),theme=css.match(/#chapter6TV\{background:radial-gradient\(ellipse at 50% 45%,([^}]*)/)[1];for(const color of ['#050B16','#0B1628','#17283A','#02050A'])assert(theme.includes(color));assert(!theme.includes('#120b16'));for(const kind of ['doors','boxoffice','memory','bridge'])assert(css.includes('.maze-result-'+kind));assert(css.includes('.maze-success:after'));assert(css.includes('.maze-failure:after'));assert(css.includes('#chapter6Image.memory{opacity:1!important;filter:none!important;transform:none!important;transition:none!important;animation:none!important}'));
});


test('wrong movie and memory answers reveal only three seconds into the refresh-safe result scene',()=>{
 for(const game of [1,2]){const {document,c,paint}=harness();Object.assign(c,{polishVersion:1,pacingVersion:1,game,step:'result-reveal',phaseAt:1000,deadline:2600,results:[]});c.results[game]={answer:'A',correct:false,recording:game===1?13:17};
 paint(800);assert.equal(document.getElementById('chapter6Detail').textContent,'');c.step='result';c.phaseAt=2600;
 for(const elapsed of [1600,4599]){paint(elapsed);assert.equal(document.getElementById('chapter6Question').textContent,'WRONG ANSWER');assert.equal(document.getElementById('chapter6Detail').textContent,'');assert(document.getElementById('chapter6Image').hidden);}
 paint(4600);assert(document.getElementById('chapter6Detail').textContent.includes(game===1?'The Sixth Sense':'3:45'));assert.equal(phaseCues(c)[0].number,game===1?13:17);
 c.results[game].correct=true;paint(1600);assert(document.getElementById('chapter6Detail').textContent);
 }
});
test('memory-ready hides imagery and timers; finale owns one scene and return owns only the killer waveform',()=>{
 const {document,c,paint}=harness();Object.assign(c,{polishVersion:1,pacingVersion:1,audioVersion:2,game:2,step:'memory-ready',deadline:null});paint(10000);assert.equal(document.getElementById('chapter6Question').textContent,'ARE YOU READY?');assert(document.getElementById('chapter6Image').hidden);assert.equal(document.getElementById('chapter6Timer').textContent,'');
 Object.assign(c,{game:4,step:'finale'});paint(0);assert(document.getElementById('chapter6Token').hidden);assert(!document.getElementById('chapter6Detail').textContent.includes('TOKEN'));c.step='vote';c.voteCount=0;c.voterCount=2;paint(0);assert.equal(document.getElementById('chapter6Title').textContent,'SOMETHING IS WAITING FOR YOU.');
 c.step='waiting';c.selectedPlayer={name:'Actual Guest'};paint(0);assert.equal(document.getElementById('chapter6Question').textContent,'WAITING FOR Actual Guest TO RETURN.');c.step='return-fade';c.deadline=1600;paint(300);assert.equal(Number(document.getElementById('chapter6Curtain').style.opacity),.5);c.step='return';paint(600);assert(document.getElementById('chapter6Token').hidden);assert(document.getElementById('chapter6Title').hidden);assert(!document.getElementById('chapter6Waveform').hidden);assert.equal(phaseCues(c)[0].number,31);
});
