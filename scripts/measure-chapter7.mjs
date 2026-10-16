// Inspect ISO BMFF metadata without decoding, modifying or re-encoding the MP4.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const b=readFileSync('assets/chapter7/ch7_breaking_news.mp4');
function boxes(start,end){const out=[];for(let p=start;p+8<=end;){let n=b.readUInt32BE(p),h=8;if(n===1){n=Number(b.readBigUInt64BE(p+8));h=16;}if(!n)n=end-p;if(n<h||p+n>end)throw Error('Invalid MP4 box');out.push({type:b.toString('ascii',p+4,p+8),p:p+h,end:p+n,size:n});p+=n;}return out;}
const root=boxes(0,b.length),children=x=>boxes(x.p,x.end),child=(x,t)=>children(x).find(y=>y.type===t),moov=root.find(x=>x.type==='moov');
const mvhd=child(moov,'mvhd'),v=b[mvhd.p],movieScale=b.readUInt32BE(mvhd.p+(v?20:12)),movieDuration=v?Number(b.readBigUInt64BE(mvhd.p+24)):b.readUInt32BE(mvhd.p+16);
const tracks=children(moov).filter(x=>x.type==='trak').map(t=>{
 const mdia=child(t,'mdia'),mdhd=child(mdia,'mdhd'),p=mdhd.p,v=b[p],scale=b.readUInt32BE(p+(v?20:12)),duration=v?Number(b.readBigUInt64BE(p+24)):b.readUInt32BE(p+16),hdlr=child(mdia,'hdlr'),kind=b.toString('ascii',hdlr.p+8,hdlr.p+12),stbl=child(child(mdia,'minf'),'stbl'),stsd=child(stbl,'stsd'),entry=boxes(stsd.p+8,stsd.end)[0];
 const details={kind,codec:entry.type,durationSeconds:duration/scale};
 if(kind==='vide'){details.width=b.readUInt16BE(entry.p+24);details.height=b.readUInt16BE(entry.p+26);const avcc=boxes(entry.p+78,entry.end).find(x=>x.type==='avcC');if(avcc)details.codec+='.'+b.subarray(avcc.p+1,avcc.p+4).toString('hex');}
 if(kind==='soun'){details.channels=b.readUInt16BE(entry.p+16);details.sampleRate=b.readUInt32BE(entry.p+24)/65536;}
 return details;
});
console.log(JSON.stringify({src:'/assets/chapter7/ch7_breaking_news.mp4',bytes:b.length,durationSeconds:movieDuration/movieScale,fastStart:root.findIndex(x=>x.type==='moov')<root.findIndex(x=>x.type==='mdat'),tracks,sha256:createHash('sha256').update(b).digest('hex')},null,2));
