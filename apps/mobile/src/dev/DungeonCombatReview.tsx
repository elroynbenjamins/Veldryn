import {CoopRunOverview} from '../components/coop/CoopRunOverview';
import type {CoopRunView} from '../core/coop-presentation';
const roles:CoopRunView['roleSlots']=[
 {memberId:'p0',role:'tank',name:'Aster',echo:false,classId:'IRONWARDEN',companionId:'UNIT_001',currentHp:960,maximumHp:1200,ready:true},
 {memberId:'p1',role:'damage',name:'Elowen',echo:false,classId:'WAYFINDER',currentHp:760,maximumHp:900,ready:true},
 {memberId:'p2',role:'damage',name:'Brann',echo:false,classId:'RAVAGER',currentHp:780,maximumHp:920,ready:true},
 {memberId:'p3',role:'support',name:'Lyra',echo:false,classId:'DAWNKEEPER',currentHp:820,maximumHp:850,ready:true},
];
const run:CoopRunView={runId:'visual-only',mode:'live',phase:'resolving_node',syncedLevel:25,roleSlots:roles,options:[],lastCombat:{nodeId:'boss',reason:'victory',durationMs:20000,combatants:[...roles.map(r=>({id:r.memberId!,name:r.name,team:'players' as const,maxHp:r.maximumHp!,startHp:r.currentHp!,startShield:0,boss:false})),{id:'boss',name:'The Hollow Regent',team:'enemies',maxHp:5000,startHp:3700,startShield:0,boss:true}],cues:[{atMs:0,type:'cast',actorId:'boss',actorName:'The Hollow Regent',abilityName:'Gloam Burst',durationMs:2500,states:[{id:'boss',hp:3700,shield:0}]},{atMs:20000,type:'victory',abilityName:'Encounter cleared',states:[{id:'boss',hp:0,shield:0}]}]}};
/** Isolated visual data; production combat renderer, no network actions. */
export function DungeonCombatReview(){return <CoopRunOverview language="en" run={run} onBack={()=>{}}/>;}
