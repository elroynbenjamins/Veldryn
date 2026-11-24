// Only executed in the in-memory QA bundle. Never deploy or import into the app.
import assert from 'node:assert/strict';
import {claimActivity,createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {executeGameCommand} from '../../../apps/mobile/src/core/game-commands';
import {processingRecipeDef} from '../../../apps/mobile/src/core/processing';
import {totalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {winterHearthMaxDonation,winterHearthUnlockedStock} from '../../../apps/mobile/src/core/winter-hearth-donations';
import {WINTER_HEARTH_2026_ID,WINTER_HEARTH_2026_START_MS,WINTER_HEARTH_2026_END_MS,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,WINTER_HEARTH_LIGHT_RECIPE_IDS} from '../../../apps/mobile/src/core/winter-hearth-2026';
import {WINTER_HEARTH_GUILD_RELEASED,FROSTFALL_REWARDS_RELEASED} from '../../../apps/mobile/src/core/release-flags';
import type {GameState} from '../../../apps/mobile/src/core/types';

assert.equal(WINTER_HEARTH_GUILD_RELEASED,true,'Test-only module overlay required');
assert.equal(FROSTFALL_REWARDS_RELEASED,false,'Do not activate unrelated seasonal rewards');
const start=WINTER_HEARTH_2026_START_MS+86400000,end=WINTER_HEARTH_2026_END_MS,light=WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID;
const quantity=(state:GameState,id:string)=>[...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks].filter(r=>r.itemId===id).reduce((sum,r)=>sum+r.quantity,0);
for(const [index,skill] of (['smithing','tailoring'] as const).entries()){
 const id=WINTER_HEARTH_LIGHT_RECIPE_IDS[index],recipe=processingRecipeDef(id);
 assert.ok(recipe,'Gated recipe resolves in QA');
 const primary=index===0?'COPPER_ORE':'MOSS_FIBER';
 const fresh=(now:number,level=4,enabled=true):GameState=>{
  const s=createCharacter(newGame(now),'IRONWARDEN','QA Processor');
  return {...s,character:{...s.character!,gold:100000},account:{...s.account,liveEvent:{eventId:WINTER_HEARTH_2026_ID,enabled,startsAtMs:WINTER_HEARTH_2026_START_MS,endsAtMs:end}},skills:s.skills.map(row=>row.skillId===skill?{...row,level,xp:totalXpAtLevel(level)}:row),inventory:{...s.inventory,stacks:[{itemId:primary,quantity:16},{itemId:'DEWLEAF',quantity:8},{itemId:'WISP_DUST',quantity:2}]}};
 };
 const begin=(s:GameState,now:number)=>executeGameCommand(s,{type:'processing_start',args:{id,batches:2,batchMode:'selected'}},now).state;
 const initial=fresh(start),reserved=begin(initial,start);
 assert.equal(reserved.activity?.processing?.remainingBatches,2);
 assert.equal(quantity(reserved,primary),0);assert.equal(quantity(reserved,'DEWLEAF'),0);assert.equal(quantity(reserved,'WISP_DUST'),0);
 assert.equal(reserved.character!.gold,initial.character!.gold-2*recipe.gold);
 assert.equal(quantity(reserved,light),0,'No lights before settlement');
 const cycle=reserved.activity!.processing!.cycleSeconds*1000;
 const done=claimActivity(reserved,start+Math.ceil(cycle*2)+1000);
 assert.equal(done.state.activity,null);assert.equal(done.reward.craftingActions,2);
 assert.equal(quantity(done.state,light),10,'Both batches create exactly ten lights at baseline');
 assert.ok(done.state.skills.find(r=>r.skillId===skill)!.xp>initial.skills.find(r=>r.skillId===skill)!.xp);
 assert.equal(winterHearthMaxDonation(winterHearthUnlockedStock(done.state,light),250,2500),10,'Crafted inventory is accepted by donation guard');
 assert.equal(quantity(claimActivity(done.state,start+Math.ceil(cycle*2)+2000).state,light),10,'Reclaim does not mint another batch');
 assert.throws(()=>begin(fresh(start,3),start));
 assert.throws(()=>begin(fresh(start,4,false),start));
 assert.throws(()=>begin(fresh(end),end));
 assert.throws(()=>begin(fresh(start-2*86400000),start-2*86400000));
 const nearEnd=end-Math.ceil(cycle*1.5),lateInitial=fresh(nearEnd),late=begin(lateInitial,nearEnd),closed=claimActivity(late,end+1000);
 assert.equal(closed.reward.craftingActions,1,'Only completed pre-cutoff cycle settles');
 assert.equal(closed.state.activity,null);
 assert.equal(quantity(closed.state,light),5);
 assert.equal(quantity(closed.state,primary),8);assert.equal(quantity(closed.state,'DEWLEAF'),4);assert.equal(quantity(closed.state,'WISP_DUST'),1);
 assert.equal(closed.state.character!.gold,lateInitial.character!.gold-recipe.gold,'Unfinished batch refunded');
 console.log('PASS actual '+skill+' reserve, claim, donate eligibility, replay, gate, expiry/refund');
}
