/**
 * Authoritative Guild Skill bonus values, computed server-side by
 * guild_skill_effects_server_v1 and injected into the game state for a single
 * resolution. Never computed or trusted on-device: an absent or all-zero value
 * (every skill is_released=false) applies no bonus at all, so wiring these
 * consumers is a no-op until the database owner releases the skills.
 */
export interface GuildSkillEffects {
  schemaVersion?: number;
  guildId?: string | null;
  gatheringSpeedBps?: number;
  craftingSpeedBps?: number;
  skillingXpBps?: number;
  memberCapacityExtra?: number;
  guildQuestRewardBps?: number;
  guildProjectEfficiencyBps?: number;
  guildBossDamageBps?: number;
  guildDefenceBps?: number;
  guildSupportBps?: number;
}

const BPS = 10000;

/** Clamp to the sane range the server can ever emit (rank 3 x 2% = 600 bps),
 * so a corrupt projection can never scale gameplay without bound. */
function bonusMultiplier(bps: number | undefined): number {
  const value = typeof bps === 'number' && Number.isFinite(bps) ? bps : 0;
  const clamped = Math.max(0, Math.min(600, value));
  return 1 + clamped / BPS;
}

/** Extra guild member slots granted by Fellowship · Membership (rank x 1). */
export function guildSkillMemberCapacityExtra(effects: GuildSkillEffects | undefined): number {
  const value = effects?.memberCapacityExtra;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;
}

/** Professions tree -> character multipliers (gathering/crafting speed, skill XP). */
export function guildSkillProfessionMultipliers(effects: GuildSkillEffects | undefined) {
  return {
    gatheringSpeedMultiplier: bonusMultiplier(effects?.gatheringSpeedBps),
    craftingSpeedMultiplier: bonusMultiplier(effects?.craftingSpeedBps),
    skillXpMultiplier: bonusMultiplier(effects?.skillingXpBps),
  };
}

/** Guild-content-only combat multipliers (Vanguard), applied solely inside
 * Guild Boss / guild PvE resolution, never to solo or regional combat. */
export function guildSkillVanguardMultipliers(effects: GuildSkillEffects | undefined) {
  return {
    damageMultiplier: bonusMultiplier(effects?.guildBossDamageBps),
    defenceMultiplier: bonusMultiplier(effects?.guildDefenceBps),
    supportMultiplier: bonusMultiplier(effects?.guildSupportBps),
  };
}

/** Fellowship reward multipliers for Guild Quests and Guild Projects. */
export function guildSkillFellowshipMultipliers(effects: GuildSkillEffects | undefined) {
  return {
    questRewardMultiplier: bonusMultiplier(effects?.guildQuestRewardBps),
    projectEfficiencyMultiplier: bonusMultiplier(effects?.guildProjectEfficiencyBps),
  };
}
