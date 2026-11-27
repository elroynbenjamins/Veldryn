// Run only in an isolated test checkout with the Winter Hearth flag enabled.
// Normal core runs must preserve the hidden-release fence.
import {claimActivity,createCharacter,newGame,previewActivityReward,stopActivity,craftRecipe} from '../src/core/game';
import {startProcessingBatch,processingAvailability} from '../src/core/processing';
import {normalizeSave} from '../src/core/save-normalization';
import {totalXpAtLevel} from '../src/core/progression';
import {WINTER_HEARTH_GUILD_RELEASED} from '../src/core/release-flags';
import {WINTER_HEARTH_2026_ID,WINTER_HEARTH_2026_START_MS,WINTER_HEARTH_2026_END_MS,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,WINTER_HEARTH_LIGHT_RECIPE_IDS,winterHearthRemainingCraftBatches,winterHearthCraftWeekEndMs} from '../src/core/winter-hearth-2026';
import type {GameState} from '../src/core/types';
const ok=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
const qty=(s:GameState,id:string)=>[s.inventory.stacks,s.bank.stacks,s.overflow.stacks].flat().filter(row=>row.itemId===id).reduce((n,row)=>n+row.quantity,0);
if(WINTER_HEARTH_GUILD_RELEASED){
 for(const [index,skill] of (['smithing','tailoring'] as const).entries()){
  const recipe=WINTER_HEARTH_LIGHT_RECIPE_IDS[index],primary=skill==='smithing'?'COPPER_ORE':'MOSS_FIBER';
  const end=WINTER_HEARTH_2026_END_MS,start=end-60000;
  let state=createCharacter(newGame(start),'IRONWARDEN','Winter QA');
  state={...state,account:{...state.account,liveEvent:{eventId:WINTER_HEARTH_2026_ID,enabled:true,startsAtMs:WINTER_HEARTH_2026_START_MS,endsAtMs:end}},character:{...state.character!,gold:10000},skills:state.skills.map(row=>row.skillId===skill?{...row,level:4,xp:totalXpAtLevel(4)}:row),inventory:{...state.inventory,stacks:[{itemId:primary,quantity:24},...(skill==='tailoring'?[{itemId:'COPPER_ORE',quantity:12}]:[]),{itemId:'DEWLEAF',quantity:12},{itemId:'WISP_DUST',quantity:3}]}};
  if(skill==='tailoring'){
    const noCopper={...state,inventory:{...state.inventory,stacks:state.inventory.stacks.filter(row=>row.itemId!=='COPPER_ORE')}};
    ok(!processingAvailability(noCopper,recipe,1,false,start).ready,'Tailoring requires Copper Ore');
   }
   const reserved=startProcessingBatch(state,recipe,3,start);
  const batch=reserved.activity!.processing!,gold=batch.goldPerBatch;
  ok(qty(reserved,primary)===0&&qty(reserved,'DEWLEAF')===0&&qty(reserved,'WISP_DUST')===0,'Original inputs reserved exactly: '+skill);
   ok(qty(reserved,'COPPER_ORE')===0,'Copper Ore reserved exactly: '+skill);
  ok(reserved.character!.gold===10000-3*gold,'Gold reserved exactly');
  ok(batch.seasonEndsAtMs===end,'Season deadline stored in reservation');
  const restored=normalizeSave(reserved);
  ok(restored.activity?.processing?.seasonEndsAtMs===end,'Deadline survives save normalization');
  const expected=Math.min(3,Math.floor(59.999/batch.cycleSeconds));
  ok(expected>=1&&expected<3,'Test includes both completed and unfinished batches');
  const preview=previewActivityReward(restored,end+3600000);
  ok(preview.craftingActions===expected,'Offline preview stops at season cutoff');
  const settled=claimActivity(restored,end+3600000);
  ok(settled.reward.craftingActions===expected&&!settled.state.activity,'Expired reservation settles then closes');
  ok(qty(settled.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===expected*5,'Only completed lights minted');
  ok(qty(settled.state,primary)===(3-expected)*8&&qty(settled.state,'DEWLEAF')===(3-expected)*4&&qty(settled.state,'WISP_DUST')===3-expected,'Unfinished inputs refunded exactly');
   ok(qty(settled.state,'COPPER_ORE')===(3-expected)*(skill==='tailoring'?4:8),'Unfinished Copper Ore refunded exactly');
  ok(settled.state.character!.gold===10000-expected*gold,'Unfinished Gold refunded exactly');
  const again=claimActivity(settled.state,end+7200000);
  ok(qty(again.state,primary)===qty(settled.state,primary)&&qty(again.state,'COPPER_ORE')===qty(settled.state,'COPPER_ORE')&&qty(again.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===qty(settled.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID),'No second refund or mint');
  let blocked=false;try{startProcessingBatch(state,recipe,1,end);}catch{blocked=true;}
  ok(blocked,'No reservation at exact deadline');
  console.log('PASS actual released-test crafting, save round trip, offline settlement and refund: '+skill);
 }

 // Cross-profession and cross-character reservation/claim cap.
 const start=WINTER_HEARTH_2026_START_MS+60000,smith=WINTER_HEARTH_LIGHT_RECIPE_IDS[0],tailor=WINTER_HEARTH_LIGHT_RECIPE_IDS[1];
 let base=createCharacter(newGame(start),'IRONWARDEN','Winter Cap QA');
 base={...base,account:{...base.account,liveEvent:{eventId:WINTER_HEARTH_2026_ID,enabled:true,startsAtMs:WINTER_HEARTH_2026_START_MS,endsAtMs:WINTER_HEARTH_2026_END_MS}},character:{...base.character!,gold:100000},skills:base.skills.map(row=>row.skillId==='smithing'||row.skillId==='tailoring'?{...row,level:4,xp:totalXpAtLevel(4)}:row),inventory:{...base.inventory,stacks:[{itemId:'COPPER_ORE',quantity:1000},{itemId:'MOSS_FIBER',quantity:1000},{itemId:'DEWLEAF',quantity:1000},{itemId:'WISP_DUST',quantity:1000}]}};
 const throws=(work:()=>unknown,message:string)=>{let blocked=false;try{work();}catch{blocked=true;}ok(blocked,message);};
 ok(processingAvailability(base,smith,1,false,start).maxBatches===50,'Initial weekly capacity 50 batches');
 throws(()=>startProcessingBatch(base,smith,51,start),'Cannot reserve 255 lights');
 throws(()=>craftRecipe(base,smith,start),'No instant seasonal craft bypass');
 const altRun=startProcessingBatch(base,smith,20,start);
 const alt={character:{...altRun.character!,id:'winter-alt'},activity:altRun.activity,inventory:altRun.inventory,overflow:altRun.overflow,skills:altRun.skills,quests:altRun.quests,currentRegionId:altRun.currentRegionId} as NonNullable<GameState['otherCharacters']>[number];
 const withAlt={...base,otherCharacters:[alt]};
 ok(winterHearthRemainingCraftBatches(withAlt,start)===30,'Inactive character reservations count across professions');
 throws(()=>startProcessingBatch(withAlt,tailor,31,start),'Alt cannot oversubscribe shared allowance');
 const reserved=startProcessingBatch(withAlt,tailor,30,start);
 ok(winterHearthRemainingCraftBatches(reserved,start)===0,'All reserved batches consume shared allowance');
 const cancelled=stopActivity(reserved,start);
 ok(winterHearthRemainingCraftBatches(cancelled,start)===30,'Cancelling releases uncompleted allowance');
 const settled=claimActivity(reserved,start+reserved.activity!.processing!.cycleSeconds*30*1000+1000);
 ok(qty(settled.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===150,'Exact fixed output; no yield bonus exceeds cap');
 ok(winterHearthRemainingCraftBatches(settled.state,start)===0,'Completed and inactive reservations count together');
 const restored=normalizeSave(settled.state);
 ok(winterHearthRemainingCraftBatches(restored,start)===0,'Craft ledger and inactive reservations survive normalization');
 const repeated=claimActivity(restored,start+3600000);
 ok(qty(repeated.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===150,'No replay mint');
 const reset=winterHearthCraftWeekEndMs(start);
 ok(winterHearthRemainingCraftBatches(restored,reset)===50,'UTC Monday reset, previous week reservations do not consume new allowance');
 const crossing=startProcessingBatch(base,smith,50,reset-1000);
 const afterReset=claimActivity(crossing,reset+3600000);
 ok(!afterReset.state.activity&&qty(afterReset.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===0,'No old reservation completion after reset');
 ok(qty(afterReset.state,'COPPER_ORE')===qty(base,'COPPER_ORE')&&afterReset.state.character!.gold===base.character!.gold,'Unfinished weekly reservation refunded');
 ok(winterHearthRemainingCraftBatches(afterReset.state,reset)===50,'Full new-week allowance after refund');
 console.log('PASS cross-profession/account reservation cap, settlement, cancellation, save normalization and UTC reset');
}else{console.log('SKIP Winter Hearth enabled integration (normal release fence is off)');}
