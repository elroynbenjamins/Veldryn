import {
 CHEST_EQUIPMENT_BRIDGE_V71_RELEASED,
 planChestEquipmentV71,assertChestEq2PhysicalReadbackV71,
 type ChestEq2PhysicalReadbackV71,type ChestEq2TierV71,
} from '../chest-equipment-bridge-v71';
import type {FrozenChestReceiptV69} from '../chest-reward-settlement-v69';
import {
 PARTY_EVENT_GEAR_FAMILIES_V51,partyEventGearForFamilyV51,
} from '../../party/weekly-party-event-gear-v51';
import {WORLD_BOSS_GEAR_SLOTS_V58} from '../../combat/world-boss-chests-v58';
import {worldBossGatheringPiecesV64} from '../../combat/world-boss-gathering-loot-v64';

function ok(value:unknown,label:string):asserts value{
 if(!value)throw Error('chest_v71_test:'+label);
}
function rejects(fn:()=>unknown,expected:string){
 let hit=false;try{fn()}catch(e){hit=String(e).includes(expected)}
 ok(hit,'reject_'+expected);
}
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const tierList=[1,2,3,4,5,6,7,8,9] as const;
const partyKey='party-event:'+Date.UTC(2026,10,16)+':'+account+':participation';
const worldKey='world-boss:33333333-3333-4333-8333-333333333333:'+
 account+':donations_goal';
function receipt(input:{
 tableId:string;tableVersion:string;sourceKey:string;entryId:string;
 delivery:'character'|'account_unclaimed';character:string|null;
}):FrozenChestReceiptV69{
 return {
  rulesVersion:'chest-settlement-v69',sourceKey:input.sourceKey,
  accountId:account,proofVersion:'trusted-canonical-proof',
  recipientCharacterId:input.character,
  equipmentDeliveryMode:input.delivery,
  tableId:input.tableId,tableVersion:input.tableVersion,
  guaranteed:[],groups:[{
   groupId:'equipment',type:'equipment',chanceBps:100,
   hit:true,entryId:input.entryId,quantity:1,
  }],
  drops:[{groupId:'equipment',type:'equipment',
   entryId:input.entryId,quantity:1}],committed:true,
 };
}
function physical(candidate:ReturnType<typeof planChestEquipmentV71>):
 ChestEq2PhysicalReadbackV71{
 return {
  sourceKey:candidate.sourceKey,grantSourceKey:candidate.sourceKey,
  accountId:candidate.accountId,
  recipientCharacterId:candidate.recipientCharacterId,
  storage:candidate.deliveryMode==='character'?
   'character_inventory':'account_unclaimed',
  itemInstanceId:'44444444-4444-4444-8444-444444444444',
  pieceId:candidate.pieceId,templateKey:candidate.templateKey,
  setId:candidate.setId,slot:candidate.slot,tier:candidate.tier,
  statFamily:candidate.statFamily,
  rarity:'epic',quality:92,
  exactStatSnapshotHash:'a'.repeat(64),
  exactItemReceiptVersion:'equipment-v2-event-verified-v1',
  sameTransactionPhysicalReadback:true,
 };
}
ok(!CHEST_EQUIPMENT_BRIDGE_V71_RELEASED,'hidden_release_gate');
let partyCount=0,worldCount=0;
for(const family of PARTY_EVENT_GEAR_FAMILIES_V51){
 for(const piece of partyEventGearForFamilyV51(family)){
  for(const tier of tierList){
   const r=receipt({sourceKey:partyKey,entryId:piece.id,
    tableId:'party_event_chest',
    tableVersion:'party_event_v51_'+family+'_participation_standard',
    delivery:'character',character});
   const c=planChestEquipmentV71(r,0,{tier});
   ok(c.pieceId===piece.id&&c.setId===piece.setId&&
    c.slot===piece.slot&&c.tier===tier&&
    c.templateKey===piece.id+':T'+tier&&
    c.family==='party_combat'&&c.statFamily==='combat'&&
    !c.readyForIssuance&&c.blockers.length>=3,
    'party_v51_exact_template_'+piece.id+'_'+tier);
   if(tier>=5)ok(c.blockers.some(x=>x.includes('t5_to_t9')),
    'high_tier_eq2_missing');
   assertChestEq2PhysicalReadbackV71(c,physical(c));
   partyCount++;
  }
 }
}
for(const bossId of ['hollowroot','sunscar','frostmarch'] as const){
 for(const slot of WORLD_BOSS_GEAR_SLOTS_V58){
  const piece=worldBossGatheringPiecesV64(bossId)
   .find(item=>item.slot===slot);
  ok(!!piece,'canonical_world_boss_piece');
  for(const tier of tierList){
   const r=receipt({sourceKey:worldKey,entryId:slot,
    tableId:'world_boss_chest',
    tableVersion:'world_boss_v58_'+bossId+'_donations_goal',
    delivery:'account_unclaimed',character:null});
   const c=planChestEquipmentV71(r,0,{tier,bossId});
   ok(c.pieceId===piece.itemId&&c.setId===piece.setId&&
    c.slot===slot&&c.tier===tier&&
    c.statFamily==='gathering_speed_only'&&
    c.deliveryMode==='account_unclaimed'&&
    c.recipientCharacterId===null&&!c.readyForIssuance,
    'world_gathering_only_'+bossId+'_'+slot+'_'+tier);
   assertChestEq2PhysicalReadbackV71(c,physical(c));
   worldCount++;
  }
 }
}
const pe=partyEventGearForFamilyV51('broken_caravan')[0]!;
const p=receipt({sourceKey:partyKey,entryId:pe.id,
 tableId:'party_event_chest',
 tableVersion:'party_event_v51_broken_caravan_participation_standard',
 delivery:'character',character});
const candidate=planChestEquipmentV71(p,0,{tier:3});
const db=physical(candidate);
rejects(()=>planChestEquipmentV71({...p,drops:[
 {...p.drops[0]!,quantity:2},
]},0,{tier:3}),'not_single_equipment_drop');
rejects(()=>planChestEquipmentV71({...p,
 equipmentDeliveryMode:'account_unclaimed',recipientCharacterId:null,
},0,{tier:3}),'party_template_or_owner_mismatch');
rejects(()=>planChestEquipmentV71({...p,
 tableVersion:'party_event_v51_nightfall_hunt_participation_standard',
},0,{tier:3}),'party_template_or_owner_mismatch');
rejects(()=>planChestEquipmentV71(p,0,{
 tier:10 as ChestEq2TierV71,
}),'untrusted_equipment_source');
rejects(()=>planChestEquipmentV71({...p,tableId:'future_event_chest'},0,{
 tier:3,
}),'no_registered_equipment_family');
for(const [change,expected] of [
 [{accountId:character},'forged_or_uncommitted_item'],
 [{recipientCharacterId:null},'forged_or_uncommitted_item'],
 [{itemInstanceId:account},'forged_or_uncommitted_item'],
 [{itemInstanceId:character},'forged_or_uncommitted_item'],
 [{templateKey:'EQ2_CRAFT_FAKE'},'forged_or_uncommitted_item'],
 [{setId:'FORGED_SET'},'forged_or_uncommitted_item'],
 [{statFamily:'gathering_speed_only'},'forged_or_uncommitted_item'],
 [{exactStatSnapshotHash:'invalid'},'forged_or_uncommitted_item'],
 [{quality:101},'forged_or_uncommitted_item'],
 [{sameTransactionPhysicalReadback:false},'forged_or_uncommitted_item'],
] as const){
 rejects(()=>assertChestEq2PhysicalReadbackV71(candidate,{
  ...db,...change,
 } as ChestEq2PhysicalReadbackV71),expected);
}
console.log('CHEST_EQ2_V71_OK: '+partyCount+' Party piece/tier candidates, '+
 worldCount+' World gathering-only candidates, immutable custody, no EQ2 synthetic item or enabled issuance');
