import type {EffectGemSummaryV34} from '../equipment/gem-system-v34';
export type CombatTeam = 'players' | 'enemies';
export type CombatRole = 'tank' | 'damage' | 'support' | 'enemy';
export type DamageType = 'physical' | 'fire' | 'ice' | 'shadow' | 'arcane' | 'nature' | 'true';
export type TargetRule = 'self' | 'current_target' | 'lowest_hp_ally' | 'all_allies' | 'all_enemies' | 'random_enemy';
export type EffectKind = 'damage' | 'heal' | 'shield' | 'dot' | 'hot' | 'interrupt' | 'taunt' | 'buff' | 'debuff';

export interface CombatStats {
  maxHp: number;
  attackPower: number;
  healingPower: number;
  defense: number;
  accuracy: number;
  evasion: number;
  critChance: number;
  critMultiplier: number;
  haste: number;
}

export interface AbilityEffect {
  executeBelowHpPct?:number;
  executeBonus?:number;
  shieldReflectPct?:number;
  kind: EffectKind;
  coeff?: number;
  flat?: number;
  damageType?: DamageType;
  durationMs?: number;
  tickMs?: number;
  value?: number;
  threatMultiplier?: number;
  removable?: boolean;
  tag?: string;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  cooldownMs: number;
  castTimeMs: number;
  target: TargetRule;
  effects: AbilityEffect[];
  priority: number;
  interruptible?: boolean;
  interruptPower?: number;
  aiCondition?: 'always' | 'self_below_50' | 'ally_below_50' | 'target_casting' | 'multiple_enemies';
  tags?: string[];
}

export interface BossPhaseDefinition { id:string; name?:string; hpPct:number; target:TargetRule; effects:AbilityEffect[]; }

export interface EncounterBossTuning {
  profileId:string;
  removeAbilityIds?:string[];
  abilityDamageMultipliers?:Record<string,number>;
  abilityCooldownMultipliers?:Record<string,number>;
  addAbilities?:AbilityDefinition[];
  addPhases?:BossPhaseDefinition[];
}

export interface CombatantDefinition {
  id: string;
  classId?: string;
  name: string;
  team: CombatTeam;
  role: CombatRole;
  level: number;
  stats: CombatStats;
  basicAttackMs: number;
  basicAttackCoeff: number;
  abilities: AbilityDefinition[];
  tags?: string[];
  boss?: boolean;
  phases?: BossPhaseDefinition[];
  effectGemsV34?:readonly EffectGemSummaryV34[];
}

export interface ActivePeriodicEffect {
  sourceId: string;
  effectId: string;
  kind: 'dot' | 'hot';
  coeff: number;
  flat: number;
  damageType?: DamageType;
  nextTickAt: number;
  expiresAt: number;
  tickMs: number;
}

export interface ActiveTimedModifier {
  sourceId: string;
  tag: string;
  value: number;
  expiresAt: number;
  kind?:'buff'|'debuff';
  appliedAt?:number;
}
export interface TimedShieldV34 {sourceId:string;remaining:number;expiresAt:number;expireHealRate?:number;}
export interface GemCombatRuntimeV34 {
  momentumStacks:number;momentumLastGainAt:number;momentumNextTriggerAt:number;momentumDecayNextAt:number;
  criticalSurgeExpiries:number[];criticalSurgeNextTriggerAt:number;unyieldingExpiries:number[];unyieldingNextTriggerAt:number;sharedResolveExpiries:number[];
  openingUntil:number;openingPhaseRefreshUsed:boolean;
  predatorTriggeredTargets:Record<string,boolean>;predatorBoostUntilByTarget:Record<string,number>;
  lastStandUsed:boolean;lastStandUntil:number;
  retaliationUntil:number;retaliationHealReadyAt:number;
  bulwarkUntil:number;benedictionCharges:number;benedictionExpiresAt:number;benedictionAbilityKey?:string;benedictionAbilityMultiplier?:number;
  battleLastCategory?:'offense'|'defense_support';battleLastAt:number;battleHasteUntil:number;battleHasteReadyAt:number;
  flowStacks:number;flowExpiresAt:number;flowLastAbilityId?:string;flowDecayStartedAt?:number;
  opportunityByTarget:Record<string,{until:number;modifierTag?:string;modifierSourceId?:string}>;
  sustenanceReadyAt:number;
}

export interface CombatantState {
  reflectiveShields?:Array<{remaining:number;rate:number;sourceId:string}>;
  timedShieldsV34?:TimedShieldV34[];
  gemRuntimeV34?:GemCombatRuntimeV34;
  definition: CombatantDefinition;
  hp: number;
  shield: number;
  alive: boolean;
  downed: boolean;
  threat: Record<string, number>;
  cooldownReadyAt: Record<string, number>;
  nextBasicAt: number;
  casting?: { abilityId: string; completesAt: number; targetId: string };
  periodic: ActivePeriodicEffect[];
  modifiers: ActiveTimedModifier[];
  damageDone: number;
  healingDone: number;
  damageTaken: number;
  interrupts: number;
  triggeredPhases: string[];
}

export type CombatEventType = 'combat_start' | 'phase' | 'cast_start' | 'cast_complete' | 'damage' | 'heal' | 'shield' | 'dot_tick' | 'hot_tick' | 'interrupt' | 'down' | 'death' | 'combat_end';
export interface CombatEvent {
  atMs: number;
  type: CombatEventType;
  actorId?: string;
  targetId?: string;
  abilityId?: string;
  amount?: number;
  detail?: string;
}

export interface CombatInput {
  seed: string;
  players: CombatantDefinition[];
  enemies: CombatantDefinition[];
  maxDurationMs?: number;
  tickMs?: number;
  mitigationConstant?: number;
  accuracyScale?: number;
  initialPlayerState?: Record<string, PersistentActorState>;
}

export interface PersistentActorState {
  hp: number;
  downed: boolean;
  cooldownRemainingMs: Record<string, number>;
  basicAttackRemainingMs: number;
}

export interface CombatResult {
  victory: boolean;
  durationMs: number;
  reason: 'victory' | 'wipe' | 'timeout';
  events: CombatEvent[];
  players: CombatantState[];
  enemies: CombatantState[];
}
