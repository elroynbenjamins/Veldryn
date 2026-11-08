import {createCharacter,newGame} from '../src/core/game';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {marketCatalogCandidate,previewPlayerMarketListing} from '../src/core/player-market-readiness';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import type {GameState} from '../src/core/types';

const check=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
const base=createCharacter(newGame(0),'BASTION','Market Readiness');
const clean={...base,character:{...base.character!,progressionGoals:[]}};
check(marketCatalogCandidate('COPPER_ORE'),'Gathered resources should be market candidates');
check(!marketCatalogCandidate('HOLY_WATER'),'Special zero-value resources remain restricted');
check(!marketCatalogCandidate('nonexistent_item'),'Unknown items must always be restricted');
check(!marketCatalogCandidate('TRAVEL_RATION'),'Food is not part of the initial market scope');

const resource:GameState={...clean,inventory:{...clean.inventory,stacks:[{itemId:'COPPER_ORE',quantity:50}]}};
const partial=previewPlayerMarketListing(resource,'inventory',0,12);
check(partial.candidate&&partial.availableQuantity===50&&partial.requestedQuantity===12,
  'Partial-stack resource previews must preserve exact available and requested quantities');
check(!partial.canListNow&&partial.blockedBy.includes('market_not_released'),
  'An eligible preview must never enable a player listing');
check(previewPlayerMarketListing(resource,'inventory',0,51).blockedBy.includes('invalid_quantity'),
  'Overdrawing a resource stack must fail closed');
check(previewPlayerMarketListing(resource,'inventory',0,0).blockedBy.includes('invalid_quantity'),
  'Zero-quantity listings must fail closed');
check(previewPlayerMarketListing(resource,'inventory',999,1).blockedBy.includes('missing_stack'),
  'Stale stack positions must fail closed');
const resourceLocked={...resource,settings:{...resource.settings,lockedItemIds:['COPPER_ORE']}};
check(!previewPlayerMarketListing(resourceLocked,'inventory',0,1).candidate,
  'Locked resources must stay unavailable');
const resourceFav={...resource,settings:{...resource.settings,favoriteItemIds:['COPPER_ORE']}};
check(previewPlayerMarketListing(resourceFav,'inventory',0,1).blockedBy.includes('favorite_protected'),
  'Favorite resources must not be accidentally listed');
const protectedGoal={...resource,character:{...resource.character!,progressionGoals:[{
  id:'goal-1',kind:'item_quantity' as const,itemId:'COPPER_ORE',targetQuantity:25,title:'Save copper',
}]}};
check(previewPlayerMarketListing(protectedGoal,'inventory',0,1).blockedBy.includes('working_toward_reserved'),
  'Working Toward materials must remain protected');

const gearId=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='BASTION'&&row.v33EquipmentTier==='T1')!.output.itemId;
const record=draftCraftedGearInstance({
  itemId:gearId,ownerCharacterId:base.character!.id,jobId:'market-exact-1',createdAtMs:1000,roll:.24,
});
const exact:GameState={...clean,character:{...clean.character!,equipmentPouch:{
  capacity:30,stacks:[{itemId:gearId,quantity:1,instanceId:record.id}],
}},account:{...clean.account,craftedGearInstances:[record]}};
const preview=previewPlayerMarketListing(exact,'equipment_pouch',0,1);
check(preview.candidate&&preview.instanceId===record.id&&!preview.canListNow,
  'Exact unmodified Forge receipt should pass advisory validation without enabling trading');
check(previewPlayerMarketListing(exact,'equipment_pouch',0,2).blockedBy.includes('invalid_quantity'),
  'A forged item cannot be listed as two copies');
const legacy={...exact,character:{...exact.character!,equipmentPouch:{
  capacity:30,stacks:[{itemId:gearId,quantity:1}],
}}};
check(previewPlayerMarketListing(legacy,'equipment_pouch',0,1).blockedBy.includes('legacy_equipment_unverified'),
  'Untagged legacy gear may not use an arbitrary forged receipt');
const locked:GameState={...exact,account:{...exact.account,craftedGearInstances:[{...record,locked:true}]}};
check(previewPlayerMarketListing(locked,'equipment_pouch',0,1).blockedBy.includes('equipment_locked'),
  'Per-copy gear locks must take precedence');
const noQuality:GameState={...exact,account:{...exact.account,craftedGearInstances:[{...record,quality:undefined}]}};
check(previewPlayerMarketListing(noQuality,'equipment_pouch',0,1).blockedBy.includes('legacy_quality_unverified'),
  'Legacy receipts lacking a real quality roll need reconciliation');
const gearSlot=itemDef(gearId).slot!;
const saved:GameState={...exact,character:{...exact.character!,savedLoadouts:[{
  id:'saved-1',slotIndex:0,name:'Dungeon',classId:'BASTION',createdAtMs:0,updatedAtMs:0,
  equipment:{[gearSlot]:gearId},equipmentInstanceIds:{[gearSlot]:record.id},
}]}};
check(previewPlayerMarketListing(saved,'equipment_pouch',0,1).blockedBy.includes('saved_loadout_reserved'),
  'Saved equipment loadouts must protect referenced instances');
const duplicated:GameState={...exact,inventory:{...exact.inventory,stacks:[{
  itemId:gearId,quantity:1,instanceId:record.id,
}]}};
check(previewPlayerMarketListing(duplicated,'equipment_pouch',0,1).blockedBy.includes('equipment_identity_conflict'),
  'Duplicate equipment markers must block all market previews');
const forgedStackInGemPouch={...exact,account:{...exact.account,gemPouch:{
  capacity:30,stacks:[{itemId:'COPPER_ORE',quantity:1,instanceId:record.id}],
}}};
check(previewPlayerMarketListing(forgedStackInGemPouch,'gem_pouch',0,1).blockedBy.includes('missing_stack'),
  'Invalid gem-pouch content must not be manufactured as a listing');
check(exact.character?.equipmentPouch?.stacks[0].instanceId===record.id
  &&record.quality===exact.account.craftedGearInstances?.[0]?.quality,
  'Market readiness checks must never consume or rewrite equipment');
console.log('PASS: player market remains disabled; stack, binding and exact-copy guards are read-only');
