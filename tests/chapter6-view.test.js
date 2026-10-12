import test from 'node:test';
import assert from 'node:assert/strict';
import {Chapter6View} from '../chapter6.js';
import {gate,phaseCues,transitionVisual} from '../chapter6-timing.js';
function harness(){
 const nodes=new Map(),created=[];
 const make=()=>({hidden:false,style:{},classList:{toggle(){}},children:[],getAttribute(key){return this[key];},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}});
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
 c.step='silence';c.sequence++;paint(13000);assert(!document.getElementById('chapter6Chicken').hidden);
 paint(25000);assert(!document.getElementById('chapter6Image').hidden);assert(document.getElementById('chapter6Image').src.endsWith('silence_jumpscare.png'));
 paint(25500);assert(document.getElementById('chapter6Image').hidden);
});
