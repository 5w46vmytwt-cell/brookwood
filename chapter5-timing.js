import {CHAPTER5_READY_MS,roleVotingOffset} from './chapter5-audio-timing.js';
export const chapter5Phases=['chapter5-intro','chapter5-waiting','chapter5-rules','chapter5-casting','chapter5-finale','chapter5-complete'];
export const CHAPTER5_INTRO_MS=CHAPTER5_READY_MS;
export const CHAPTER5_LEGACY_INTRO_MS=10000;
export const CHAPTER5_FINALE_MS=30100;
export const castingRoles=[
  {id:'screamer',title:'THE SCREAMER',setup:'A door slams. A light flickers.',question:'WHO HAS ALREADY SCREAMED SIX TIMES TONIGHT?',src:'/assets/chapter5/01-the-screamer.png'},
  {id:'terribleDecisionMaker',title:'THE TERRIBLE DECISION MAKER',setup:'You finally escaped.',question:"WHO SAYS, 'GUYS... WE SHOULD GO BACK'?",src:'/assets/chapter5/02-the-terrible-decision-make.png'},
  {id:'tripper',title:'THE TRIPPER',setup:'The killer is right behind you.',question:'WHO TRIPS OVER ABSOLUTELY NOTHING?',src:'/assets/chapter5/03-the-tripper.png'},
  {id:'denier',title:'THE DENIER',setup:"Blood on the wall. Someone's missing.",question:"WHO STILL SAYS, 'GUYS, IT'S PROBABLY NOTHING'?",src:'/assets/chapter5/04-the-denier.png'},
  {id:'sacrifice',title:'THE SACRIFICE',setup:"You don't have to outrun the killer.",question:'YOU JUST HAVE TO OUTRUN... WHO?',src:'/assets/chapter5/05-the-sacrifice.png'},
  {id:'killer',title:'THE KILLER',setup:"They've been laughing, drinking and partying with everyone.",question:"WHO'S SECRETLY WAITING FOR THE RIGHT MOMENT?",src:'/assets/chapter5/06-the-killer.png'}
];
export const castingVotingOffset=(role,audioVersion=1)=>audioVersion===1?roleVotingOffset(role):role==='killer'?2500:1200;
export const castingRevealOffset=role=>role==='killer'?6300:2200;
export const castingCompletionMs=role=>role==='killer'?11300:role==='sacrifice'?9400:6900;
