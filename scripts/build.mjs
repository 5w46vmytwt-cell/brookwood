// Dependency-free production static output. Vercel builds the native /api
// handlers separately from source; never copy server modules or secrets to dist.
import {readFileSync,readdirSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
const root=resolve('.'),out=resolve('dist');
const browser=readdirSync(root).filter(f=>/\.(html|css|js)$/.test(f));
function mediaFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?mediaFiles(join(dir,entry.name)):[join(dir,entry.name).replaceAll('\\','/')]);}
// The loose Chapter 1 draft is deliberately excluded: it is not part of the
// approved playback and was already untracked at the checkpoint.
const assets=mediaFiles('assets').filter(f=>/\.(png|mp3|wav|mp4)$/.test(f)&&f!=='assets/chapter1/narration.mp3');
const inputs=[...browser,...assets];
for(const file of [...browser.filter(f=>f.endsWith('.js')),...readdirSync('api').filter(f=>f.endsWith('.js')).map(f=>'api/'+f)]){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);
}
for(const file of ['tv.html','join.html']){
 const source=readFileSync(file,'utf8');for(const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1],{filename:file});
}
for(const file of inputs){const target=resolve(out,file);if(!target.startsWith(out+'/')&&!target.startsWith(out+'\\'))throw Error('Invalid output path');mkdirSync(dirname(target),{recursive:true});copyFileSync(file,target);}
// All local module imports and asset URLs referenced by the runtime must resolve.
for(const file of browser){const source=readFileSync(file,'utf8');for(const match of source.matchAll(/(?:src|href)=["'](\/[^"']+)["']|(?:from\s*|import\s*)["'](\.\/[^"']+)["']/g)){
 const target=match[1]?join(out,match[1]):resolve(dirname(join(out,file)),match[2]);if(!existsSync(target))throw Error('Missing build dependency: '+file+' -> '+(match[1]??match[2]));
}}
for(const r of JSON.parse(readFileSync('vercel.json')).rewrites)if(!existsSync(join(out,r.destination)))throw Error('Missing route output');
const {recordings}=await import('../chapter6-timing.js');for(const r of recordings)if(!existsSync(join(out,r.src)))throw Error('Missing built narration: '+r.src);
console.log(`Production static build: ${inputs.length} files in ${relative(root,out)}. API syntax verified; native Vercel /api source retained.`);
