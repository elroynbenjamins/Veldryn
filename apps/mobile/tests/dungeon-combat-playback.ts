import {playbackCueDelayMs,playbackCueLabel,playbackCueTone,playbackProgress,playbackRecentCues} from '../src/core/dungeon-combat-playback';
import {validateCoopRunView,type CoopCombatReplayView} from '../src/core/coop-presentation';

function assert(value:unknown,message:string){if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}

const replay:CoopCombatReplayView={nodeId:'boss',reason:'victory',durationMs:20000,cues:[
 {atMs:2500,type:'phase',actorId:'boss',actorName:'The Hollow Regent',abilityId:'P2',abilityName:'Black Lantern'},
 {atMs:5000,type:'cast',actorId:'boss',actorName:'The Hollow Regent',abilityId:'CAST',abilityName:'Gloam Burst',durationMs:1800},
 {atMs:6200,type:'assist',actorId:'p1',actorName:'Wayfinder',abilityId:'p1:UNIT_005:assist',abilityName:'Lantern Wisp: Lantern Snuff'},
 {atMs:9000,type:'down',targetId:'p2',targetName:'Ravager'},
 {atMs:20000,type:'victory'},
]};
equal(playbackCueTone(replay.cues[1]),'warning');
equal(playbackCueTone(replay.cues[2]),'selected');
equal(playbackCueLabel(replay.cues[2]),'Lantern Wisp: Lantern Snuff');
equal(playbackCueLabel(replay.cues[3]),'Ravager is downed');
assert(playbackCueDelayMs(replay.cues[0],replay.cues[1])>=260,'cue delay below floor');
assert(playbackCueDelayMs(replay.cues[0],replay.cues[1])<=950,'cue delay above ceiling');
equal(playbackProgress(replay,4),1);
equal(playbackRecentCues(replay,3).length,3);

validateCoopRunView({runId:'run',mode:'qmode',phase:'completed',syncedLevel:35,roleSlots:[
 {memberId:'p0',role:'tank',name:'Tank',echo:false,classId:'IRONWARDEN'},
 {memberId:'p1',role:'damage',name:'Wayfinder',echo:false,classId:'WAYFINDER',companionId:'UNIT_005'},
 {memberId:'p2',role:'damage',name:'Ravager',echo:true,classId:'RAVAGER'},
 {memberId:'p3',role:'support',name:'Dawnkeeper',echo:true,classId:'DAWNKEEPER'},
],options:[],lastCombat:replay});

let invalid='';
try{validateCoopRunView({runId:'bad',mode:'qmode',phase:'completed',syncedLevel:35,roleSlots:[
 {memberId:'p0',role:'tank',name:'Tank',echo:false,classId:'IRONWARDEN'},
 {memberId:'p1',role:'damage',name:'Wayfinder',echo:false,classId:'WAYFINDER'},
 {memberId:'p2',role:'damage',name:'Ravager',echo:true,classId:'RAVAGER'},
 {memberId:'p3',role:'support',name:'Dawnkeeper',echo:true,classId:'DAWNKEEPER'},
],options:[],lastCombat:{...replay,cues:[replay.cues[1],replay.cues[0]]}});}catch(error){invalid=error instanceof Error?error.message:String(error);}
equal(invalid,'invalid_combat_replay');
console.log('dungeon combat playback OK');
