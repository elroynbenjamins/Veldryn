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
 return {...state,skills:state.skills.map(sk=>sk.skillId==='cooking'?{...sk,level:80}:sk),character:{...state.character!,gold:500000},inventory:{...state.inventory,stacks:[
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

// Starting a meal while Cooking is running must preserve escrow and partial progress.
const cookingRun=executeGameCommand(fresh(),{type:'processing_start',args:{id:'COOK_IRONWOOD_STEW'}},now).state;
const priorCycle=cookingRun.activity!.processing!.cycleSeconds,priorReserved=cookingRun.activity!.processing!.remainingBatches;
const foodBefore=cookingRun.inventory.stacks.find(row=>row.itemId==='FROSTED_ICEFIN')!.quantity;
const activated=executeGameCommand(cookingRun,{type:'meal_bonus',args:{id:'FROSTED_ICEFIN'}},now+15000).state;
ok(activated.activity?.kind==='processing'&&activated.activity.processing!.cycleSeconds<priorCycle,'eating a crafting meal speeds an ongoing reserved run');
ok(activated.activity!.processing!.remainingBatches===priorReserved,'changing meal speed never grants extra reserved batches');
ok(Math.abs((activated.activity!.progressFraction??0)-15000/(priorCycle*1000))<.001,'already earned partial cooking progress is preserved');
ok(activated.inventory.stacks.find(row=>row.itemId==='FROSTED_ICEFIN')!.quantity===foodBefore-1,'meal activation costs exactly one food');

// AFK expiry must match sequential settlement and restore normal cycle timing.
const sample={...activated,character:{...activated.character!,activeMealBuff:{itemId:'FROSTED_ICEFIN',remainingSeconds:20}}} as GameState;
const oneShot=claimActivity(sample,now+135000);
const a=claimActivity(sample,now+35000);
const manual=claimActivity(a.state,now+135000);
ok(!oneShot.state.character?.activeMealBuff,'short active meal expires during a longer AFK claim');
ok(Math.abs((oneShot.state.activity?.processing?.cycleSeconds??0)-priorCycle)<.0001,'remaining cooking cycles return to original unboosted speed');
ok(oneShot.state.activity?.processing?.remainingBatches===manual.state.activity?.processing?.remainingBatches,'one long claim matches two short claims for reserved work');
ok((oneShot.state.inventory.stacks.find(row=>row.itemId==='IRONWOOD_STEW')?.quantity??0)===(manual.state.inventory.stacks.find(row=>row.itemId==='IRONWOOD_STEW')?.quantity??0),'claim split does not duplicate or lose food');
ok(oneShot.state.skills.find(row=>row.skillId==='cooking')?.xp===manual.state.skills.find(row=>row.skillId==='cooking')?.xp,'claim split awards exactly the same Cooking XP');
ok((oneShot.reward.craftingActions??0)===(a.reward.craftingActions??0)+(manual.reward.craftingActions??0),'claim summary includes actions from both sides of expiry');
ok(claimActivity(oneShot.state,now+135000).reward.craftingActions===0,'repeat settlement at the same timestamp is idempotent');

// All noncombat skills include the class-skill drill loop; speed stops at expiry.
const noBuffTraining=executeGameCommand(fresh(),{type:'class_training'},now).state;
const boostedTraining=executeGameCommand(executeGameCommand(fresh(),{type:'meal_bonus',args:{id:'ASHLANDS_EMBER_STEW'}},now).state,{type:'class_training'},now).state;
const baseline59=claimActivity(noBuffTraining,now+59000);
const boosted59=claimActivity(boostedTraining,now+59000);
ok((baseline59.reward.trainingActions??0)===0,'baseline class drills need 60 seconds');
ok((boosted59.reward.trainingActions??0)>=1,'Ashlands meal increases class drill speed by 5%');
const shortTraining={...boostedTraining,character:{...boostedTraining.character!,activeMealBuff:{itemId:'ASHLANDS_EMBER_STEW',remainingSeconds:60}}} as GameState;
const drillOne=claimActivity(shortTraining,now+120000);
const drillPart=claimActivity(shortTraining,now+60000);
const drillTwo=claimActivity(drillPart.state,now+120000);
ok(!drillOne.state.character?.activeMealBuff,'class drill sessions consume meal active time');
ok(JSON.stringify(drillOne.state.character?.classSkills)===JSON.stringify(drillTwo.state.character?.classSkills),'class drill rewards match across offline split and sequential claims');
ok((drillOne.reward.trainingActions??0)===(drillPart.reward.trainingActions??0)+(drillTwo.reward.trainingActions??0),'class drill action summary includes both sides of meal expiry');

console.log('PASS special meals: doubled rates, activation, nonstacking, save security, AFK expiry and repeatable stew');
