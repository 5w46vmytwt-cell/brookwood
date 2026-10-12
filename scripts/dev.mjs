// Local-only rehearsal: same API handlers, isolated in-memory Redis CAS transport.
// No production credentials, cloud requests, or persistent room are used.
import http from 'node:http';
import {readFileSync,statSync,existsSync,createReadStream} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CAS_SCRIPT} from '../api/_state.js';
const root=resolve(process.argv.includes('--built')?'dist':'.');
const nativeFetch=global.fetch;let raw=null,timeOffset=0;
const nativeNow=Date.now;Date.now=()=>nativeNow()+timeOffset;
process.env.KV_REST_API_URL='http://brookwood-rehearsal.invalid';process.env.KV_REST_API_TOKEN='local-only';process.env.HOST_KEY='1031';
global.fetch=async(url,options)=>{
 if(url!==process.env.KV_REST_API_URL)return nativeFetch(url,options);
 const a=JSON.parse(options.body);let result;
 if(a[0]==='GET')result=raw;
 else if(a[0]==='SET'){raw=a[2];result='OK';}
 else if(a[0]==='EVAL'&&a[1]===CAS_SCRIPT){result=(raw??'')===a[4]?1:0;if(result)raw=a[5];}
 else throw Error('Unexpected local Redis command');
 return {ok:true,json:async()=>({result})};
};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');let body={};
  if(req.method==='POST'){let text='';for await(const chunk of req){text+=chunk;if(text.length>65536)throw Error('Request too large');}body=text?JSON.parse(text):{};}
  if(url.pathname==='/__test/time'&&req.method==='POST'){if(!process.argv.includes('--automation')){res.writeHead(404);res.end();return;}timeOffset+=Number(body.advanceMs)||0;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({serverNow:Date.now()}));return;}
  if(url.pathname.startsWith('/api/')){
   const name=url.pathname.slice(5);if(!/^[a-z][a-z0-9-]*$/.test(name)){res.writeHead(404);res.end();return;}
   const path=resolve('api',name+'.js');if(!existsSync(path)){res.writeHead(404);res.end();return;}
   const handler=(await import(pathToFileURL(path))).default;
   await handler({method:req.method,body},{status(n){res.statusCode=n;return this;},setHeader:(...a)=>res.setHeader(...a),json(data){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}});return;
  }
  const rewrite={'/':'/tv.html','/tv':'/tv.html','/join':'/join.html'};
  const path=resolve(root,'.'+(rewrite[url.pathname]??decodeURIComponent(url.pathname)));
  if(!path.startsWith(root+sep)||!existsSync(path)||!statSync(path).isFile()||(!process.argv.includes('--built')&&!(path.endsWith('.html')||path.endsWith('.css')||path.endsWith('.js')||path.startsWith(resolve('assets')+sep)))||path.startsWith(resolve('api')+sep)){res.writeHead(404);res.end();return;}
  const size=statSync(path).size;res.setHeader('Content-Type',mime[extname(path)]??'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('Accept-Ranges','bytes');
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
  if(range){const start=Number(range[1]),end=range[2]?Math.min(size-1,Number(range[2])):size-1;if(start>=size||end<start){res.writeHead(416);res.end();return;}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});createReadStream(path,{start,end}).pipe(res);}
  else{res.setHeader('Content-Length',size);createReadStream(path).pipe(res);}
 }catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500);res.end('Local rehearsal failed.');}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Brookwood rehearsal: http://127.0.0.1:'+(Number(process.env.PORT)||3000)+'/tv — host PIN 1031; isolated memory state.'));
