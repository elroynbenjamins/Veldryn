import type {GameState} from './types';
import {isCombatCompanionMastered} from './combat-companions';
import {combatCompanionDef} from '../content/combat-companions';

export const BALANCE_METRIC_KEYS={
  characterLevel:'balance.character_level',
  campaignClaimed:'balance.campaign_chapters_claimed',
  campaignReady:'balance.campaign_rewards_ready',
  equippedGear:'balance.equipment_slots',
  petsOwned:'balance.pets_owned',
  companionsOwned:'balance.companions_owned',
  companionEssenceBalance:'balance.companion_essence_balance',
  bondstoneBalance:'balance.companion_bondstone_balance',
  companionBond6Count:'balance.companion_bond6_count',
  companionBond10Count:'balance.companion_bond10_count',
  companionMasteredCount:'balance.companion_mastered_count',
  companionPrestigeOwned:'balance.companion_prestige_owned',
  companionEventOwned:'balance.companion_event_owned',
  companionTrialHighestFloor:'balance.companion_trial_highest_floor',
  companionTrialFloor30Clears:'balance.companion_trial_floor30_clears',
  companionTrialRolesReady:'balance.companion_trial_roles_ready',
  activeCompanionAssignments:'balance.companion_active_assignments',
  combinedSkillLevels:'balance.active_character_skill_levels',
  fallenKnightDefeated:'balance.fallen_knight_defeated',
  accountAgeMinutes:'balance.account_age_minutes',
  firstQuestClaimAt:'milestone.first_quest_claim_at_ms',
  level10At:'milestone.level_10_at_ms',
  level20At:'milestone.level_20_at_ms',
  level25At:'milestone.level_25_at_ms',
  firstPetAt:'milestone.first_pet_at_ms',
  firstCompanionAt:'milestone.first_companion_at_ms',
  firstTrialTeamReadyAt:'milestone.first_companion_trial_team_ready_at_ms',
  firstCompanionAscension1At:'milestone.first_companion_ascension_1_at_ms',
  firstCompanionAscension2At:'milestone.first_companion_ascension_2_at_ms',
  firstCompanionAscension3At:'milestone.first_companion_ascension_3_at_ms',
  firstCompanionBond6At:'milestone.first_companion_bond_6_at_ms',
  firstCompanionBond10At:'milestone.first_companion_bond_10_at_ms',
  firstPrestigeMasteryAt:'milestone.first_prestige_companion_mastery_at_ms',
  fullEquipmentAt:'milestone.first_full_equipment_at_ms',
  fallenKnightAt:'milestone.fallen_knight_at_ms',
} as const;

function uniqueCount(values:readonly string[]|undefined){return new Set(values??[]).size}
function putOnce(metrics:Record<string,number>,key:string,ready:boolean,nowMs:number){if(ready&&!(key in metrics))metrics[key]=Math.max(0,Math.floor(nowMs))}

/**
 * Stores local game-balance observations in the existing longTermMetrics map.
 * These are gameplay counters/timestamps only; no identity, device or network
 * data is collected or transmitted by this helper.
 */
export function applyLocalBalanceSnapshot(state:GameState,nowMs=Date.now()):GameState{
  const metrics={...(state.account.longTermMetrics??{})};
  const character=state.character;
  const level=character?.level??0;
  const claimed=state.quests.filter(row=>row.status==='claimed').length;
  const ready=state.quests.filter(row=>row.status==='complete').length;
  const equipped=character?Object.values(character.equipment).filter(Boolean).length:0;
  const pets=uniqueCount(state.account.unlockedCosmeticPetIds);
  const companions=uniqueCount(state.account.unlockedCombatCompanionIds);
  const companionIds=[...new Set(state.account.unlockedCombatCompanionIds??[])],companionProgress=state.account.combatCompanionProgress??{};
  const bond6=companionIds.filter(id=>(companionProgress[id]?.bondLevel??0)>=6).length,bond10=companionIds.filter(id=>(companionProgress[id]?.bondLevel??0)>=10).length;
  const mastered=companionIds.filter(id=>{const def=combatCompanionDef(id),progress=companionProgress[id];return !!def&&!!progress&&isCombatCompanionMastered(def,progress);}).length;
  const ascension1=companionIds.some(id=>(companionProgress[id]?.ascensionTier??0)>=1),ascension2=companionIds.some(id=>(companionProgress[id]?.ascensionTier??0)>=2),ascension3=companionIds.some(id=>(companionProgress[id]?.ascensionTier??0)>=3);
  const prestigeMastered=companionIds.some(id=>combatCompanionDef(id)?.rarity==='prestige'&&companionProgress[id]?.mastered===true);
  const prestige=companionIds.filter(id=>combatCompanionDef(id)?.rarity==='prestige').length,eventOwned=companionIds.filter(id=>combatCompanionDef(id)?.origin.type==='event').length;
  const roleSet=new Set(companionIds.map(id=>combatCompanionDef(id)?.role).filter(Boolean)),trialRolesReady=['tank','damage','support'].every(role=>roleSet.has(role as any));
  const trial=state.account.companionTrialProgress?.lifetime,activeAssignments=(state.account.companionAssignments??[]).filter(row=>row.status==='active').length;
  const activeSkillLevels=state.skills.reduce((sum,row)=>sum+row.level,0)+(character?.classSkills??[]).reduce((sum,row)=>sum+row.level,0);
  const fallen=state.defeatedBossIds.includes('FALLEN_KNIGHT');

  metrics[BALANCE_METRIC_KEYS.characterLevel]=level;
  metrics[BALANCE_METRIC_KEYS.campaignClaimed]=claimed;
  metrics[BALANCE_METRIC_KEYS.campaignReady]=ready;
  metrics[BALANCE_METRIC_KEYS.equippedGear]=equipped;
  metrics[BALANCE_METRIC_KEYS.petsOwned]=pets;
  metrics[BALANCE_METRIC_KEYS.companionsOwned]=companions;
  metrics[BALANCE_METRIC_KEYS.companionEssenceBalance]=state.account.companionEssence??0;
  metrics[BALANCE_METRIC_KEYS.bondstoneBalance]=state.account.bondstones??0;
  metrics[BALANCE_METRIC_KEYS.companionBond6Count]=bond6;
  metrics[BALANCE_METRIC_KEYS.companionBond10Count]=bond10;
  metrics[BALANCE_METRIC_KEYS.companionMasteredCount]=mastered;
  metrics[BALANCE_METRIC_KEYS.companionPrestigeOwned]=prestige;
  metrics[BALANCE_METRIC_KEYS.companionEventOwned]=eventOwned;
  metrics[BALANCE_METRIC_KEYS.companionTrialHighestFloor]=trial?.lifetimeHighestFloor??0;
  metrics[BALANCE_METRIC_KEYS.companionTrialFloor30Clears]=trial?.monthlyFloor30Clears??0;
  metrics[BALANCE_METRIC_KEYS.companionTrialRolesReady]=trialRolesReady?1:0;
  metrics[BALANCE_METRIC_KEYS.activeCompanionAssignments]=activeAssignments;
  metrics[BALANCE_METRIC_KEYS.combinedSkillLevels]=activeSkillLevels;
  metrics[BALANCE_METRIC_KEYS.fallenKnightDefeated]=fallen?1:0;
  metrics[BALANCE_METRIC_KEYS.accountAgeMinutes]=Math.max(0,Math.floor((nowMs-state.createdAtMs)/60000));

  putOnce(metrics,BALANCE_METRIC_KEYS.firstQuestClaimAt,claimed>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.level10At,level>=10,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.level20At,level>=20,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.level25At,level>=25,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstPetAt,pets>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionAt,companions>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstTrialTeamReadyAt,trialRolesReady,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionAscension1At,ascension1,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionAscension2At,ascension2,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionAscension3At,ascension3,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionBond6At,bond6>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionBond10At,bond10>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstPrestigeMasteryAt,prestigeMastered,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.fullEquipmentAt,equipped>=10,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.fallenKnightAt,fallen,nowMs);

  return {...state,account:{...state.account,longTermMetrics:metrics}};
}
