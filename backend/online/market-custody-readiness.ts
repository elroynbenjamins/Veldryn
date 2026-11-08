import type {CharacterState,GameState,GearSlot,ItemStack} from '../../apps/mobile/src/core/types';
import {itemDef} from '../../apps/mobile/src/content/items';
import {auditCraftedGearOwnership} from '../../apps/mobile/src/core/crafted-gear-ownership';
import {craftedGearInstances,isValidCraftedGearQuality} from '../../apps/mobile/src/core/crafted-gear-instances';
import {equipmentPouchForCharacter} from '../../apps/mobile/src/core/equipment-pouch';
import {gemPouch} from '../../apps/mobile/src/core/gem-pouch';
import {marketCatalogCandidate} from '../../apps/mobile/src/core/player-market-readiness';
import {workingTowardInventoryProtectionMap} from '../../apps/mobile/src/core/working-toward-inventory';

/**
 * Internal server-only inspection. Never import into gameplay routes or mobile
 * views until the snapshot-to-escrow reconciliation protocol is implemented.
 *
 * Online VELDRYN's canonical state is the versioned online_game_states JSON
 * snapshot. Legacy relational item_instances are not interchangeable with it.
 */
export const MARKET_SNAPSHOT_ESCROW_BRIDGE_READY_V1=false as const;

export type MarketCustodyStorageV1='inventory'|'bank'|'equipment_pouch'|'gem_pouch';
export type MarketCustodyKindV1='resource'|'gem'|'equipment';

export interface MarketCustodyInspectionRowV1 {
  sourceLocation:MarketCustodyStorageV1;
  sourceLocator:string;
  sourceCharacterId?:string;
  sourceRevision:number;
  itemId:string;
  assetKind:MarketCustodyKindV1;
  quantity:number;
  exactInstanceId?:string;
  immutableAttributes:Record<string,unknown>;
  /** Requires policy, binding and server snapshot reconciliation before use. */
  problems:string[];
  canEscrowNow:false;
}
export interface MarketCustodyInspectionV1{
  ownerAccountId:string;
  sourceRevision:number;
  sourceBridgeReady:false;
  accountVerified:boolean;
  ownershipProblems:string[];
  rows:MarketCustodyInspectionRowV1[];
  canEscrowNow:false;
}

/** Read-only discovery. NEVER write these rows directly as spendable inventory.
 * A future migration must atomically lock online_game_states, compare revision,
 * debit its exact stored stack/copy, create a custody hold and commit together.
 * Ordinary gameplay commits must reject holds until that transaction exists.
 */
export function inspectPlayerMarketCustodySnapshotV1(
  state:GameState,ownerAccountId:string,sourceRevision:number,
):MarketCustodyInspectionV1{
  const accountVerified=typeof ownerAccountId==='string'&&ownerAccountId.length>0
    &&state.account.longTermAccountScopeId===ownerAccountId
    &&Number.isSafeInteger(sourceRevision)&&sourceRevision>=0;
  const blocked:MarketCustodyInspectionV1={
    ownerAccountId,sourceRevision,sourceBridgeReady:false,accountVerified,
    ownershipProblems:[],rows:[],canEscrowNow:false,
  };
  if(!accountVerified){
    blocked.ownershipProblems.push('account_or_revision_unverified');
    return blocked;
  }
  const audit=auditCraftedGearOwnership(state);
  blocked.ownershipProblems.push(...audit.problems);
  if(audit.unlocatedInstanceIds.length)blocked.ownershipProblems.push('unlocated_forged_copies');
  if(audit.unmarkedPhysicalCopies>0)blocked.ownershipProblems.push('unmarked_legacy_copies');
  const records=new Map(craftedGearInstances(state).map(row=>[row.id,row]));
  const savedLoadouts=[state.character,...(state.otherCharacters??[]).map(row=>row.character)]
    .flatMap(character=>character?.savedLoadouts??[]);
  const heldInLoadout=(itemId:string,instanceId:string)=>
    savedLoadouts.some(loadout=>Object.entries(loadout.equipment).some(([slot,id])=>
      id===itemId&&(loadout.equipmentInstanceIds?.[slot as GearSlot]===instanceId
        ||!loadout.equipmentInstanceIds?.[slot as GearSlot])));
  // Protect all active + inactive characters' goals before projecting resources.
  const goals=new Set<string>();
  for(const character of [state.character,...(state.otherCharacters??[]).map(row=>row.character)]){
    if(!character)continue;
    try{
      const projection={...state,character};
      for(const id of workingTowardInventoryProtectionMap(projection).keys())goals.add(id);
    }catch{
      blocked.ownershipProblems.push('goal_reservation_unverified');
    }
  }

  const add=(location:MarketCustodyStorageV1,stacks:readonly ItemStack[],
             character:CharacterState|undefined)=>{
    for(let index=0;index<stacks.length;index++){
      const stack=stacks[index];
      if(!stack||typeof stack.itemId!=='string')continue;
      const problems:string[]=['snapshot_bridge_not_implemented','binding_status_unverified'];
      if(!Number.isSafeInteger(stack.quantity)||stack.quantity<=0)
        problems.push('invalid_quantity');
      if(!marketCatalogCandidate(stack.itemId))
        problems.push('restricted_or_unknown_item');
      if(goals.has(stack.itemId))problems.push('working_toward_reserved');
      if(state.settings.favoriteItemIds?.includes(stack.itemId))
        problems.push('favorite_protected');
      if(state.settings.lockedItemIds?.includes(stack.itemId))
        problems.push('item_locked');
      let kind:MarketCustodyKindV1='resource';
      try{
        const definition=itemDef(stack.itemId);
        kind=definition.type==='gear'?'equipment':
          definition.type==='gem'||definition.rawGemFamilyId?'gem':'resource';
      }catch{problems.push('unknown_item');}
      let immutableAttributes:Record<string,unknown>={};
      if(kind==='equipment'){
        if(!stack.instanceId || stack.quantity!==1){
          problems.push('legacy_or_invalid_equipment_identity');
        }else{
          const receipt=records.get(stack.instanceId);
          const located=audit.linked.filter(row=>row.instanceId===stack.instanceId);
          if(!audit.consistent||located.length!==1
            ||located[0].place!==location
            ||located[0].holderCharacterId!==character?.id && location!=='bank')
            problems.push('equipment_ownership_conflict');
          if(!receipt||receipt.itemId!==stack.itemId)
            problems.push('missing_exact_equipment_receipt');
          else{
            if(receipt.locked)problems.push('equipment_locked');
            if(heldInLoadout(stack.itemId,stack.instanceId))
              problems.push('saved_loadout_reserved');
            if(!isValidCraftedGearQuality(receipt.quality))
              problems.push('legacy_quality_unverified');
            // This is metadata for an audit, not a transferable item payload.
            immutableAttributes={
              rarity:receipt.rarity,quality:receipt.quality??null,
              statRoll:receipt.statRoll??null,acquireSource:receipt.acquireSource,
              sourceReceiptKey:receipt.sourceReceiptKey,
              enhancement:{...receipt.enhancement,gemIds:[...receipt.enhancement.gemIds]},
            };
          }
        }
      }else if(stack.instanceId!==undefined)problems.push('unexpected_copy_id');
      blocked.rows.push({
        sourceLocation:location,
        sourceLocator:(character?.id??'account')+':'+location+':'+index,
        sourceCharacterId:character?.id,
        sourceRevision,itemId:stack.itemId,assetKind:kind,
        quantity:stack.quantity,exactInstanceId:stack.instanceId,
        immutableAttributes,problems,canEscrowNow:false,
      });
    }
  };
  const current=state.character;
  if(current){
    add('inventory',state.inventory.stacks,current);
    add('equipment_pouch',equipmentPouchForCharacter(current).stacks,current);
  }
  for(const entry of state.otherCharacters??[]){
    add('inventory',entry.inventory.stacks,entry.character);
    add('equipment_pouch',equipmentPouchForCharacter(entry.character).stacks,entry.character);
  }
  add('bank',state.bank.stacks,undefined);
  add('gem_pouch',gemPouch(state).stacks,undefined);
  return blocked;
}
