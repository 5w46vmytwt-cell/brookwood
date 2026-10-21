import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {wavMetadata} from '../tests/wav-metadata.js';
import {mp3Metadata} from '../tests/mp3-metadata.js';
const files=[['narrator','ch7_01_narrator_returns.wav'],['podcast-intro','ch7_02_podcast_intro.wav'],['possession','ch7_03_possession.mp3'],['officer','ch7_04a_police_officer.mp3'],['prophecy','ch7_04b_prophecy_whisper.mp3'],['reaction','ch7_05_possession_reaction.mp3'],['premeditation','ch7_06_premeditation.mp3'],['accomplice','ch7_07_accomplice.mp3'],['vote-intro','ch7_08_theory_vote_intro.wav'],['photograph','ch7_09_photograph_revelation.wav'],['envelope-instructions','ch7_10_envelope_instructions.wav']];
const entries=[...files.map(([step,file])=>({step,src:'/assets/chapter7/audio/'+file,type:'narration',volume:1})),{step:'scare',src:'/assets/chapter6/audio/ch6_sfx_scream.mp3',type:'sfx',volume:.75},{step:'incoming',src:'/assets/chapter3/audio/private-message-vibration.wav',type:'sfx',volume:1}];
const media=entries.map((e,i)=>{const b=readFileSync('.'+e.src),meta=e.src.endsWith('.wav')?wavMetadata(b):mp3Metadata(b);return {...e,id:'chapter7-story-'+e.step,number:i+1,...meta,sha256:createHash('sha256').update(b).digest('hex')};});
if(process.argv.includes('--write')){
 writeFileSync('chapter7-story-media.json',JSON.stringify(media,null,2)+'\n');
 writeFileSync('chapter7-recordings.js','// Generated from supplied media by scripts/measure-chapter7-story.mjs --write.\nexport const storyRecordings='+JSON.stringify(media.filter(r=>r.step!=='scare').map(({step,src,type,volume,id,number,durationMs})=>({step,src,type,volume,id,number,durationMs})),null,2)+';\n');
}
for(const r of media)console.log(r.step+': '+r.durationMs.toFixed(3)+' ms — '+r.src);
