import {v2ServerEquipPreview,v2ServerExactTemplateConsistent,type V2ExactEquipmentTemplate} from './equipment-crafting-v2-instances';

/** Hidden, read-only per-instance custody policy.
 * It NEVER changes balances, gem slots, equipment records, or the shared Bank.
 * The eventual gameplay command must run these checks against the authenticated
 * full account snapshot, including LEGACY equipment and storage capacities.
 */
export type V2CustodyLocation='inventory'|'pouch'|'bank'|'equipped';
export interface V2CustodyCopy{
 instanceId:string;accountId:string;ownerCharacterId:string|null;
 location:V2CustodyLocation;equippedSlot?:V2ExactEquipmentTemplate['slot'];
 item:V2ExactEquipmentTemplate;locked:boolean;favorite:boolean;
}
export interface V2CustodyCharacter{
 id:string;classId:string;level:number;
}
export interface V2CustodyState{
 accountId:string;characters:readonly V2CustodyCharacter[];
 copies:readonly V2CustodyCopy[];
}
export type V2CustodyIntent=
 |{kind:'deposit_bank';actorCharacterId:string;instanceId:string}
 |{kind:'withdraw_bank';actorCharacterId:string;instanceId:string}
 |{kind:'equip';actorCharacterId:string;instanceId:string}
 |{kind:'unequip';actorCharacterId:string;instanceId:string};
export type V2CustodyDenial=
 |'ok'|'duplicate_instance'|'unknown_character'|'unknown_item'
 |'invalid_item_snapshot'|'wrong_owner'|'wrong_location'|'wrong_class'
 |'level_locked'|'invalid_character_level'|'must_unequip_conflicts';
export interface V2CustodyPlan{
 allowed:boolean;reason:V2CustodyDenial;
 /** Explicit old item IDs: never silently lose, destroy or extract gear/gems. */
 conflictingEquippedInstanceIds:readonly string[];
 nextLocation?:V2CustodyLocation;nextOwnerCharacterId?:string|null;
}
const fail=(reason:V2CustodyDenial,conflicts:readonly string[]=[]):V2CustodyPlan=>({
 allowed:false,reason,conflictingEquippedInstanceIds:conflicts,
});
/** Inventory/pouch capacity and legacy 10-slot compatibility are still
 * required from the live online game snapshot before a real move is allowed.
 */
export function v2ServerCustodyPreflight(state:V2CustodyState,intent:V2CustodyIntent):V2CustodyPlan{
 if(!state||!intent||!Array.isArray(state.copies)||!Array.isArray(state.characters))
  return fail('unknown_item');
 const actor=state.characters.find(row=>row.id===intent.actorCharacterId);
 if(!actor)return fail('unknown_character');
 const matches=state.copies.filter(row=>row.instanceId===intent.instanceId);
 if(matches.length>1)return fail('duplicate_instance');
 const copy=matches[0];
 if(!copy||copy.accountId!==state.accountId)return fail('unknown_item');
 if(!v2ServerExactTemplateConsistent(copy.item))return fail('invalid_item_snapshot');
 if(intent.kind==='withdraw_bank'){
  if(copy.location!=='bank')return fail('wrong_location');
  return {allowed:true,reason:'ok',conflictingEquippedInstanceIds:[],
   nextLocation:'pouch',nextOwnerCharacterId:actor.id};
 }
 if(copy.ownerCharacterId!==actor.id)return fail('wrong_owner');
 if(intent.kind==='deposit_bank'){
  if(copy.location!=='inventory'&&copy.location!=='pouch')return fail('wrong_location');
  return {allowed:true,reason:'ok',conflictingEquippedInstanceIds:[],
   nextLocation:'bank',nextOwnerCharacterId:null};
 }
 if(intent.kind==='unequip'){
  if(copy.location!=='equipped'||copy.equippedSlot!==copy.item.slot)return fail('wrong_location');
  return {allowed:true,reason:'ok',conflictingEquippedInstanceIds:[],
   nextLocation:'pouch',nextOwnerCharacterId:actor.id};
 }
 if(intent.kind==='equip'){
  if(copy.location!=='inventory'&&copy.location!=='pouch')return fail('wrong_location');
  const alreadyWorn=state.copies.filter(row=>row.location==='equipped'
    &&row.ownerCharacterId===actor.id&&row.instanceId!==copy.instanceId)
   .map(row=>({instanceId:row.instanceId,item:row.item}));
  const eligible=v2ServerEquipPreview({newItem:copy.item,characterClass:actor.classId,
   characterLevel:actor.level,equipped:alreadyWorn});
  if(!eligible.allowed)return fail(eligible.reason as V2CustodyDenial);
  if(eligible.replace.length)return fail('must_unequip_conflicts',eligible.replace);
  return {allowed:true,reason:'ok',conflictingEquippedInstanceIds:[],
   nextLocation:'equipped',nextOwnerCharacterId:actor.id};
 }
 return fail('wrong_location');
}
