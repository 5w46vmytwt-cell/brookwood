import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {wavMetadata} from '../tests/wav-metadata.js';
import {mp3Metadata} from '../tests/mp3-metadata.js';
const paths=['/assets/chapter8/ch8_puzzle_clues.png',...readdirSync('assets/chapter8/audio').map(p=>'/assets/chapter8/audio/'+p)];
const media=paths.map(src=>{const b=readFileSync('.'+src);return {src,...(src.endsWith('.wav')?wavMetadata(b):src.endsWith('.mp3')?mp3Metadata(b):{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}),sha256:createHash('sha256').update(b).digest('hex')};});
if(process.argv.includes('--write'))writeFileSync('chapter8-media.json',JSON.stringify(media,null,2)+'\n');
console.log(JSON.stringify(media,null,2));
