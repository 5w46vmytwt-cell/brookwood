// Original contiguous MPEG frame counts at 44,100 Hz; see chapter6-media.json.
const files=['interruption','maze_intro','doors_intro','doors_red','doors_blue','doors_green','doors_black','boxoffice_intro','boxoffice_60','boxoffice_30','boxoffice_05','boxoffice_correct','boxoffice_wrong','memory_intro','memory_question','memory_correct','memory_wrong','bridge_intro','bridge_correct','bridge_wrong','silence_intro','silence_rules','silence_whisper','silence_chicken_reaction','silence_accusation','silence_pass','silence_fail','final_win','final_lose','retriever_selected','token_return','all_lives_lost'];
const samples=[703872,611712,1737216,365184,498816,428544,534528,908928,235008,502272,273024,562176,972288,1162368,746496,584064,763776,1949184,432000,791424,1381248,1078272,336384,269568,262656,661248,640512,1194624,1119744,460800,1461888,1109376];
export const recordings=files.map((name,i)=>({number:i+1,id:'chapter6-'+(i+1),type:'narration',src:'/assets/chapter6/audio/ch6_'+String(i+1).padStart(2,'0')+'_'+name+'.mp3',durationMs:samples[i]/44100*1000}));
export const recording=n=>recordings[n-1];
export const gate=n=>Math.ceil(recording(n).durationMs)+200;
export const sequence=nums=>{let at=0;return nums.map(n=>{const cue={...recording(n),at};at+=gate(n);return cue;});};
export const introNumbers=game=>game===0?[1,2,3]:game===1?[8]:game===2?[14,15]:game===3?[18]:[21,22];
export function introDuration(game){return introNumbers(game).reduce((sum,n)=>sum+gate(n),0)+(game===2?15000:0);}
export const answerWindows=[120000,120000,90000,180000,30000];
export const TRANSITION_MS=4000;
// Reconstruct from the persisted phase clock; no client transition timer.
export function transitionVisual(c,now){
 if(c.step!=='transition')return {scene:c,black:0};
 const t=Math.max(0,now-c.phaseAt);
 if(t<1000)return {scene:{...c,...c.transitionFrom},black:t/1000};
 if(t<3000)return {scene:null,black:1};
 return {scene:{...c,game:c.game===4?4:c.game+1,step:c.game===4?'finale':'intro',phaseAt:c.deadline},black:Math.max(0,1-(t-3000)/1000)};
}
export const games=[
 {title:'THE FOUR DOORS',question:'Which door will you choose?',options:[['red','Red — XIII'],['blue','Blue — VI'],['green','Green — VII'],['black','Black — IX']],correct:'black'},
 {title:'HORROR BOX OFFICE',question:'Which of these horror movies earned the most money at the worldwide box office?',options:[['A','The Exorcist (1973)'],['B','A Nightmare on Elm Street (1984)'],['C','The Sixth Sense (1999)'],['D','Halloween (1978)'],['E','Paranormal Activity (2007)']],correct:'C'},
 {title:"DON'T LOOK AWAY",question:'What time was shown on the clock?',options:[['A','3:15'],['B','4:45'],['C','3:45'],['D','9:15'],['E','4:15']],correct:'C'},
 {title:'THE BRIDGE OF DEATH',question:'What is the minimum total time required for everyone to cross?',options:[['A','15 minutes'],['B','17 minutes'],['C','19 minutes'],['D','20 minutes'],['E','22 minutes']],correct:'B'},
 {title:"DON'T MAKE A SOUND",question:'The entire room must remain silent.',options:[]}
];
export const resultRecording=(game,answer,correct)=>game===0?({red:4,blue:5,green:6,black:7}[answer]??null):game===1?(correct?12:13):game===2?(correct?16:17):game===3?(correct?19:20):(correct?26:27);
export function phaseCues(c){
 const offset=c.phaseAt-c.startedAt;
 let cues=[];
 if(c.step==='intro'){
  cues=sequence(introNumbers(c.game));
  if(c.game===2)cues[1].at+=15000;
 }else if(c.step==='answer'&&c.game===1){
  cues=[{...recording(9),at:60000},{...recording(10),at:90000},{...recording(11),at:120000-Math.ceil(recording(11).durationMs)}];
 }else if(c.step==='silence'){
  // Separate finite SFX channels preserve full speech. Runtime ducks overlapping
  // older speech when the next voice cue enters; the deadline never moves.
  cues=[23,24,25].map((n,i)=>({...recording(n),type:'sfx',volume:1,at:[6000,13000,20000][i]}));
 }else{
  const n=c.step==='result'?c.results[c.game]?.recording:c.step==='zero'?32:c.step==='finale'?(c.lives>0?28:29):c.step==='selected'?30:c.step==='return'?31:null;
  if(n)cues=[{...recording(n),at:0}];
 }
 return cues.map(cue=>({...cue,at:cue.at+offset}));
}
export function memoryVisible(c,serverNow){return c.game===2&&c.step==='intro'&&serverNow>=c.phaseAt+gate(14)&&serverNow<c.phaseAt+gate(14)+15000;}
export const jumpVisible=(c,now)=>c.step==='silence'&&now>=c.phaseAt+25000&&now<c.phaseAt+25500;
