import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {mp3Metadata} from '../tests/mp3-metadata.js';
const images=['red_door.png','blue_door.png','green_door.png','black_door.png','red_reveal.png','blue_reveal.png','green_reveal.png','black_reveal.png','morgue_memory.png','bridge_background.png','silence_jumpscare.png'];
for(const file of images){const b=readFileSync(new URL('../assets/chapter6/'+file,import.meta.url));if(b.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG: '+file);}
const files=readdirSync(new URL('../assets/chapter6/audio/',import.meta.url)).filter(f=>f.endsWith('.mp3')).sort();
if(files.length!==32)throw Error('Expected 32 MP3 files');
const recordings=files.map((file,i)=>{if(!file.startsWith('ch6_'+String(i+1).padStart(2,'0')+'_'))throw Error('Missing numbered recording');return {number:i+1,file,...mp3Metadata(readFileSync(new URL('../assets/chapter6/audio/'+file,import.meta.url)))};});
if(process.argv.includes('--write'))writeFileSync(new URL('../chapter6-media.json',import.meta.url),JSON.stringify(recordings,null,2)+'\n');
console.log('Verified 11 PNGs and 32 contiguous MPEG Layer III recordings.');
for(const r of recordings)console.log(`${String(r.number).padStart(2,'0')} ${r.file}: ${(r.durationMs/1000).toFixed(6)}s (${r.samples} samples at ${r.sampleRate} Hz)`);
