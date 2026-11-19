import type {GameState} from '../../../../apps/mobile/src/core/types';
import {itemDef} from '../../../../apps/mobile/src/content/items';
import {findEffectGem,type GemGrade} from './gems/gem-catalog-v1';
import {readEquipmentV2VirtualCustody,type V2VirtualMoveReceipt} from './equipment-crafting-v2-virtual-custody';
import type {V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import type {V2DraftItem} from './equipment-crafting-v2-transaction';
import type {V2GemSidecarState} from './equipment-crafting-v2-gem-sidecar';
import {V2DraftCraftError} from './equipment-crafting-v2-transaction';

/**
 * Server-only effect-gem eligibility for the unreleased Equipment/Combat 2.0
 * shadow loadout. It NEVER applies combat effects, predicts procs or updates
 * live equipped gear. The effect catalog's per-family max applies to
 * simultaneously equipped copies on ONE character, not the entire account.
 *
 * Until V33 + V2 mixed-gear effects can be compiled with one authority, a
 * character with legacy worn equipment is deliberately ineligible.
 */
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
function effectIdentity(id:string){
 if(typeof id!=='string')fail('invalid_v2_effect_gem_identity');
 const match=/^gem:(effect_[a-z0-9_]+):g([1-5])$/.exec(id);
 if(!match)fail('invalid_v2_effect_gem_identity');
 let actual:ReturnType<typeof itemDef>;
 try{actual=itemDef(id);}catch{return fail('unknown_v2_effect_gem');}
 if(actual.type!=='gem'||actual.gemKind!=='effect'||actual.gemFamilyId!==match[1]
  ||actual.gemGrade!==Number(match[2]))fail('invalid_v2_effect_gem_identity');
 const definition=findEffectGem(match[1]);
 if(!definition)fail('unsupported_v2_effect_gem');
 return {definition,grade:Number(match[2]) as GemGrade};
}
export interface V2EffectGemPolicyInput{
 state:GameState;accountId:string;actorCharacterId:string;
 items:readonly V2DraftItem[];
 reservations:readonly V2HiddenStorageReservation[];
 custodyReceipts:readonly V2VirtualMoveReceipt[];
 installed:V2GemSidecarState;
 targetInstanceId:string;incomingGemId:string;
}
export interface V2EffectGemEligibility{
 familyId:string;grade:GemGrade;
 equippedCopiesAfter:number;resonance:1|2|3;
 maxEquippedCopies:number;
 /** Preview-only total of underlying base effect scalar, NOT proc damage. */
 scalarAfter:number;
 targetInstanceId:string;
 combatReady:false;physicallyDelivered:false;
}
export function validateEquipmentV2EffectGemInstall(input:V2EffectGemPolicyInput):V2EffectGemEligibility{
 const {state,accountId,actorCharacterId,items,reservations,
  custodyReceipts,installed,targetInstanceId,incomingGemId}=input;
 if(!state?.character||!accountId||state.character.id!==actorCharacterId)
  fail('untrusted_v2_effect_actor');
 if(!Array.isArray(items)||!Array.isArray(reservations)
  ||!Array.isArray(custodyReceipts)||!installed||!Array.isArray(installed.slots))
  fail('invalid_v2_effect_snapshot');
 if(Object.values(state.character.equipment??{}).some(Boolean))
  fail('v2_mixed_legacy_effect_loadout_unverified');
 const copies=readEquipmentV2VirtualCustody(items,reservations,custodyReceipts);
 const target=copies.find(row=>row.instanceId===targetInstanceId);
 if(!target||target.location!=='equipped'||target.holderCharacterId!==actorCharacterId)
  fail('v2_effect_requires_equipped_copy');
 if(!items.some(item=>item.id===targetInstanceId&&item.accountId===accountId))
  fail('invalid_v2_effect_copy_owner');
 const {definition,grade}=effectIdentity(incomingGemId);
 const worn=new Set(copies.filter(row=>row.location==='equipped'
  &&row.holderCharacterId===actorCharacterId).map(row=>row.instanceId));
 const current=new Map(installed.slots.map(row=>[row.instanceId,row]));
 // Every currently installed effect on the active loadout needs one canonical
 // family identity. This includes the target's original socket to be replaced.
 let identical=0,scalar=definition.values[grade];
 for(const id of worn){
  const socket=current.get(id)?.effect;
  if(!socket||id===targetInstanceId)continue;
  const existing=effectIdentity(socket.gemId);
  if(!Number.isSafeInteger(socket.rollPercent)||socket.rollPercent<80||socket.rollPercent>120
   ||(socket.rollPercent-80)%5!==0)fail('invalid_v2_effect_roll');
  if(existing.definition.familyId===definition.familyId){
   identical++;
   scalar+=existing.definition.values[existing.grade]*socket.rollPercent/100;
  }
 }
 const count=identical+1;
 if(count>definition.maxEquippedCopies)fail('v2_effect_equipped_family_cap');
 return {
  familyId:definition.familyId,grade,equippedCopiesAfter:count,
  resonance:Math.min(3,count) as 1|2|3,
  maxEquippedCopies:definition.maxEquippedCopies,
  scalarAfter:Number(scalar.toFixed(6)),
  targetInstanceId,
  combatReady:false,physicallyDelivered:false,
 };
}
