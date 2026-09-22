import {playbackAdvanceDelayMs,playbackBossCombatant,playbackCastDisplayMs,playbackCombatantState,playbackCueDelayMs,playbackCueLabel,playbackCueTone,playbackProgress,playbackRecentCues} from '../src/core/dungeon-combat-playback';
import {validateCoopRunView,type CoopCombatReplayView} from '../src/core/coop-presentation';

function assert(value:unknown,message:string){if(!value)throw new Error(message);}
function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}

const replay:CoopCombatReplayView={nodeId:'boss',reason:'victory',durationMs:20000,combatants:[
 {id:'p0',name:'Tank',team:'players',maxHp:1200,startHp:1200,startShield:0,boss:false},
 {id:'p1',name:'Wayfinder',team:'players',maxHp:900,startHp:900,startShield:0,boss:false},
 {id:'p2',name:'Ravager',team:'players',maxHp:920,startHp:920,startShield:0,boss:false},
 {id:'p3',name:'Dawnkeeper',team:'players',maxHp:850,startHp:850,startShield:0,boss:false},
 {id:'boss',name:'The Hollow Regent',team:'enemies',maxHp:5000,startHp:5000,startShield:0,boss:true},
],cues:[
 {atMs:900,type:'action',actorId:'p1',actorName:'Wayfinder',targetId:'boss',targetName:'The Hollow Regent',abilityId:'BASIC',abilityName:'Basic Attack',actionKind:'damage',amount:87.4,states:[{id:'p0',hp:1200,shield:0},{id:'p1',hp:900,shield:0},{id:'p2',hp:920,shield:0},{id:'p3',hp:850,shield:0},{id:'boss',hp:4912.6,shield:0}]},
 {atMs:2500,type:'phase',actorId:'boss',actorName:'The Hollow Regent',abilityId:'P2',abilityName:'Black Lantern',states:[{id:'p0',hp:1200,shield:160},{id:'p1',hp:900,shield:0},{id:'p2',hp:920,shield:0},{id:'p3',hp:850,shield:0},{id:'boss',hp:3700,shield:0}]},
 {atMs:5000,type:'cast',actorId:'boss',actorName:'The Hollow Regent',abilityId:'CAST',abilityName:'Gloam Burst',durationMs:1800,states:[{id:'p0',hp:1200,shield:160},{id:'p1',hp:900,shield:0},{id:'p2',hp:920,shield:0},{id:'p3',hp:850,shield:0},{id:'boss',hp:3700,shield:0}]},
 {atMs:6200,type:'assist',actorId:'p1',actorName:'Wayfinder',abilityId:'p1:UNIT_005:assist',abilityName:'Lantern Wisp: Lantern Snuff',states:[{id:'p0',hp:1200,shield:60},{id:'p1',hp:900,shield:0},{id:'p2',hp:920,shield:0},{id:'p3',hp:850,shield:0},{id:'boss',hp:3400,shield:0}]},
 {atMs:9000,type:'down',targetId:'p2',targetName:'Ravager',states:[{id:'p0',hp:1050,shield:0},{id:'p1',hp:900,shield:0},{id:'p2',hp:0,shield:0},{id:'p3',hp:850,shield:0},{id:'boss',hp:2100,shield:0}]},
 {atMs:20000,type:'victory',states:[{id:'p0',hp:1050,shield:0},{id:'p1',hp:760,shield:0},{id:'p2',hp:0,shield:0},{id:'p3',hp:850,shield:0},{id:'boss',hp:0,shield:0}]},
]};
equal(playbackCueTone(replay.cues[0]),'selected');
equal(playbackCueLabel(replay.cues[0]),'Wayfinder attacks The Hollow Regent · 87');
equal(playbackCueTone(replay.cues[2]),'warning');
assert(playbackCastDisplayMs(replay.cues[2])>=420,'boss cast display must remain readable at compressed playback speed');
assert(playbackCastDisplayMs(replay.cues[2])<=1400,'boss cast display must remain compact');
assert(playbackAdvanceDelayMs(replay.cues[2],replay.cues[3])>=playbackCastDisplayMs(replay.cues[2]),'playback must hold a cast cue until its readable bar completes');
equal(playbackCueTone(replay.cues[3]),'selected');
equal(playbackCueLabel(replay.cues[3]),'Lantern Wisp: Lantern Snuff');
equal(playbackCueLabel(replay.cues[4]),'Ravager is downed');
assert(playbackCueDelayMs(replay.cues[0],replay.cues[1])>=260,'cue delay below floor');
assert(playbackCueDelayMs(replay.cues[0],replay.cues[1])<=950,'cue delay above ceiling');
equal(playbackProgress(replay,5),1);
equal(playbackRecentCues(replay,4).length,3);
equal(playbackBossCombatant(replay)?.id,'boss');
equal(playbackCombatantState(replay,0,'boss')?.hp,4912.6);
equal(playbackCombatantState(replay,1,'p0')?.shield,160);
equal(playbackCombatantState(replay,3,'p0')?.shield,60);
equal(playbackCombatantState(replay,4,'p2')?.hp,0);
equal(playbackCombatantState(replay,5,'boss')?.hp,0);

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
