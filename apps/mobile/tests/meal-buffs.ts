import {createCharacter,newGame,claimActivity,offlineCapSeconds} from '../src/core/game';
import {transitionActivity} from '../src/core/playability';
import {executeGameCommand} from '../src/core/game-commands';
import {mealBonusDef,MEAL_BONUSES,eatMealForBonus,normalizeMealBuff,commitMealActivityTime} from '../src/core/meal-buffs';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {processingRecipeDef,processingRunCapacity} from '../src/core/processing';
import {normalizeSave} from '../src/core/save-normalization';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
function throws(fn:()=>unknown,message:string){let rejected=false;try{fn()}catch{rejected=true;}ok(rejected,message);}
const now=Date.UTC(2026,10,2);
const fresh=()=>{
 const state=createCharacter(newGame(now),'IRONWARDEN','Meal Tester');
 return {...state,character:{...state.character!,gold:500000},inventory:{...state.inventory,stacks:[
  ...MEAL_BONUSES.map(row=>({itemId:row.itemId,quantity:4})),{itemId:'RIVER_EEL',quantity:40},{itemId:'THORN_SAP',quantity:20},{itemId:'IRONWOOD_LOG',quantity:20},
  {itemId:'GREENWOOD_LOG',quantity:100}
 ]}} as GameState;
};
const expected=[
 ['IRONWOOD_STEW',2,3,'gathering_speed'],
 ['GLASSFIN_FEAST',3,4,'gathering_speed'],
 ['FROSTED_ICEFIN',3,4,'crafting_speed'],
 ['CHARRED_EMBERFIN',4,4,'combat_xp'],
 ['ASHLANDS_EMBER_STEW',5,4,'noncombat_speed'],
] as const;
ok(MEAL_BONUSES.length===5,'exactly five special meal buffs');
for(const [id,percent,hours,kind] of expected){
 const def=mealBonusDef(id);
 ok(def?.percent===percent&&def.durationHours===hours&&def.kind===kind,id+' must keep doubled approved rate and duration');
 const before=fresh(),after=executeGameCommand(before,{type:'meal_bonus',args:{id}},now).state,stats=characterPermanentMultipliers(after);
 ok(after.inventory.stacks.find(row=>row.itemId===id)?.quantity===3,'explicit meal consumes one inventory item');
 ok(after.character?.activeMealBuff?.itemId===id&&after.character.activeMealBuff.remainingSeconds===hours*3600,'meal grants exact duration');
 ok((kind==='gathering_speed'||kind==='noncombat_speed')?stats.gatheringSpeedMultiplier>characterPermanentMultipliers(before).gatheringSpeedMultiplier:true,id+' gathering benefit');
 ok((kind==='crafting_speed'||kind==='noncombat_speed')?stats.craftingSpeedMultiplier>characterPermanentMultipliers(before).craftingSpeedMultiplier:true,id+' crafting benefit');
 ok(kind==='combat_xp'?stats.characterXpMultiplier>characterPermanentMultipliers(before).characterXpMultiplier:true,id+' combat XP benefit');
 const restored=normalizeSave(structuredClone(after));
 ok(restored.character?.activeMealBuff?.remainingSeconds===hours*3600,'active meal persists through save normalization');
}
let state=fresh();
state=executeGameCommand(state,{type:'meal_bonus',args:{id:'GLASSFIN_FEAST'}},now).state;
state=executeGameCommand(state,{type:'meal_bonus',args:{id:'FROSTED_ICEFIN'}},now).state;
ok(state.character?.activeMealBuff?.itemId==='FROSTED_ICEFIN','new meal replaces old: never stacks');
ok(characterPermanentMultipliers(state).gatheringSpeedMultiplier===characterPermanentMultipliers(fresh()).gatheringSpeedMultiplier,'replaced gathering bonus must stop');
throws(()=>eatMealForBonus(state,'COOKED_SILVERFIN'),'normal auto-eat food cannot grant a special buff');
throws(()=>normalizeMealBuff({itemId:'GLASSFIN_FEAST',remainingSeconds:999999}),'oversized saved bonus fails closed');
throws(()=>executeGameCommand(state,{type:'meal_bonus',args:{id:'FROSTED_ICEFIN',quantity:20}},now),'forged client quantity is rejected');
const healed=executeGameCommand(fresh(),{type:'eat',args:{id:'IRONWOOD_STEW'}},now).state;
ok(!healed.character?.activeMealBuff,'ordinary Eat and combat auto-eat never activate bonus');
ok(processingRecipeDef('COOK_IRONWOOD_STEW'),'stew uses the same repeatable Cooking activity path');
const available=processingRunCapacity(fresh(),'COOK_IRONWOOD_STEW',offlineCapSeconds(fresh()),true);
ok(available.availableBatches>1,'stew capacity includes multiple continuous batches');
const started=executeGameCommand(fresh(),{type:'processing_start',args:{id:'COOK_IRONWOOD_STEW'}},now).state;
ok((started.activity?.processing?.remainingBatches??0)>1,'server reserves the maximum available stew batches');
const idle=commitMealActivityTime(state,null,{xp:0,gold:0,items:[],kills:0,elapsedSeconds:900});
ok(idle.character?.activeMealBuff?.remainingSeconds===state.character?.activeMealBuff?.remainingSeconds,'idle time must not consume meal duration');
const gather=transitionActivity(executeGameCommand(fresh(),{type:'meal_bonus',args:{id:'GLASSFIN_FEAST'}},now).state,now,{kind:'gathering',id:'GREENWOOD_TREE'}).state;
const active=claimActivity(gather,now+5*3600000);
ok(!active.state.character?.activeMealBuff,'a five-hour offline session must expire a four-hour meal boost');
ok(active.reward.kills>0,'expired meal does not cancel gathering progress');
const again=claimActivity(active.state,now+5*3600000);
ok(again.reward.kills===0,'claiming same interval cannot duplicate rewards');
console.log('PASS special meals: doubled rates, activation, nonstacking, save security, AFK expiry and repeatable stew');
