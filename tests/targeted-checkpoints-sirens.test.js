import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {storyCheckpoints} from '../chapter7-story-timing.js';
import {startFinale,advanceFinale,finaleHostAction,validateFinale} from '../api/_chapter8-finale.js';
import {finaleCues,finaleCue,cuesFor} from '../chapter8-finale-timing.js';
import {Chapter8SoundDesign,soundLayers} from '../chapter8-sound-design.js';
import {installPhotoControls} from '../photo-controls.js';
test('visible checkpoint menu retains every ID and places dynamic chapter7 scenes before chapter8',()=>{
 const html=fs.readFileSync('tv.html','utf8'),select=html.match(/<select id="chapterSelectCheckpoint"[\s\S]*?<\/select>/)[0];
 const original=[...select.matchAll(/value="([^"]+)"/g)].map(m=>m[1]);
 const menu={options:[...original,...storyCheckpoints.map(([id])=>id)].map(value=>({value})),appendChild(o){this.options.splice(this.options.indexOf(o),1);this.options.push(o);}};
 const code=html.match(/\{\s*const menu=document.getElementById\('chapterSelectCheckpoint'\);[\s\S]*?\n\}/)[0];
 vm.runInNewContext(code,{document:{getElementById:()=>menu},BrookwoodTV:{chapter7Checkpoints:storyCheckpoints}});
 assert.deepEqual(menu.options.map(o=>o.value),['chapter1','chapter2','photo','chapter3','chapter4','package','chapter5','chapter5-finale','chapter6','chapter6-ready','chapter6-after-results','chapter7','chapter7-after',...storyCheckpoints.map(([id])=>id),'chapter8','chapter8-puzzle','chapter8-finale','chapter8-finale-silence','chapter8-finale-news','chapter8-finale-after-news','chapter8-finale-credits']);
 assert.equal(menu.options.length,new Set(menu.options.map(o=>o.value)).size);
});
test('native scare completion starts one persisted siren anchor, warning does not move it, and gone narration completion anchors fade',()=>{
 const c={id:'c',sequence:0};startFinale(c,100000,finaleCues.findIndex(c=>c.id==='living-silence'));
 const body=action=>({action,sequence:c.sequence,finaleId:c.finale.id,cueId:finaleCue(c).id});
 finaleHostAction(c,body('chapter8-finale-ready'),100000);advanceFinale(c,105000);assert.equal(finaleCue(c).id,'intruder-reveal');assert.equal(c.finale.soundAnchors?.sirens,undefined);
 advanceFinale(c,107000);assert.equal(finaleCue(c).id,'wife-12');assert.equal(c.finale.soundAnchors.sirens,107000);
 finaleHostAction(c,body('chapter8-finale-playing'),107100);assert.equal(c.finale.soundAnchors.sirens,107000);
 validateFinale(structuredClone(c));
 const idx=cuesFor(c).findIndex(c=>c.id==='wife-14');Object.assign(c.finale,{index:idx,phaseAt:150000,mediaStartedAt:null,deadline:null});
 finaleHostAction(c,body('chapter8-finale-playing'),150000);finaleHostAction(c,body('chapter8-finale-ended'),150000+finaleCue(c).durationMs);
 assert.equal(finaleCue(c).id,'quiet-after-escape');assert.equal(c.finale.soundAnchors.sirensOut,c.finale.phaseAt);validateFinale(structuredClone(c));
});
test('siren layer is silent before scare, continuous under warning and gone line, reconstructs offset and fades before next narration',async()=>{
 let now=100000;const media=new Map(soundLayers.map(s=>[s.id,{paused:true,readyState:4,volume:0,plays:0,currentTime:0,play(){this.paused=false;this.plays++;return Promise.resolve();},pause(){this.paused=true;}}]));
 const c={step:'finale',finale:{id:'f',polishVersion:8,sirenVersion:1,phaseAt:100000,soundAnchors:{sirens:100000}}},sound=new Chapter8SoundDesign({media},()=>now,{Context:null});
 const cue=id=>({id,durationMs:2000});sound.update(c,cue('living-silence'));assert([...media.values()].every(m=>m.paused));
 now+=1000;sound.update(c,cue('wife-12'));await Promise.resolve();const siren=media.get('approaching-sirens');assert(!siren.paused);const plays=siren.plays;
 now+=1000;sound.update(c,cue('signal-lost-pause'));assert.equal(siren.plays,plays);assert(!siren.paused);
 const restored=new Chapter8SoundDesign({media:new Map(soundLayers.map(s=>[s.id,{...media.get(s.id),paused:true,plays:0}]))},()=>now,{Context:null});restored.update(structuredClone(c),cue('wife-13'));assert.equal(restored.player.media.get('approaching-sirens').currentTime,4);
 now=109000;sound.update(c,cue('wife-14'));const full=siren.volume;assert(full>0&&full<=.34);
 c.finale.soundAnchors.sirensOut=now;now+=500;sound.update(c,cue('quiet-after-escape'));assert(siren.volume<full);
 now+=500;sound.update(c,cue('quiet-after-escape'));assert(siren.paused);sound.update(c,cue('wife-15'));assert([...media.values()].every(m=>m.paused));sound.stop();restored.stop();
});
test('photo controls hide privileged action from guests and suppress duplicate host clicks',async()=>{
 const nodes=new Map();const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',textContent:'',addEventListener(){},focus(){}});return nodes.get(id);}};
 let auth=false,resolve,submissions=0,accepted=0;const request=async(_,b)=>{if(b.action==='maze-session'){if(!auth)throw Object.assign(Error('host only'),{status:403});return {authenticated:true};}submissions++;return new Promise(r=>resolve=r);};
 const control=installPhotoControls({document,request,acceptState(){accepted++;}}),state={phase:'photo',generation:'g',startedAt:100};control.update(state);await new Promise(r=>setImmediate(r));assert(nodes.get('photoTaken').hidden);
 auth=true;control.update({...state,generation:'new'});await new Promise(r=>setImmediate(r));assert(!nodes.get('photoTaken').hidden);
 const pending=nodes.get('photoTaken').onclick();await nodes.get('photoTaken').onclick();assert.equal(submissions,1);assert(nodes.get('photoTaken').disabled);resolve({state:{phase:'photo-complete'}});await pending;assert.equal(accepted,1);
});
