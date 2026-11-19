/**
 * V20 HIDDEN server-owned War Camp and phase-specific encounter configuration.
 *
 * The SQL reservation must select the phase profile under the event row lock,
 * not based on an optimistic pre-lock HP read. Freeze all three candidates
 * and their verified digests, then use exactly the selected phase on checkout.
 * NO published balance thresholds or server-side permissions are implied.
 */
import {
 deriveWorldBossWarCampEffectsV11,
 type WorldBossWarCampSnapshotV11,
} from '../src/server/combat/world-boss-war-camp-v11';
import {
 verifyWorldBossEncounterProfileV13,
 type WorldBossEncounterProfileV13,
 type WorldBossGearBandV13,
} from '../src/server/combat/world-boss-encounter-profile-v13';
import type {WorldBossId,WorldBossPhase} from '../src/server/combat/world-boss-round-prototype';
import type {WorldBossPowerBracket} from '../src/server/combat/world-boss-echo-prototype';

export const WORLD_BOSS_V20_MODIFIERS_LIVE=false as const;
const phases=['armored','exposed','enraged'] as const;
export interface WorldBossRulesSourceV20{
 /** Approved only after future population calibration: all five CP brackets. */
 gearBandByBracket:readonly [
  WorldBossGearBandV13,WorldBossGearBandV13,WorldBossGearBandV13,
  WorldBossGearBandV13,WorldBossGearBandV13,
 ];
 /** Only a trusted server config/War Camp DB reader, never mobile JSON. */
 loadWarCamp(eventId:string):Promise<WorldBossWarCampSnapshotV11>;
 loadProfile(input:{
  eventId:string;boss:WorldBossId;phase:WorldBossPhase;
  gearBand:WorldBossGearBandV13;
 }):Promise<WorldBossEncounterProfileV13>;
}
export interface WorldBossFrozenRulesV20{
 warCamp:WorldBossWarCampSnapshotV11;
 encounterProfiles:Record<WorldBossPhase,WorldBossEncounterProfileV13>;
}
export async function loadWorldBossFrozenRulesV20(input:{
 source:WorldBossRulesSourceV20;eventId:string;boss:WorldBossId;
 initiatorBracket:WorldBossPowerBracket;
}):Promise<WorldBossFrozenRulesV20>{
 const {source,eventId,boss,initiatorBracket}=input;
 if(!source||!Array.isArray(source.gearBandByBracket)||
  source.gearBandByBracket.length!==5||
  !source.gearBandByBracket.every(b=>[1,2,3,4].includes(b))||
  typeof source.loadWarCamp!=='function'||typeof source.loadProfile!=='function'||
  ![1,2,3,4,5].includes(initiatorBracket))
  throw Error('world_boss_v20_invalid_private_rule_source');
 const gearBand=source.gearBandByBracket[initiatorBracket-1];
 const warCamp=await source.loadWarCamp(eventId);
 if(!warCamp||warCamp.eventId!==eventId)
  throw Error('world_boss_v20_foreign_war_camp');
 deriveWorldBossWarCampEffectsV11(warCamp);
 const loaded=await Promise.all(phases.map(phase=>
  source.loadProfile({eventId,boss,phase,gearBand})));
 const encounterProfiles={} as Record<WorldBossPhase,WorldBossEncounterProfileV13>;
 for(let i=0;i<phases.length;i++){
  const phase=phases[i],profile=loaded[i];
  verifyWorldBossEncounterProfileV13(profile,boss,phase,eventId);
  if(profile.gearBand!==gearBand)
   throw Error('world_boss_v20_wrong_profile_gear_band');
  encounterProfiles[phase]=structuredClone(profile);
 }
 if(new Set(loaded.map(p=>p.configVersion)).size!==1)
  throw Error('world_boss_v20_mixed_profile_versions');
 return {warCamp:structuredClone(warCamp),encounterProfiles};
}
export function verifyWorldBossFrozenRulesV20(input:{
 frozen:WorldBossFrozenRulesV20;eventId:string;boss:WorldBossId;
 phase:WorldBossPhase;warCampDigest:string;encounterProfileDigest:string;
}):{
 warCamp:WorldBossWarCampSnapshotV11;
 encounterProfile:WorldBossEncounterProfileV13;
}{
 const {frozen,eventId,boss,phase}=input;
 if(!frozen||!frozen.warCamp||!frozen.encounterProfiles||
  frozen.warCamp.eventId!==eventId||
  frozen.warCamp.digest!==input.warCampDigest)
  throw Error('world_boss_v20_frozen_war_camp_mismatch');
 deriveWorldBossWarCampEffectsV11(frozen.warCamp);
 for(const p of phases)
  verifyWorldBossEncounterProfileV13(frozen.encounterProfiles[p],boss,p,eventId);
 const profile=frozen.encounterProfiles[phase];
 if(!profile||profile.digest!==input.encounterProfileDigest||
  new Set(phases.map(p=>frozen.encounterProfiles[p].configVersion)).size!==1)
  throw Error('world_boss_v20_frozen_profile_mismatch');
 return {
  warCamp:structuredClone(frozen.warCamp),
  encounterProfile:structuredClone(profile),
 };
}
