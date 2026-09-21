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

const rerolledId='33333333-3333-4333-8333-333333333333';
throws(()=>executeGameCommand(state,{type:'roster_reroll',args:{id:secondId,classId:'HEXWEAVER',name:'Reborn',body:'female',confirmation:'wrong'}},4,{characterId:rerolledId}),'reroll requires exact old-name confirmation');
state=executeGameCommand(state,{type:'roster_reroll',args:{id:secondId,classId:'HEXWEAVER',name:'Reborn',body:'female',confirmation:'Second'}},4,{characterId:rerolledId}).state;
equal(state.otherCharacters?.[0].character.id,rerolledId,'inactive reroll receives authoritative replacement identity');
equal(state.otherCharacters?.[0].character.classId,'HEXWEAVER','inactive reroll replaces character class');
equal(state.otherCharacters?.[0].character.level,1,'reroll resets personal progression');
equal(state.character?.id,firstId,'inactive reroll does not change the active character');
state=executeGameCommand(state,{type:'roster_delete',args:{id:rerolledId,confirmation:'Reborn'}},5).state;
equal(state.otherCharacters?.length,0,'confirmed delete removes the inactive character');
throws(()=>executeGameCommand(state,{type:'roster_delete',args:{id:firstId,confirmation:'First'}},6),'last character cannot be deleted');
state=executeGameCommand(state,{type:'roster_reroll',args:{id:firstId,classId:'DAWNKEEPER',name:'First Reborn',body:'male',confirmation:'First'}},6,{characterId:secondId}).state;
equal(state.character?.id,secondId,'last-character reroll receives a fresh authoritative identity');
equal(state.character?.classId,'DAWNKEEPER','last-character reroll is the supported class-change path');
console.log('PASS online roster create, switch, reroll and delete commands preserve safe character state');
