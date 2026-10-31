import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {creditPhotos,creditPhotoOrder,creditFrame,PHOTO_MS,SHUTDOWN_MS} from '../chapter8-credits.js';
import {final10FinaleCues,shortIntroFinaleCues,cuesFor,finaleCues,finaleCue} from '../chapter8-finale-timing.js';
import {startFinale,advanceFinale,finaleHostAction,validateFinale} from '../api/_chapter8-finale.js';
import {UNCHANGED} from '../api/_state.js';
const cue=id=>final10FinaleCues.find(c=>c.id===id);
const body=(c,action)=>({action,sequence:c.sequence,finaleId:c.finale.id,cueId:finaleCue(c).id});
test('supplied FINAL10 PNG retains exact original bytes, filename and dimensions',()=>{
 const p=creditPhotos.find(p=>p.number===10),b=fs.readFileSync('.'+p.src);
 assert.equal(p.src,'/assets/chapter8/final10.png');assert.equal(b.length,2409093);assert.equal(b.readUInt32BE(16),p.width);assert.equal(b.readUInt32BE(20),p.height);
 assert.equal(createHash('sha256').update(b).digest('hex'),'b17cd5e66dbbcc7013f31c7fb6b2cd207deed0d09f5bf9b0a950c9cbb5ca406d');
});
test('explicit new credits end FINAL8 FINAL10 FINAL9 then shutdown, retaining every earlier cue and saved-run timeline',()=>{
 assert.deepEqual(creditPhotoOrder,[1,2,3,4,5,6,7,8,10,9]);assert.deepEqual(final10FinaleCues.filter(c=>c.photo).map(c=>c.photo),creditPhotoOrder);
 const first=final10FinaleCues.findIndex(c=>c.id==='credits-intro');assert.deepEqual(final10FinaleCues.slice(0,first),shortIntroFinaleCues.slice(0,first));
 assert.deepEqual(final10FinaleCues.slice(-6).map(c=>c.id),['credit-photo-8','credit-photo-10','credit-photo-9','credits-music-out','shutdown','final-image']);
 assert.equal(cue('final-image').visual,'black');assert.equal(cue('shutdown').durationMs,SHUTDOWN_MS);assert.equal(cue('shutdown').volume,1);
 assert.equal(cuesFor({finale:{polishVersion:8,introVersion:1}}),shortIntroFinaleCues);
 assert(Math.abs(final10FinaleCues.at(-1).end-shortIntroFinaleCues.at(-1).end-22000)<.001);
 assert(Math.abs(final10FinaleCues.at(-1).end-cue('credits-intro').at-124458.34375)<.001);
});
test('all ten photos share 11-second exclusive motion, aspect ratio and safe margins at 1080p and 720p',()=>{
 for(const [width,height] of [[1920,1080],[1280,720]])for(const number of creditPhotoOrder){
  const c=cue('credit-photo-'+number),photo=creditPhotos.find(p=>p.number===number);assert.equal(c.durationMs,PHOTO_MS);
  assert.equal(creditFrame(c,0).opacity,0);assert.equal(creditFrame(c,900).opacity,1);assert.equal(creditFrame(c,9900).opacity,1);assert.equal(creditFrame(c,10800).opacity,0);assert.equal(creditFrame(c,10999).opacity,0);
  for(const t of [0,450,900,5000,9900,10800]){const f=creditFrame(c,t,{width,height}),a=Math.abs(f.angle)*Math.PI/180,w=f.width,h=(w-2*f.padding)*photo.height/photo.width+2*f.padding;
   assert((w*Math.cos(a)+h*Math.sin(a))*f.scale+Math.abs(f.x)*2<width);assert((h*Math.cos(a)+w*Math.sin(a))*f.scale+Math.abs(f.y)*2<height);
  }
 }
});
test('image decode gates and refresh retain order; shutdown waits for native ended then completes on black',()=>{
 const c={id:'c8',sequence:0};startFinale(c,100000,finaleCues.findIndex(c=>c.id==='credit-photo-8'));let now=100000;
 c.finale.soundAnchors={credits:50000};
 for(const n of [8,10,9]){assert.equal(finaleCue(c).photo,n);assert.equal(c.finale.deadline,null);assert.equal(advanceFinale(c,now+999999),UNCHANGED);
  finaleHostAction(c,body(c,'chapter8-finale-ready'),now);const snapshot=structuredClone(c);validateFinale(snapshot);assert.equal(finaleCue(snapshot).photo,n);assert.equal(snapshot.finale.deadline,now+PHOTO_MS);assert.equal(snapshot.finale.soundAnchors.credits,50000);
  advanceFinale(c,now+PHOTO_MS-1);assert.equal(finaleCue(c).photo,n);advanceFinale(c,now+PHOTO_MS);now+=PHOTO_MS;
 }
 assert.equal(finaleCue(c).id,'credits-music-out');advanceFinale(c,now+2500);now+=2500;assert.equal(finaleCue(c).id,'shutdown');assert.equal(advanceFinale(c,now+999999),UNCHANGED);
 finaleHostAction(c,body(c,'chapter8-finale-playing'),now);validateFinale(structuredClone(c));assert.throws(()=>finaleHostAction(c,body(c,'chapter8-finale-ended'),now+1000));
 finaleHostAction(c,body(c,'chapter8-finale-ended'),now+SHUTDOWN_MS);assert.equal(finaleCue(c).visual,'black');advanceFinale(c,now+SHUTDOWN_MS+1200);assert.equal(c.step,'complete');validateFinale(structuredClone(c));assert.equal(advanceFinale(c,now+999999),UNCHANGED);
});
