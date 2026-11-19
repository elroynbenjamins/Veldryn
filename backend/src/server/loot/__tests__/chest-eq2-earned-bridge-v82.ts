import {
 planFrozenEarnedChestGearV82,CHEST_EARNED_EQ2_BRIDGE_V82_RELEASED,
} from '../chest-eq2-earned-bridge-v82';
import type {EarnedChestEntitlementV80} from '../chest-earned-entitlement-v80';
import type {FrozenChestReceiptV69} from '../chest-reward-settlement-v69';
import {worldBossChestLootTableV68} from '../../combat/world-boss-chests-v58';
import {partyChestLootTableV68} from '../../party/weekly-party-event-chests-v51';
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const event='33333333-3333-4333-8333-333333333333';
function check(ok:unknown,name:string):asserts ok{
 if(!ok)throw Error('chest_v82_test:'+name);
}
function rejects(fn:()=>unknown,code:string){
 let hit=false;try{fn()}catch(e){hit=String(e).includes(code)}
 check(hit,'reject_'+code);
}
function proof(world:boolean,tier:1|2|3|4|5|6|7|8|9){
 const table=world?worldBossChestLootTableV68({
  bossId:'hollowroot',kind:'donations_goal',
 }):partyChestLootTableV68({
  family:'broken_caravan',difficulty:'standard',kind:'participation',
 });
 const sourceKey=world?
  'world-boss:'+event+':'+account+':donations_goal':
  'party-event:'+Date.UTC(2026,10,16)+':'+account+':participation';
 const source:EarnedChestEntitlementV80={
  sourceKey,accountId:account,family:world?'world_boss':'party_event',
  tier,bossId:world?'hollowroot':null,proofVersion:'trusted-earn-v80',
  tableId:table.tableId,tableVersion:table.version,
  frozenLootTable:table,opened:false,paid:false,
  equipmentRolled:false,claimEnabled:false,alreadyEarned:false,
 };
 const groups=table.groups.map(group=>({
  groupId:group.id,type:group.type,chanceBps:group.chanceBps,
  hit:true,entryId:group.entries[0]!.id,
  quantity:group.entries[0]!.quantity??1,
 }));
 const selected=groups[0]!;
 const receipt:FrozenChestReceiptV69={
  rulesVersion:'chest-settlement-v69',sourceKey,accountId:account,
  recipientCharacterId:world?null:character,
  equipmentDeliveryMode:world?'account_unclaimed':'character',
  proofVersion:source.proofVersion,tableId:table.tableId,
  tableVersion:table.version,guaranteed:table.guarantees,
  groups,drops:[{
   groupId:selected.groupId,type:selected.type,
   entryId:selected.entryId!,quantity:selected.quantity,
  }],committed:true,
 };
 return {receipt,source};
}
check(!CHEST_EARNED_EQ2_BRIDGE_V82_RELEASED,'production_flag_off');
let tested=0;
for(const world of [false,true]){
 for(const tier of [1,2,3,4,5,6,7,8,9] as const){
  const {receipt,source}=proof(world,tier);
  const plan=planFrozenEarnedChestGearV82(receipt,0,source);
  check(plan!==null&&plan.sourceTier===tier&&plan.item.tier===tier&&
   plan.item.sourceKey===receipt.sourceKey&&
   plan.item.accountId===account&&
   plan.item.readyForIssuance===false&&
   !plan.claimEnabled&&!plan.safeToMint&&
   plan.phase===(tier>5?'deferred_future_tier':'unissued_t1_to_t5'),
   'preserve_frozen_tier_'+(world?'world':'party')+'_'+tier);
  check(plan.item.deliveryMode===(world?
   'account_unclaimed':'character')&&
   plan.item.statFamily===(world?
    'gathering_speed_only':'combat'),
   'preserve_distinct_item_family');
  tested++;
 }
}
const {receipt,source}=proof(true,3);
rejects(()=>planFrozenEarnedChestGearV82({
 ...receipt,accountId:character,
},0,source),'forged_earned_equipment_identity');
rejects(()=>planFrozenEarnedChestGearV82({
 ...receipt,tableVersion:'world_boss_v58_hollowroot_fake',
},0,source),'forged_earned_equipment_identity');
rejects(()=>planFrozenEarnedChestGearV82({
 ...receipt,guaranteed:[{id:'gold',quantity:999999}],
},0,source),'earned_loot_table_changed');
rejects(()=>planFrozenEarnedChestGearV82({
 ...receipt,groups:receipt.groups.map(g=>({...g,chanceBps:500})),
},0,source),'earned_loot_table_changed');
rejects(()=>planFrozenEarnedChestGearV82({
 ...receipt,drops:receipt.drops.map(x=>({...x,entryId:'helmet_fake'})),
},0,source),'earned_loot_table_changed');
rejects(()=>planFrozenEarnedChestGearV82({
 ...receipt,equipmentDeliveryMode:'character',
 recipientCharacterId:character,
},0,source),'wrong_account_custody');
rejects(()=>planFrozenEarnedChestGearV82(receipt,1,source),
 'invalid_drop_index');
rejects(()=>planFrozenEarnedChestGearV82(receipt,0,{
 ...source,paid:true,
} as EarnedChestEntitlementV80),'forged_earned_equipment_identity');
console.log('CHEST_EQ2_V82_OK: '+tested+
 ' frozen tier/boss/receipt-equipment paths; no T6–T9 downgrades, swapped rewards, custody changes or minting');
