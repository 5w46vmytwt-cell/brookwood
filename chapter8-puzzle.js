// Coordinates are percentages of the unchanged 1536 x 1024 supplied artwork.
// Insets retain the torn photo borders, numbered tabs and answer lines.
export const PUZZLE_SRC='/assets/chapter8/ch8_puzzle_clues.png';
export const clues=[
 [1,'I','iPod Classic',5,16.9,9.1,18.55],
 [2,'M','Mi musical note',15.55,16.95,9,18.5],
 [3,'A','Ayrton Senna',27.9,16.9,9.25,18.55],
 [4,'L','Leprechaun',38.4,16.9,8.2,18.55],
 [5,'R','Ratatouille',47.85,16.9,8.55,18.55],
 [6,'E','Eyelash curler',57.1,16.9,8.3,18.55],
 [7,'A','Atari 2600',66.25,16.9,9.65,18.55],
 [8,'D','Dalmatian',76.95,16.9,8.5,18.55],
 [9,'Y','Yale',86.6,16.9,8.7,18.55],
 [10,'H','Hubble',21.8,45.2,13.95,15.5],
 [11,'E','Estonia',37.3,45.25,12.8,15.5],
 [12,'R','Roraima',51.3,45.4,12.55,15.4],
 [13,'E','EPCOT',65.2,45.1,12.5,15.7],
 [14,'H','Hachikō statue',19.8,68.3,13.85,18.8],
 [15,'I','Isaac Newton',36.1,68.3,12.95,18.8],
 [16,'D','DeLorean',51,68.3,13.95,18.8],
 [17,'E','Eclipse',66.85,68.3,13.4,18.8]
].map(([id,letter,label,x,y,w,h])=>Object.freeze({id,letter,label,x,y,w,h}));
export const CLUE_IDS=clues.map(c=>c.id);
export const PUZZLE_FADE_MS=1600;
export const AMBIENT_VOLUME=.07;
export const AMBIENT_FADE_MS=1600;
export const ambientCue={id:'chapter8-ambient',src:'/assets/chapter8/audio/ch8_puzzle_ambient_loop.mp3',durationMs:144840};
export const narrationCues=[
 {step:'unexpected-evidence',id:'chapter8-unexpected-evidence',src:'/assets/chapter8/audio/ch8_01_unexpected_evidence.wav',durationMs:13450},
 {step:'coded-message',id:'chapter8-coded-message',src:'/assets/chapter8/audio/ch8_02_coded_message.wav',durationMs:23150},
 {step:'reaction',id:'chapter8-reaction',src:'/assets/chapter8/audio/ch8_03_message_reaction.wav',durationMs:14400}
].map(c=>({...c,at:0,type:'narration',volume:1}));
export const narrationFor=step=>narrationCues.find(c=>c.step===step);
export const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
