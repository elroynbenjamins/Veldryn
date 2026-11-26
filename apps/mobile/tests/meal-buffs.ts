import {createCharacter,newGame,claimActivity,offlineCapSeconds} from '../src/core/game';
import {transitionActivity} from '../src/core/playability';
import {executeGameCommand} from '../src/core/game-commands';
import {mealBonusDef,MEAL_BONUSES,eatMealForBonus,normalizeMealBuff,commitMealActivityTime,MAX_MEAL_BUFF_SECONDS,projectedMealDuration} from '../src/core/meal-buffs';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {processingRecipeDef,processingRunCapacity,startProcessingBatch} from '../src/core/processing';
import {normalizeSave} from '../src/core/save-normalization';
import type {GameState} from '../src/core/types';
import {recipeDef} from '../src/content/skills';
import {itemDef} from '../src/content/items';
import {localizedItemName} from '../src/i18n/starter-item-names';

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
 ['IRONWOOD_STEW',4,3,'gathering_speed'],
 ['SUNSCAR_SPICED_PLATTER',6,3,'combat_xp'],
 ['GLASSFIN_FEAST',6,4,'gathering_speed'],
 ['FROSTED_ICEFIN',6,4,'crafting_speed'],
 ['CHARRED_EMBERFIN',8,4,'combat_xp'],
 ['ASHLANDS_EMBER_STEW',8,4,'crafting_speed'],
] as const;
ok(MEAL_BONUSES.length===6,'exactly six special meal buffs');
for(const [recipeId,itemId,level,gold] of [
 ['COOK_SUNSCAR_SPICED_PLATTER','SUNSCAR_SPICED_PLATTER',30,230],
] as const){
 const recipe=recipeDef(recipeId);
 if(!recipe)throw new Error('Missing recipe: '+recipeId);
 ok(recipe.level===level&&recipe.gold===gold&&recipe.skillId==='cooking',recipeId+' exact unlock and final Gold');
 ok(recipe.output.itemId===itemId&&recipe.output.quantity===1&&recipe.repeatableTraining,recipeId+' repeatable meal output');
 ok(itemDef(itemId).type==='food'&&!!itemDef(itemId).heal,itemId+' valid healing food');
 for(const input of recipe.inputs)ok(itemDef(input.itemId).id===input.itemId,'valid recipe ingredient');
 const stocked=fresh();
 stocked.inventory.stacks=recipe.inputs.map(input=>({...input,quantity:input.quantity*3}));
 stocked.skills=stocked.skills.map(row=>row.skillId==='cooking'?{...row,level:level-1}:row);
 throws(()=>startProcessingBatch(stocked,recipeId,1,now),recipeId+' cannot craft below unlock');
 stocked.skills=stocked.skills.map(row=>row.skillId==='cooking'?{...row,level}:row);
 const run=startProcessingBatch(stocked,recipeId,1,now);
 ok(run.activity?.processing?.outputPerBatch.itemId===itemId,recipeId+' uses normal reserved cooking run');
 for(const lang of ['en','de','es','nl','it','fr','ru','tr'] as const)ok(!!localizedItemName(lang,itemId),itemId+' localized name '+lang);
}
for(const [id,percent,hours,kind] of expected){
 const def=mealBonusDef(id);
 if(!def)throw new Error('Missing special meal definition: '+id);
 ok(def.percent===percent&&def.durationHours===hours&&def.kind===kind,id+' must keep doubled approved rate and duration');
 const before=fresh(),after=executeGameCommand(before,{type:'meal_bonus',args:{id}},now).state,stats=characterPermanentMultipliers(after);
 ok(after.inventory.stacks.find(row=>row.itemId===id)?.quantity===3,'explicit meal consumes one inventory item');
 ok(after.character?.activeMealBuff?.itemId===id&&after.character.activeMealBuff.remainingSeconds===hours*3600,'meal grants exact duration');
 ok((kind==='gathering_speed')?stats.gatheringSpeedMultiplier>characterPermanentMultipliers(before).gatheringSpeedMultiplier:true,id+' gathering benefit');
 ok((kind==='crafting_speed')?stats.craftingSpeedMultiplier>characterPermanentMultipliers(before).craftingSpeedMultiplier:true,id+' crafting benefit');
 ok(kind==='combat_xp'?stats.characterXpMultiplier>characterPermanentMultipliers(before).characterXpMultiplier:true,id+' combat XP benefit');
 const baseline=characterPermanentMultipliers(before),epsilon=.00001;
 const multiplier=kind==='gathering_speed'?stats.gatheringSpeedMultiplier/baseline.gatheringSpeedMultiplier:kind==='crafting_speed'?stats.craftingSpeedMultiplier/baseline.craftingSpeedMultiplier:kind==='combat_xp'?stats.characterXpMultiplier/baseline.characterXpMultiplier:stats.craftingSpeedMultiplier/baseline.craftingSpeedMultiplier;
 ok(Math.abs(multiplier-(1+percent/100))<epsilon,id+' must apply exactly its doubled rate, without changing other bonus sources');
 ok(def.label.includes('+'+percent+'%'),id+' player-facing label must match the new rate');
 const restored=normalizeSave(structuredClone(after));
 ok(restored.character?.activeMealBuff?.remainingSeconds===hours*3600,'active meal persists through save normalization');
}
// All bonus meals can accumulate duration, but not strength, to 24 hours.
for(const def of MEAL_BONUSES){
 let stacked=fresh();
 const stock=stacked.inventory.stacks.find(row=>row.itemId===def.itemId)!;
 stock.quantity=12;
 const portions=24/def.durationHours;
 for(let i=1;i<=portions;i++){
  stacked=executeGameCommand(stacked,{type:'meal_bonus',args:{id:def.itemId}},now).state;
  ok(stacked.character?.activeMealBuff?.remainingSeconds===i*def.durationHours*3600,'same meal extends time by one portion');
 }
 ok(stacked.inventory.stacks.find(row=>row.itemId===def.itemId)?.quantity===12-portions,'one portion per activation');
 const before=JSON.stringify(stacked);
 throws(()=>eatMealForBonus(stacked,def.itemId),'full cap rejects extra food');
 ok(JSON.stringify(stacked)===before,'rejected activation does not consume food');
 ok(normalizeSave(structuredClone(stacked)).character?.activeMealBuff?.remainingSeconds===MAX_MEAL_BUFF_SECONDS,'24h duration survives save normalization');
 const one=eatMealForBonus(fresh(),def.itemId);
 ok(JSON.stringify(characterPermanentMultipliers(one))===JSON.stringify(characterPermanentMultipliers(stacked)),'duration stacking cannot stack bonus strength');
 const partial={...stacked,character:{...stacked.character!,activeMealBuff:{itemId:def.itemId,remainingSeconds:MAX_MEAL_BUFF_SECONDS-60}}};
 ok(projectedMealDuration(partial.character,def.itemId)===MAX_MEAL_BUFF_SECONDS,'partial top-up clamps to cap');
 ok(eatMealForBonus(partial,def.itemId).character?.activeMealBuff?.remainingSeconds===MAX_MEAL_BUFF_SECONDS,'partial top-up never exceeds cap');
 throws(()=>normalizeMealBuff({itemId:def.itemId,remainingSeconds:MAX_MEAL_BUFF_SECONDS+1}),'save cannot exceed cap');
 const offline=commitMealActivityTime(stacked,{kind:'combat',targetId:'test',startedAtMs:now,lastClaimAtMs:now},{xp:0,gold:0,items:[],kills:0,elapsedSeconds:3600});
 ok(offline.character?.activeMealBuff?.remainingSeconds===MAX_MEAL_BUFF_SECONDS-3600,'active time drains stacked duration');
}
const resourceCosts:Record<string,number[]>={COOK_IRONWOOD_STEW:[6,3,5],COOK_SUNSCAR_SPICED_PLATTER:[12,4,5],COOK_GLASSFIN_FEAST:[9,3,5],COOK_ICEFISH:[9,3,5],COOK_EMBERFIN:[9,3,5],COOK_ASHLANDS_EMBER_STEW:[10,5,5]};
for(const [id,quantities] of Object.entries(resourceCosts))ok(JSON.stringify(recipeDef(id)?.inputs.map(row=>row.quantity))===JSON.stringify(quantities),id+' increased bonus meal material costs');
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

// Crafting meals must not speed class drills; active time still drains normally.
const noBuffTraining=executeGameCommand(fresh(),{type:'class_training'},now).state;
const boostedTraining=executeGameCommand(executeGameCommand(fresh(),{type:'meal_bonus',args:{id:'ASHLANDS_EMBER_STEW'}},now).state,{type:'class_training'},now).state;
const baseline59=claimActivity(noBuffTraining,now+59000);
const boosted59=claimActivity(boostedTraining,now+59000);
ok((baseline59.reward.trainingActions??0)===0,'baseline class drills need 60 seconds');
ok((boosted59.reward.trainingActions??0)===(baseline59.reward.trainingActions??0),'Ashlands crafting meal must not speed class drills');
const ashlands=executeGameCommand(fresh(),{type:'meal_bonus',args:{id:'ASHLANDS_EMBER_STEW'}},now).state;
const ashStats=characterPermanentMultipliers(ashlands),baseStats=characterPermanentMultipliers(fresh());
ok(Math.abs(ashStats.craftingSpeedMultiplier/baseStats.craftingSpeedMultiplier-1.08)<.00001,'Ashlands grants exactly 8% crafting speed');
ok(ashStats.gatheringSpeedMultiplier===baseStats.gatheringSpeedMultiplier,'Ashlands does not boost gathering');
ok(ashStats.characterXpMultiplier===baseStats.characterXpMultiplier,'Ashlands does not boost combat XP');
ok(MEAL_BONUSES.every(meal=>meal.kind!=='noncombat_speed'),'no broad noncombat speed meal remains');
const shortTraining={...boostedTraining,character:{...boostedTraining.character!,activeMealBuff:{itemId:'ASHLANDS_EMBER_STEW',remainingSeconds:60}}} as GameState;
const drillOne=claimActivity(shortTraining,now+120000);
const drillPart=claimActivity(shortTraining,now+60000);
const drillTwo=claimActivity(drillPart.state,now+120000);
ok(!drillOne.state.character?.activeMealBuff,'class drill sessions consume meal active time');
ok(JSON.stringify(drillOne.state.character?.classSkills)===JSON.stringify(drillTwo.state.character?.classSkills),'class drill rewards match across offline split and sequential claims');
ok((drillOne.reward.trainingActions??0)===(drillPart.reward.trainingActions??0)+(drillTwo.reward.trainingActions??0),'class drill action summary includes both sides of meal expiry');

console.log('PASS special meals: doubled rates, activation, nonstacking, save security, AFK expiry and repeatable stew');
