/** Hidden 2.0 review. Existing VIP slot benefits remain unchanged.
 * The future regional-final-boss settlement must persist account milestones
 * in the same authoritative transaction as victory. Never derive them from
 * a client's region, level, dungeon wins, World Boss or current roster.
 */
export const ACTIVITY_LOADOUT_UNLOCKS_LIVE=false as const;
export type LoadoutUnlockRegion='sunscar'|'frostmarch';
export type RegionalLoadoutUnlockProof={
 readonly accountId:string;readonly characterId:string;
 readonly region:LoadoutUnlockRegion;readonly encounterId:string;
 readonly settlementId:string;readonly outcome:'victory';
 readonly encounterKind:'regional_final_boss';readonly status:'committed';
};
export function reviewActivityLoadoutUnlocks(input:{
 readonly accountId:string;readonly premiumSlots:number;
 /** Only independent, persisted final-boss registry IDs. Null = not ready. */
 readonly finalBossIds:Readonly<Record<LoadoutUnlockRegion,string|null>>;
 readonly proofs:readonly RegionalLoadoutUnlockProof[];
 readonly verifyPersisted:(proof:RegionalLoadoutUnlockProof)=>boolean;
}){
 const validId=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0&&x.length<=180;
 if(!input||!validId(input.accountId)||!Number.isInteger(input.premiumSlots)||
 input.premiumSlots<0||input.premiumSlots>2||!input.finalBossIds||
 !Array.isArray(input.proofs)||input.proofs.length>100||
 typeof input.verifyPersisted!=='function')throw Error('loadout_unlock_invalid_context');
 const regions:readonly LoadoutUnlockRegion[]=['sunscar','frostmarch'];
 for(const region of regions)if(input.finalBossIds[region]!==null&&!validId(input.finalBossIds[region]))
  throw Error('loadout_unlock_invalid_registry');
 if(input.finalBossIds.sunscar!==null&&input.finalBossIds.sunscar===input.finalBossIds.frostmarch)
  throw Error('loadout_unlock_ambiguous_registry');
 const snapshot=JSON.stringify({accountId:input.accountId,premiumSlots:input.premiumSlots,finalBossIds:input.finalBossIds,proofs:input.proofs});
 const completed=new Set<LoadoutUnlockRegion>(),settlements=new Map<string,string>();
 const proofs:readonly RegionalLoadoutUnlockProof[]=input.proofs;
 for(const proof of proofs){
  if(!proof||proof.accountId!==input.accountId||!validId(proof.characterId)||
   !regions.includes(proof.region)||!validId(proof.encounterId)||
   proof.encounterId!==input.finalBossIds[proof.region]||!validId(proof.settlementId)||
   proof.outcome!=='victory'||proof.encounterKind!=='regional_final_boss'||proof.status!=='committed')
   throw Error('loadout_unlock_invalid_proof');
  const serialized=JSON.stringify(proof);
  const old=settlements.get(proof.settlementId);
  if(old!==undefined&&old!==serialized)throw Error('loadout_unlock_conflicting_settlement');
  if(old!==undefined)continue;
  if(input.verifyPersisted(proof)!==true||
   JSON.stringify({accountId:input.accountId,premiumSlots:input.premiumSlots,finalBossIds:input.finalBossIds,proofs:input.proofs})!==snapshot)
   throw Error('loadout_unlock_unverified_proof');
  settlements.set(proof.settlementId,serialized);
  completed.add(proof.region);
 }
 const earnedRegions=regions.filter(region=>completed.has(region));
 return {baseSlots:1,premiumSlots:input.premiumSlots,progressionSlots:earnedRegions.length,
  earnedRegions,slotCount:Math.min(5,1+input.premiumSlots+earnedRegions.length),
  canGrantSlots:false as const,releaseReady:false as const};
}
