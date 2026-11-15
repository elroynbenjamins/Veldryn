/**
 * Party Events v28 — an immutable, nonpaying projection of one future reward.
 *
 * This module maps the actual v2 reward bundle onto canonical Veldryn
 * GameState fields and progression functions. It does NOT commit anything,
 * create a claim, update SQL, send Inbox mail, or bypass the v25/v27 gates.
 *
 * The caller must hold the account's ordinary gameplay transaction lock and
 * recheck every source against freshly locked rows before a later payment.
 */
import type {GameState,SkillId,ItemStack} from '../../apps/mobile/src/core/types';
import {awardClassSkillXp,characterClassSkills,MAX_CLASS_SKILL_XP}
  from '../../apps/mobile/src/core/class-skills';
import {levelFromXp,totalXpAtLevel}
  from '../../apps/mobile/src/core/progression';
import {entitlementStorageCapacity}
  from '../../apps/mobile/src/core/account-entitlements';
import {partyEventRewardBundle}
  from '../src/server/party/weekly-party-rewards-v2';
import type {PartyEventCacheChoice}
  from '../src/server/party/weekly-party-rewards-v2';
import type {VerifiedPartyEventEvidenceV27}
  from '../src/server/party/weekly-party-settlement-evidence-v27';

export const PARTY_EVENT_SAVE_PROJECTION_V28_RELEASED=false;
export const PARTY_EVENT_MATERIAL_STACK_CAP_V28=99_999;
const MAX_SAFE=Number.MAX_SAFE_INTEGER;
const GEM_DUST='GEM_DUST' as const;
const PROFESSION_CAP=totalXpAtLevel(100);

function must(ok:unknown,reason:string):asserts ok{
 if(!ok)throw Error('party_event_v28_'+reason);
}
function validCount(value:unknown,name:string):number{
 must(typeof value==='number'&&Number.isSafeInteger(value)
   &&value>=0,'invalid_'+name);
 return value;
}
function plus(value:unknown,delta:number,name:string):number{
 const prior=validCount(value,name);
 validCount(delta,name+'_delta');
 must(prior<=MAX_SAFE-delta,'overflow_'+name);
 return prior+delta;
}
/**
 * Reward material inventory deliberately never spills to Bank or overflow:
 * all-or-nothing must keep its storage result provable and visible.
 * Matching core/game.ts addBounded: merge into first stack, then add a new
 * stack if there is room. All other stacks remain completely unchanged.
 */
function projectDust(state:GameState,added:number):ItemStack[]{
 const stacks=state.inventory.stacks;
 must(Array.isArray(stacks),'inventory_unavailable');
 const capacity=entitlementStorageCapacity(state,'inventory');
 must(Number.isSafeInteger(capacity)&&capacity>0
   &&Number.isSafeInteger(state.inventory.capacity),
   'inventory_capacity_unavailable');
 for(const st of stacks){
   must(typeof st.itemId==='string'&&st.itemId.length>0
     &&Number.isSafeInteger(st.quantity)&&st.quantity>0,
     'inventory_stack_unverified');
   if(st.itemId===GEM_DUST){
     must(st.instanceId===undefined
       &&st.quantity<=PARTY_EVENT_MATERIAL_STACK_CAP_V28,
       'dust_stack_unverified');
   }
 }
 must(stacks.length<=capacity,'inventory_already_full');
 if(added===0)return stacks.map(st=>({...st}));
 validCount(added,'dust_reward');
 must(added<=PARTY_EVENT_MATERIAL_STACK_CAP_V28,
   'dust_batch_exceeds_stack_cap');
 const next=stacks.map(st=>({...st}));
 const target=next.find(st=>st.itemId===GEM_DUST&&st.instanceId===undefined);
 let remainder=added;
 if(target){
   const merge=Math.min(remainder,PARTY_EVENT_MATERIAL_STACK_CAP_V28-target.quantity);
   target.quantity+=merge;
   remainder-=merge;
 }
 if(remainder>0){
   must(next.length<capacity,'inventory_full');
   next.push({itemId:GEM_DUST,quantity:remainder});
 }
 return next;
}

export interface PartyEventSaveProjectionV28{
 readonly state:GameState;
 readonly goldAfter:number;
 readonly companionEssenceAfter:number;
 readonly bondstonesAfter:number;
 readonly partyRenownAfter:number;
 readonly changedInventorySlots:number;
 readonly grantedCombatSkillXp:number;
 readonly grantedProfessionXp:number;
 readonly professionSkillTarget:SkillId|null;
 readonly sourceRevision:number;
 readonly previewOnly:true;
 readonly economyApplied:false;
 readonly inboxDelivered:false;
 readonly claimed:false;
 readonly claimable:false;
}

/**
 * Reuses Veldryn's actual awardClassSkillXp training focus and
 * profession-level curve. No client-authored reward numbers are accepted.
 * All results are a detached preview; no live state is mutated.
 */
export function projectPartyEventSaveV28(input:{
 evidence:VerifiedPartyEventEvidenceV27;
 state:GameState;
 trustedAccountId:string;
 expectedOnlineRevision:number;
 lockedWalletGold:number;
 lockedCharacterProjectionGold:number;
 professionSkillTarget?:SkillId;
}):PartyEventSaveProjectionV28{
 const {evidence:e,state}=input;
 must(e?.evidenceReconciled===true&&e.claimable===false
   &&e.claimed===false&&e.economyApplied===false
   &&e.inboxDelivered===false&&e.payoutEnabled===false,
   'evidence_not_safe');
 must(e.trustedAccountId===input.trustedAccountId
   &&state.character?.id===e.frozenCharacterId
   &&state.character!==null,'character_not_frozen');
 must(Number.isSafeInteger(input.expectedOnlineRevision)
   &&input.expectedOnlineRevision===e.onlineRevision,
   'online_revision_conflict');
 must(typeof e.quoteHash==='string'&&/^[0-9a-f]{64}$/.test(e.quoteHash),
   'quote_hash_invalid');
 const r=e.reward;
 must(r!==null&&typeof r==='object'
   &&r.materials!==null&&typeof r.materials==='object'
   &&!Array.isArray(r.materials),'invalid_quote');
 const choice=r.kind==='participation'?undefined:r.kind as PartyEventCacheChoice;
 let expected:typeof r;
 try{
   expected=partyEventRewardBundle({
     difficulty:e.difficulty,performanceBand:r.performanceBand,
     personalPoints:r.personalPoints,choice,
   });
 }catch{throw Error('party_event_v28_quote_model_invalid');}
 must(JSON.stringify(expected)===JSON.stringify(r),
   'quote_model_mismatch');
 must(Object.keys(r.materials).every(id=>id===GEM_DUST),
   'unapproved_material');

 const char=state.character;
 must(char!==null,'character_missing');
 const originalGold=validCount(char.gold,'gold');
 must(originalGold===validCount(input.lockedWalletGold,'wallet_gold')
   &&originalGold===validCount(input.lockedCharacterProjectionGold,
     'projection_gold'),'gold_sources_conflict');
 const afterGold=plus(originalGold,r.gold,'gold');
 const essence=plus(state.account.companionEssence??0,
   r.companionEssence,'companion_essence');
 const bondstones=plus(state.account.bondstones??0,
   r.bondstones,'bondstones');
 const renown=plus(state.account.partyRenown??0,
   r.partyRenown,'party_renown');
 const inv=projectDust(state,r.materials.GEM_DUST??0);

 let character={...char,gold:afterGold};
 let grantedCombatXp=0;
 if(r.combatXp>0){
   const before=characterClassSkills(char);
   must(Array.isArray(char.classSkills)
     &&char.classSkills.length===before.length
     &&before.length===2&&before.every((s,i)=>
       s.skillId===char.classSkills?.[i]?.skillId
       &&s.level===char.classSkills?.[i]?.level
       &&s.xp===char.classSkills?.[i]?.xp
       &&s.xp>=0&&s.xp<=MAX_CLASS_SKILL_XP),
     'combat_skill_projection_unverified');
   const result=awardClassSkillXp(char,r.combatXp);
   const after=characterClassSkills(result.character);
   const remainder=(c:typeof char)=>before.reduce((sum,s)=>
     sum+Number(c.classSkillRemainders?.[s.skillId]??0),0);
   const xpDelta=after.reduce((sum,s,i)=>sum+s.xp-before[i]!.xp,0);
   const credit=xpDelta+remainder(result.character)-remainder(char);
   // Fractional shares are a durable remainder; unlike silent XP clipping
   // at level 100 they do not destroy the awarded pool.
   must(Math.abs(credit-r.combatXp)<1e-6,
     'combat_xp_cap_or_curve_conflict');
   grantedCombatXp=xpDelta;
   character={...result.character,gold:afterGold};
 }else{
   must(input.professionSkillTarget===undefined||r.skillXp>0,
     'unexpected_profession_target');
 }

 let skills=state.skills.map(s=>({...s}));
 let grantedProfessionXp=0;
 if(r.skillXp>0){
   must(typeof input.professionSkillTarget==='string'
     &&input.professionSkillTarget.length>0,
     'profession_target_required');
   const matches=skills.filter(s=>s.skillId===input.professionSkillTarget);
   must(matches.length===1,'profession_target_unverified');
   const selected=matches[0]!;
   const before=validCount(selected.xp,'profession_xp');
   must(before<=PROFESSION_CAP
     &&selected.level===levelFromXp(before),
     'profession_level_unverified');
   must(before<=PROFESSION_CAP-r.skillXp,
     'profession_xp_cap_exceeded');
   const after=before+r.skillXp;
   skills=skills.map(s=>s.skillId===input.professionSkillTarget
     ?{...s,xp:after,level:levelFromXp(after)}:s);
   grantedProfessionXp=r.skillXp;
 }else{
   must(input.professionSkillTarget===undefined,
     'unexpected_profession_target');
 }

 const projected:GameState={
   ...state,
   character,
   account:{...state.account,companionEssence:essence,
     bondstones,partyRenown:renown},
   inventory:{...state.inventory,stacks:inv},
   skills,
 };
 return {
   state:projected,goldAfter:afterGold,
   companionEssenceAfter:essence,bondstonesAfter:bondstones,
   partyRenownAfter:renown,
   changedInventorySlots:inv.length-state.inventory.stacks.length,
   grantedCombatSkillXp:grantedCombatXp,
   grantedProfessionXp,professionSkillTarget:input.professionSkillTarget??null,
   sourceRevision:input.expectedOnlineRevision,
   previewOnly:true,economyApplied:false,inboxDelivered:false,
   claimed:false,claimable:false,
 };
}

/** The real payout remains deliberately unimplemented and unreachable. */
export async function claimPartyEventSaveV28():Promise<never>{
 throw Error('party_event_v28_atomic_claim_unreleased');
}
