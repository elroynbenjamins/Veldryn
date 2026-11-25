/** Quote-only, no inventory writes or reward grants. */
import {ITEMS} from '../content/items';
import {scoutingMissionQuote} from './exploration-scouting-missions-review';
import type {CompanionStaminaFoodSelection} from './companion-stamina-selection';
import {companionExpeditionPenCapacity,rolloverCompanionAssignmentStatuses} from '../../../../backend/src/server/companions/assignments';
import {COMPANION_EXPEDITION_PEN_DURATION_REDUCTION} from '../../../../backend/src/server/companions/content';
import type {ScoutAuthority,ScoutReceipt,ScoutState} from './exploration-scouting-review';
type Quote=Extract<ReturnType<typeof scoutingMissionQuote>,{ok:true}>;
export function scoutingCampOverview(state:ScoutState,authority:ScoutAuthority,receipts:readonly ScoutReceipt[],pensLevel:number,now:number){
 const legacy=rolloverCompanionAssignmentStatuses(authority.legacyAssignments,now);
 const camps=(authority.campAssignments??[]).filter(a=>a.accountId===state.accountId&&a.status==='active');
 const training=receipts.filter(a=>a.accountId===state.accountId&&a.status==='active');
 const active=legacy.filter(a=>a.status==='active').length+camps.filter(a=>a.endsAt>now).length;
 const capacity=companionExpeditionPenCapacity(pensLevel);
 return {capacity,active,free:Math.max(0,capacity-active),durationReduction:COMPANION_EXPEDITION_PEN_DURATION_REDUCTION[pensLevel]??0,
  xpSlotBusy:training.length>0||camps.some(a=>a.explorationXp>0),
  legacyClaims:legacy.filter(a=>a.status==='completed').map(a=>({id:a.assignmentId,missionId:a.missionId,claimKind:'legacy' as const})),
  campClaims:camps.filter(a=>a.endsAt<=now).map(a=>({id:a.assignmentId,missionId:a.missionId,characterId:a.characterId,claimKind:'scouting' as const}))};
}
export function scoutingProvisionQuote(quote:Quote,balances:{gold:number;materials:Readonly<Record<string,number>>},food:readonly CompanionStaminaFoodSelection[]){
 const fail=(reason:string)=>({ok:false as const,reason});
 if(!Number.isSafeInteger(balances.gold)||balances.gold<quote.costs.gold)return fail('missing_gold');
 const required:Record<string,number>={...quote.costs.materials};const used=new Set<string>();let hp=0;
 for(const row of food){
  const item=ITEMS.find(i=>i.id===row.itemId);
  if(!item||item.type!=='food'||!item.heal||used.has(row.itemId)||!Number.isSafeInteger(row.quantity)||row.quantity<=0)return fail('invalid_food');
  used.add(row.itemId);required[row.itemId]=(required[row.itemId]??0)+row.quantity;hp+=item.heal*row.quantity;
  if(!Number.isSafeInteger(hp)||!Number.isSafeInteger(required[row.itemId]))return fail('invalid_food');
 }
 if(hp<quote.healingHpRequired)return fail('missing_stamina');
 for(const [id,qty] of Object.entries(required))if(!Number.isSafeInteger(balances.materials[id]??0)||(balances.materials[id]??0)<qty)return fail('missing_material:'+id);
 return {ok:true as const,goldCost:quote.costs.gold,materialCosts:required,healingHp:hp,extraStaminaBonus:0 as const,issued:false as const};
}
