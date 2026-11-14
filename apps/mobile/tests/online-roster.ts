import {executeGameCommand} from '../src/core/game-commands';
import {newGame} from '../src/core/game';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}
function different(actual:unknown,expected:unknown,message:string){if(actual===expected)throw new Error(`${message}: values unexpectedly match`)}
function throws(action:()=>unknown,message:string){let failed=false;try{action()}catch{failed=true}if(!failed)throw new Error(message)}

const firstId='11111111-1111-4111-8111-111111111111';
const secondId='22222222-2222-4222-8222-222222222222';
let state=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'First',body:'male'}},1,{characterId:firstId}).state;
throws(()=>executeGameCommand(state,{type:'roster_create',args:{classId:'BASTION',name:'Locked',body:'male'}},2,{characterId:secondId}),'locked roster slot must reject creation');
throws(()=>executeGameCommand(state,{type:'roster_create',args:{classId:'NOT_A_CLASS',name:'Invalid',body:'male'}},2,{characterId:secondId}),'unknown roster class must reject creation');
throws(()=>executeGameCommand(state,{type:'roster_switch',args:{id:secondId}},2),'unknown roster member must reject switching');
state={...state,version:11,account:{...state.account,unlockedCharacterSlots:2}};
state=executeGameCommand(state,{type:'roster_create',args:{classId:'BASTION',name:'Second',body:'female'}},2,{characterId:secondId}).state;
equal(state.character?.id,secondId,'active created roster member');
equal(state.version,11,'roster creation retains schema version');
equal(state.otherCharacters?.length,1,'previous character retained');
equal(state.otherCharacters?.[0].character.id,firstId,'previous character identity');
different(state.character?.classId,state.otherCharacters?.[0].character.classId,'character state is independent');

state=executeGameCommand(state,{type:'roster_switch',args:{id:firstId}},3).state;
equal(state.character?.id,firstId,'switched active character');
equal(state.otherCharacters?.[0].character.id,secondId,'switched character retained');
equal(state.character?.gold,100,'active wallet retained');
equal(state.otherCharacters?.[0].character.gold,100,'inactive wallet retained');

// World travel milestones belong to each character, not the shared account.
let world=executeGameCommand(newGame(1),{type:'create',args:{classId:'IRONWARDEN',name:'Veteran',body:'male'}},1,{characterId:firstId}).state;
world={...world,currentRegionId:'SUNSCAR',exploredRouteIds:['SCOUT_IRONWOOD','SCOUT_OLD_MINES','SCOUT_KINGS_ROAD'],defeatedBossIds:['FALLEN_KNIGHT'],unlockedMonsterIds:['MOSS_RAT','THORNLING'],quests:world.quests.map(q=>q.questId==='QST_014'?{...q,status:'claimed',progress:1}:q),account:{...world.account,unlockedCharacterSlots:2}};
world=executeGameCommand(world,{type:'roster_create',args:{classId:'BASTION',name:'Fresh',body:'female'}},2,{characterId:secondId}).state;
equal(world.defeatedBossIds.length,0,'new alternate must not inherit story boss');
equal(world.exploredRouteIds.length,0,'new alternate must not inherit scouting routes');
equal(world.otherCharacters?.[0].defeatedBossIds?.[0],'FALLEN_KNIGHT','first character retains its boss clear');
equal(world.otherCharacters?.[0].exploredRouteIds?.includes('SCOUT_KINGS_ROAD'),true,'first character retains Sunscar route');
world=executeGameCommand(world,{type:'roster_switch',args:{id:firstId}},3).state;
equal(world.defeatedBossIds.includes('FALLEN_KNIGHT'),true,'switch restores veteran boss');
equal((world.exploredRouteIds??[]).includes('SCOUT_KINGS_ROAD'),true,'switch restores veteran scouting');
equal(world.unlockedMonsterIds.includes('THORNLING'),true,'switch restores veteran monster discoveries');
world=executeGameCommand(world,{type:'roster_switch',args:{id:secondId}},4).state;
equal(world.defeatedBossIds.length,0,'switch back does not leak veteran boss');
equal(world.exploredRouteIds.length,0,'switch back does not leak veteran scouting');

// Existing saves created before this repair have no world flags in stored roster entries.
let legacy=executeGameCommand(world,{type:'roster_switch',args:{id:firstId}},5).state;
legacy=executeGameCommand(legacy,{type:'roster_switch',args:{id:secondId}},6).state;
legacy={...legacy,otherCharacters:legacy.otherCharacters?.map(entry=>entry.character.id===firstId?{...entry,exploredRouteIds:undefined,defeatedBossIds:undefined,unlockedMonsterIds:undefined}:entry)};
legacy=executeGameCommand(legacy,{type:'roster_switch',args:{id:firstId}},7).state;
equal(legacy.defeatedBossIds.includes('FALLEN_KNIGHT'),true,'legacy claimed Fallen Knight quest proves boss clear');
equal((legacy.exploredRouteIds??[]).includes('SCOUT_KINGS_ROAD'),true,'legacy Sunscar location proves prior scout access');
// Previously traveled back to Silverbrook: confirmed King's Road quest still proves the survey.
let legacyBacktracked={...legacy,currentRegionId:'SILVERBROOK',otherCharacters:legacy.otherCharacters?.map(entry=>entry.character.id===secondId?entry:{...entry,exploredRouteIds:undefined,defeatedBossIds:undefined,unlockedMonsterIds:undefined})};
legacyBacktracked=executeGameCommand(legacyBacktracked,{type:'roster_switch',args:{id:secondId}},8).state;
legacyBacktracked=executeGameCommand(legacyBacktracked,{type:'roster_switch',args:{id:firstId}},9).state;
equal((legacyBacktracked.exploredRouteIds??[]).includes('SCOUT_KINGS_ROAD'),true,'backtracked veteran restores Kings Road survey from claimed Lantern Wretches quest');

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const eas=JSON.parse(fs.readFileSync('eas.json','utf8')) as {build:Record<string,{env?:Record<string,string>} >};
for(const profile of ['preview','production']){
 const env=eas.build[profile]?.env??{};
 equal(env.EXPO_PUBLIC_SERVER_GAMEPLAY,'true',profile+' must enable server-owned gameplay');
 equal(env.EXPO_PUBLIC_COOP_ROGUELITE_V1,'true',profile+' must enable online co-op');
 equal(env.EXPO_PUBLIC_COOP_API_URL,'https://nyjwigipamnvpdvpauuv.supabase.co/functions/v1/coop',profile+' must target the deployed co-op Edge Function');
 equal(env.EXPO_PUBLIC_SUPABASE_URL,'https://nyjwigipamnvpdvpauuv.supabase.co',profile+' must target production Supabase');
 equal(env.EXPO_PUBLIC_COOP_LIVE_READY_V1,'true',profile+' exposes the Live matchmaking/ready flow');
 if(!env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))throw new Error(profile+' must use the Supabase publishable client key');
}
console.log('PASS online roster commands and Preview/Production online runtime configuration');
