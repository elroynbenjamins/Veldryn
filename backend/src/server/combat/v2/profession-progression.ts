/**
 * Veldryn 2.0 profession progression — hidden, isolated policy contract.
 *
 * A character's displayed/combat level is its VERIFIED COMBAT LEVEL, never an
 * aggregate of skill levels. Profession training and T1-T9 work eligibility
 * depend on the individual trained profession alone. Neither this contract
 * nor its projection mints XP, items, currency, recipes, or combat strength.
 *
 * Thresholds and bonuses are provisional launch policy, pending economy QA.
 * DO NOT import into live mobile, Edge functions or production routes.
 */

export const PROFESSION_LEVEL_CAP_V2 = 100;
export const FOCUS_UNLOCK_LEVEL_V2 = 25;
export const PROFESSION_ACTION_SPEED_CAP_BPS_V2 = 1000; // 10%, shared with Forge.
export const PROFESSION_TIER_LEVELS_V2 = [
  1, 10, 22, 35, 45, 55, 65, 75, 90,
] as const;
export type ProfessionTierV2 = 1|2|3|4|5|6|7|8|9;

export const PROFESSIONS_V2 = {
  mining:'gathering', woodcutting:'gathering', fishing:'gathering',
  herbalism:'gathering', exploration:'utility',
  smithing:'crafting', cooking:'crafting', alchemy:'crafting',
  tailoring:'crafting', enchanting:'crafting',
  faith:'utility', forge:'utility',
} as const;
export type ProfessionIdV2 = keyof typeof PROFESSIONS_V2;
export type ProfessionCategoryV2 = (typeof PROFESSIONS_V2)[ProfessionIdV2];
const tieredProfessionIds:ReadonlySet<string> = new Set([
  'mining','woodcutting','fishing','herbalism',
  'smithing','cooking','alchemy','tailoring','enchanting',
]);
const owns=(obj:object,key:string)=>Object.prototype.hasOwnProperty.call(obj,key);
const validProfessionId=(value:string):value is ProfessionIdV2=>
  owns(PROFESSIONS_V2,value);
const validLevel=(level:number)=>Number.isSafeInteger(level)&&level>=0&&level<=PROFESSION_LEVEL_CAP_V2;

export interface TrustedProgressionV2 {
  /** Loaded from authenticated character combat XP/level; never summed from professions. */
  readonly combatLevel:number;
  /** Authenticated character-bound XP-bearing profession levels, untrained=0. */
  readonly professionLevels:Readonly<Partial<Record<ProfessionIdV2,number>>>;
  /** Optional ONE primary focus on this character. No focus is required to train. */
  readonly primaryFocus:ProfessionIdV2|null;
}

/**
 * Validate server data before projection. Unknown IDs or malformed levels
 * fail closed instead of silently creating trainable skills/unlocks.
 */
export function validateTrustedProgressionV2(source:TrustedProgressionV2):void {
  if(!source||!Number.isSafeInteger(source.combatLevel)||source.combatLevel<1)
    throw Error('progression_v2_invalid_combat_level');
  if(!source.professionLevels||typeof source.professionLevels!=='object'||
     Array.isArray(source.professionLevels))
    throw Error('progression_v2_invalid_professions');
  for(const [id,level] of Object.entries(source.professionLevels)){
    if(!validProfessionId(id)||typeof level!=='number'||!validLevel(level))
      throw Error('progression_v2_invalid_profession_level');
  }
  const focus=source.primaryFocus;
  if(focus!==null){
    if(typeof focus!=='string'||!validProfessionId(focus))
      throw Error('progression_v2_invalid_focus');
    if((source.professionLevels[focus]??0)<FOCUS_UNLOCK_LEVEL_V2)
      throw Error('progression_v2_focus_locked');
  }
}

export function professionTierAtLevelV2(level:number):number {
  if(!validLevel(level))throw Error('progression_v2_invalid_profession_level');
  let tier=0;
  for(let i=0;i<PROFESSION_TIER_LEVELS_V2.length;i++){
    if(level>=PROFESSION_TIER_LEVELS_V2[i])tier=i+1;
  }
  return tier;
}
export function minimumLevelForTierV2(tier:number):number{
  if(!Number.isSafeInteger(tier)||tier<1||tier>9)
    throw Error('progression_v2_invalid_tier');
  return PROFESSION_TIER_LEVELS_V2[tier-1];
}

/** Work license only: actual recipe/material/blueprint/market checks remain mandatory. */
export function mayWorkProfessionTierV2(
  source:TrustedProgressionV2,professionId:ProfessionIdV2,tier:number,
):boolean {
  validateTrustedProgressionV2(source);
  if(!validProfessionId(professionId)||!tieredProfessionIds.has(professionId)||
     !Number.isSafeInteger(tier)||tier<1||tier>9)return false;
  return (source.professionLevels[professionId]??0)>=minimumLevelForTierV2(tier);
}

/** Equipment *wearing* must stay combat-level gated, irrespective of the crafter. */
export function mayEquipCombatGearV2(source:TrustedProgressionV2,requiredCombatLevel:number):boolean {
  validateTrustedProgressionV2(source);
  return Number.isSafeInteger(requiredCombatLevel)&&requiredCombatLevel>=1&&
    source.combatLevel>=requiredCombatLevel;
}

export interface ProfessionMilestoneV2{
  readonly level:number;
  readonly code:string;
  readonly effect:'training_xp'|'action_speed'|'commission_slot'|'focus_choice'|'tier9'|'master_title';
  readonly basisPoints?:number;
  readonly amount?:number;
}
/** Small, profession-local defaults; additive effects must respect the existing Forge cap. */
export const PROFESSION_MILESTONES_V2:readonly ProfessionMilestoneV2[] = [
  {level:10,code:'apprentice',effect:'training_xp',basisPoints:100},
  {level:25,code:'focus_available',effect:'focus_choice'},
  {level:40,code:'journeyman',effect:'action_speed',basisPoints:100},
  {level:50,code:'artisan_orders',effect:'commission_slot',amount:1},
  {level:75,code:'expert',effect:'action_speed',basisPoints:100},
  {level:90,code:'tier9',effect:'tier9'},
  {level:100,code:'master',effect:'master_title'},
] as const;

export interface FocusBonusV2 {
  readonly level:number;
  readonly code:'focused_training'|'focused_speed'|'focused_precision'|'focused_orders';
  readonly basisPoints?:number;
  readonly amount?:number;
}
export const FOCUS_BONUSES_V2:readonly FocusBonusV2[]=[
  {level:25,code:'focused_training',basisPoints:200}, // +2% profession XP
  {level:50,code:'focused_speed',basisPoints:100}, // +1% speed, shared 10% cap
  {level:75,code:'focused_precision',basisPoints:50}, // +0.5pp precision, policy TBD
  {level:100,code:'focused_orders',amount:1}, // +1 personal commission slot
] as const;

/** Draft XP target curve for one trained profession only; no existing XP is rewritten. */
export function xpForNextProfessionLevelV2(currentLevel:number):number{
  if(!Number.isSafeInteger(currentLevel)||currentLevel<1||
    currentLevel>PROFESSION_LEVEL_CAP_V2)
    throw Error('progression_v2_invalid_profession_level');
  if(currentLevel===PROFESSION_LEVEL_CAP_V2)return 0;
  const n=currentLevel-1;
  return Math.ceil((120+28*n+17*n*n/20)/10)*10;
}

export interface ProfessionProgressV2{
  readonly id:ProfessionIdV2;
  readonly level:number;
  readonly tier:number;
  readonly focused:boolean;
  readonly nextTierLevel:number|null;
  readonly milestones:readonly string[];
  readonly focusBonuses:readonly string[];
}
export interface ProgressionViewV2{
  /** Character level follows only persisted combat progress. */
  readonly characterLevel:number;
  readonly combatLevel:number;
  /** Display-only, never used for equip, dungeon, ability or profession unlocks. */
  readonly professionMasteryTotal:number;
  readonly primaryFocus:ProfessionIdV2|null;
  readonly professions:readonly ProfessionProgressV2[];
}

/** Pure presentation projection; never trust device-provided progression. */
export function projectTrustedProgressionV2(source:TrustedProgressionV2):ProgressionViewV2{
  validateTrustedProgressionV2(source);
  const professions=(Object.keys(PROFESSIONS_V2) as ProfessionIdV2[]).map(id=>{
    const level=source.professionLevels[id]??0;
    const tier=tieredProfessionIds.has(id)?professionTierAtLevelV2(level):0;
    const nextTierLevel=tieredProfessionIds.has(id)&&tier<9
      ?minimumLevelForTierV2((tier+1) as ProfessionTierV2):null;
    return {
      id,level,tier,nextTierLevel,focused:source.primaryFocus===id,
      milestones:PROFESSION_MILESTONES_V2.filter(m=>level>=m.level).map(m=>m.code),
      focusBonuses:source.primaryFocus===id
        ?FOCUS_BONUSES_V2.filter(b=>level>=b.level).map(b=>b.code):[],
    };
  });
  return {
    characterLevel:source.combatLevel,combatLevel:source.combatLevel,
    primaryFocus:source.primaryFocus,
    professionMasteryTotal:professions.reduce((sum,p)=>sum+p.level,0),
    professions,
  };
}

/** Explicitly bounded cap, including existing Forge bonuses: never stack unbounded. */
export function cappedProfessionActionSpeedBpsV2(...sources:readonly number[]):number{
  if(sources.some(v=>!Number.isSafeInteger(v)||v<0||v>PROFESSION_ACTION_SPEED_CAP_BPS_V2))
    throw Error('progression_v2_invalid_speed_source');
  return Math.min(PROFESSION_ACTION_SPEED_CAP_BPS_V2,sources.reduce((a,b)=>a+b,0));
}
