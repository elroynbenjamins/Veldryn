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
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const eas=JSON.parse(fs.readFileSync('eas.json','utf8')) as {build:Record<string,{env?:Record<string,string>} >};
for(const profile of ['preview','production']){
 const env=eas.build[profile]?.env??{};
 equal(env.EXPO_PUBLIC_SERVER_GAMEPLAY,'true',profile+' must enable server-owned gameplay');
 equal(env.EXPO_PUBLIC_COOP_ROGUELITE_V1,'true',profile+' must enable online co-op');
 equal(env.EXPO_PUBLIC_COOP_API_URL,'https://nyjwigipamnvpdvpauuv.supabase.co/functions/v1/coop',profile+' must target the deployed co-op Edge Function');
 equal(env.EXPO_PUBLIC_SUPABASE_URL,'https://nyjwigipamnvpdvpauuv.supabase.co',profile+' must target production Supabase');
 equal(env.EXPO_PUBLIC_COOP_LIVE_READY_V1,'false',profile+' keeps experimental Live Ready UI gated');
 if(!env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))throw new Error(profile+' must use the Supabase publishable client key');
}
console.log('PASS online roster commands and Preview/Production online runtime configuration');
