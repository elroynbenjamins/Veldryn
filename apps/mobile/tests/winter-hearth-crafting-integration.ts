// Run only in an isolated test checkout with the Winter Hearth flag enabled.
// Normal core runs must preserve the hidden-release fence.
import {claimActivity,createCharacter,newGame,previewActivityReward} from '../src/core/game';
import {startProcessingBatch} from '../src/core/processing';
import {normalizeSave} from '../src/core/save-normalization';
import {totalXpAtLevel} from '../src/core/progression';
import {WINTER_HEARTH_GUILD_RELEASED} from '../src/core/release-flags';
import {WINTER_HEARTH_2026_ID,WINTER_HEARTH_2026_START_MS,WINTER_HEARTH_2026_END_MS,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,WINTER_HEARTH_LIGHT_RECIPE_IDS} from '../src/core/winter-hearth-2026';
import type {GameState} from '../src/core/types';
const ok=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
const qty=(s:GameState,id:string)=>[s.inventory.stacks,s.bank.stacks,s.overflow.stacks].flat().filter(row=>row.itemId===id).reduce((n,row)=>n+row.quantity,0);
if(WINTER_HEARTH_GUILD_RELEASED){
 for(const [index,skill] of (['smithing','tailoring'] as const).entries()){
  const recipe=WINTER_HEARTH_LIGHT_RECIPE_IDS[index],primary=skill==='smithing'?'COPPER_ORE':'MOSS_FIBER';
  const end=WINTER_HEARTH_2026_END_MS,start=end-60000;
  let state=createCharacter(newGame(start),'IRONWARDEN','Winter QA');
  state={...state,account:{...state.account,liveEvent:{eventId:WINTER_HEARTH_2026_ID,enabled:true,startsAtMs:WINTER_HEARTH_2026_START_MS,endsAtMs:end}},character:{...state.character!,gold:10000},skills:state.skills.map(row=>row.skillId===skill?{...row,level:4,xp:totalXpAtLevel(4)}:row),inventory:{...state.inventory,stacks:[{itemId:primary,quantity:24},{itemId:'DEWLEAF',quantity:12},{itemId:'WISP_DUST',quantity:3}]}};
  const reserved=startProcessingBatch(state,recipe,3,start);
  const batch=reserved.activity!.processing!,gold=batch.goldPerBatch;
  ok(qty(reserved,primary)===0&&qty(reserved,'DEWLEAF')===0&&qty(reserved,'WISP_DUST')===0,'All three inputs reserved exactly: '+skill);
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
  ok(settled.state.character!.gold===10000-expected*gold,'Unfinished Gold refunded exactly');
  const again=claimActivity(settled.state,end+7200000);
  ok(qty(again.state,primary)===qty(settled.state,primary)&&qty(again.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===qty(settled.state,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID),'No second refund or mint');
  let blocked=false;try{startProcessingBatch(state,recipe,1,end);}catch{blocked=true;}
  ok(blocked,'No reservation at exact deadline');
  console.log('PASS actual released-test crafting, save round trip, offline settlement and refund: '+skill);
 }
}else{console.log('SKIP Winter Hearth enabled integration (normal release fence is off)');}
