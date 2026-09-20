import type {GameState} from './types';

export const BALANCE_METRIC_KEYS={
  characterLevel:'balance.character_level',
  campaignClaimed:'balance.campaign_chapters_claimed',
  campaignReady:'balance.campaign_rewards_ready',
  equippedGear:'balance.equipment_slots',
  petsOwned:'balance.pets_owned',
  companionsOwned:'balance.companions_owned',
  combinedSkillLevels:'balance.active_character_skill_levels',
  fallenKnightDefeated:'balance.fallen_knight_defeated',
  accountAgeMinutes:'balance.account_age_minutes',
  firstQuestClaimAt:'milestone.first_quest_claim_at_ms',
  level10At:'milestone.level_10_at_ms',
  level20At:'milestone.level_20_at_ms',
  level25At:'milestone.level_25_at_ms',
  firstPetAt:'milestone.first_pet_at_ms',
  firstCompanionAt:'milestone.first_companion_at_ms',
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
  const activeSkillLevels=state.skills.reduce((sum,row)=>sum+row.level,0)+(character?.classSkills??[]).reduce((sum,row)=>sum+row.level,0);
  const fallen=state.defeatedBossIds.includes('FALLEN_KNIGHT');

  metrics[BALANCE_METRIC_KEYS.characterLevel]=level;
  metrics[BALANCE_METRIC_KEYS.campaignClaimed]=claimed;
  metrics[BALANCE_METRIC_KEYS.campaignReady]=ready;
  metrics[BALANCE_METRIC_KEYS.equippedGear]=equipped;
  metrics[BALANCE_METRIC_KEYS.petsOwned]=pets;
  metrics[BALANCE_METRIC_KEYS.companionsOwned]=companions;
  metrics[BALANCE_METRIC_KEYS.combinedSkillLevels]=activeSkillLevels;
  metrics[BALANCE_METRIC_KEYS.fallenKnightDefeated]=fallen?1:0;
  metrics[BALANCE_METRIC_KEYS.accountAgeMinutes]=Math.max(0,Math.floor((nowMs-state.createdAtMs)/60000));

  putOnce(metrics,BALANCE_METRIC_KEYS.firstQuestClaimAt,claimed>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.level10At,level>=10,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.level20At,level>=20,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.level25At,level>=25,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstPetAt,pets>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.firstCompanionAt,companions>0,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.fullEquipmentAt,equipped>=10,nowMs);
  putOnce(metrics,BALANCE_METRIC_KEYS.fallenKnightAt,fallen,nowMs);

  return {...state,account:{...state.account,longTermMetrics:metrics}};
}
