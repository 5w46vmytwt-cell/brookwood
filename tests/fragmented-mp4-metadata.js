import {mp4Metadata} from './mp4-metadata.js';
// Read-only inspection of supplied fragmented MP4s whose movie header is zero.
export function fragmentedMp4Metadata(b){
 const metadata=mp4Metadata(b);
 const boxes=(start,end)=>{const out=[];for(let p=start;p+8<=end;){const size=b.readUInt32BE(p)||end-p;if(size<8||p+size>end)throw Error('Invalid fragmented MP4 box');out.push({type:b.toString('ascii',p+4,p+8),p:p+8,end:p+size});p+=size;}return out;};
 const root=boxes(0,b.length),children=x=>boxes(x.p,x.end),child=(x,type)=>children(x).find(b=>b.type===type),moov=root.find(x=>x.type==='moov'),tracks=new Map();
 for(const [index,t] of children(moov).filter(x=>x.type==='trak').entries()){const tk=child(t,'tkhd'),md=child(child(t,'mdia'),'mdhd');tracks.set(b.readUInt32BE(tk.p+(b[tk.p]?20:12)),{index,scale:b.readUInt32BE(md.p+(b[md.p]?20:12)),end:0});}
 for(const moof of root.filter(x=>x.type==='moof'))for(const traf of children(moof).filter(x=>x.type==='traf')){
  const h=child(traf,'tfhd'),flags=b.readUInt32BE(h.p)&0xffffff,track=tracks.get(b.readUInt32BE(h.p+4));let p=h.p+8;if(flags&1)p+=8;if(flags&2)p+=4;const defaultDuration=flags&8?b.readUInt32BE(p):0,dt=child(traf,'tfdt');let end=b[dt.p]?Number(b.readBigUInt64BE(dt.p+4)):b.readUInt32BE(dt.p+4);
  for(const r of children(traf).filter(x=>x.type==='trun')){const f=b.readUInt32BE(r.p)&0xffffff,n=b.readUInt32BE(r.p+4);let p=r.p+8;if(f&1)p+=4;if(f&4)p+=4;for(let i=0;i<n;i++){let duration=defaultDuration;if(f&256){duration=b.readUInt32BE(p);p+=4;}if(!duration)throw Error('Missing sample duration');end+=duration;if(f&512)p+=4;if(f&1024)p+=4;if(f&2048)p+=4;}if(p>r.end)throw Error('Invalid sample table');}
  track.end=Math.max(track.end,end/track.scale);
 }
 for(const t of tracks.values())metadata.tracks[t.index].durationSeconds=t.end;
 return {...metadata,durationMs:Math.max(...[...tracks.values()].map(t=>t.end))*1000,fragmented:true};
}
