import {finaleCue,GAME_TITLE,GAME_TITLE_AT_MS,GAME_TITLE_END_MS,WIFE_RELAX_AT_MS} from './chapter8-finale-timing.js';
import {smooth} from './chapter8-puzzle.js';
import {narratorFrame} from './chapter7-story-timing.js';

export function wifePresentation(c,now){
 const cue=finaleCue(c),f=c?.finale,offset=f?.mediaStartedAt==null?0:Math.max(0,now-f.mediaStartedAt);
 const visible=!!cue?.visual?.startsWith('wife-');
 const returning=cue?.visual==='wife-return',warm=cue?.visual==='wife-bright'||returning&&offset>=WIFE_RELAX_AT_MS;
 const first=['wife-01','wife-13','wife-14','wife-16'].includes(cue?.id),last=['wife-04','wife-13','wife-15','wife-16'].includes(cue?.id);
 const position=first?offset:6000+offset,end=last?(first?cue.durationMs:6000+cue.durationMs):Infinity;
 const opacity=cue?.id==='handoff'?0:narratorFrame(position,end).scene;
 return {visible,mood:warm?'warm':'cold',title:cue?.id==='wife-02'&&offset>=GAME_TITLE_AT_MS&&offset<GAME_TITLE_END_MS?GAME_TITLE:'',offset,opacity};
}
export function finaleAmbientTarget(c,now){
 const cue=finaleCue(c),f=c?.finale;if(!cue)return 0;
 if(f.polishVersion>=2)return cue.id==='handoff'?.07*(1-smooth((now-f.phaseAt)/cue.durationMs)):0;
 if(['living-silence','intruder-reveal','signal-break','wife-12','breaking-news','news-out'].includes(cue.id))return 0;
 if(cue.id==='whistle-approach'){const offset=f.mediaStartedAt===null?0:now-f.mediaStartedAt;return .025*(1-smooth((offset-cue.durationMs+1000)/1000));}
 if(cue.id==='news-black')return .025*(1-smooth((now-f.phaseAt)/cue.durationMs));
 if(cue.id==='ending')return .035*(1-smooth((now-f.phaseAt)/cue.durationMs));
 return cue.kind==='narration'?.035:cue.id.startsWith('garage-')?.025:.07;
}
export function finaleMustBeSilent(c){if(c?.finale?.polishVersion>=2)return finaleCue(c)?.id!=='handoff';return ['living-silence','intruder-reveal','signal-break','wife-12','breaking-news','news-out'].includes(finaleCue(c)?.id);}
