// Validate contiguous MPEG Layer III frames, allowing standard ID3 tags.
// Frame duration is conservative: no unadvertised encoder padding is trimmed.
export function mp3Metadata(b){
  let pos=0;
  if(b.toString('ascii',0,3)==='ID3'){
    if(b.length<10||[6,7,8,9].some(i=>b[i]>127))throw Error('Invalid ID3 header');
    pos=10+b[6]*2097152+b[7]*16384+b[8]*128+b[9]+((b[5]&16)?10:0);
  }
  const end=b.toString('ascii',b.length-128,b.length-125)==='TAG'?b.length-128:b.length;
  let frames=0,samples=0,rate,channels;const bitrates=new Set();
  while(pos<end){
    if(pos+4>end)throw Error('Truncated MPEG header');
    const h=b.readUInt32BE(pos),version=(h>>>19)&3,layer=(h>>>17)&3,bitrateIndex=(h>>>12)&15,rateIndex=(h>>>10)&3;
    if(h>>>21!==2047||version===1||layer!==1||rateIndex===3||bitrateIndex===0||bitrateIndex===15)throw Error('Invalid MPEG Layer III frame');
    const sampleRate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4);
    const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex];
    const count=version===3?1152:576,length=Math.floor((version===3?144000:72000)*bitrate/sampleRate)+((h>>>9)&1),ch=((h>>>6)&3)===3?1:2;
    if(pos+length>end)throw Error('Truncated MPEG frame');
    if(rate!==undefined&&(rate!==sampleRate||channels!==ch))throw Error('Changing MPEG format');
    rate=sampleRate;channels=ch;bitrates.add(bitrate);frames++;samples+=count;pos+=length;
  }
  if(!frames)throw Error('Missing MPEG audio');
  return {encoding:'MPEG Layer III',sampleRate:rate,channels,bitrates:[...bitrates],frames,samples,durationMs:samples/rate*1000};
}
