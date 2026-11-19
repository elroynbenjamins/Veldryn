/**
 * Unreleased Tier 1 teaching kits for NEW server-persisted solo encounters.
 * Deliberately deterministic: no trait RNG, no invisible stat multipliers,
 * and one legible counterable ability per known overworld archetype.
 * Not imported by current hunts, Live dungeons, Q-Mode or World Bosses.
 */
import type {AbilityDefinition,CombatantDefinition} from '../types';

export const ENEMY_T1_INTRO_VERSION='enemy-t1-intro-v1' as const;
export const ENEMY_T1_ARCHETYPES=[
 'guardian','bruiser','executioner','assassin','swarm','caster','hexer','support',
] as const;
export type IntroArchetypeV2=typeof ENEMY_T1_ARCHETYPES[number];
export const t1IntroArchetypeV2=(enemy:CombatantDefinition):IntroArchetypeV2|null=>{
 const values=(enemy.tags??[]).filter(x=>x.startsWith('pve:archetype:'));
 if(values.length!==1)return null;
 const value=values[0].slice('pve:archetype:'.length);
 return (ENEMY_T1_ARCHETYPES as readonly string[]).includes(value)
  ?value as IntroArchetypeV2:null;
};
export const introProfileV2=(a:IntroArchetypeV2)=>'t1-intro:'+a;
export function prepareTierOneIntroEnemyV2(base:CombatantDefinition):CombatantDefinition {
 const a=t1IntroArchetypeV2(base);
 if(!a||base.team!=='enemies'||base.role!=='enemy'||base.boss||
    (base.tags??[]).some(t=>t.startsWith('enemy-v2:')))
  throw Error('combat_v2_t1_requires_supported_uncompiled_enemy');
 const ability=(id:string,name:string,cooldownMs:number,castTimeMs:number,
  priority:number,target:AbilityDefinition['target'],
  effects:AbilityDefinition['effects'],interruptible:boolean,
  aiCondition?:AbilityDefinition['aiCondition']):AbilityDefinition=>({
    id,name,cooldownMs,castTimeMs,priority,target,effects,interruptible,aiCondition,
  });
 const hp=Math.max(1,base.stats.maxHp);
 const available:Record<IntroArchetypeV2,AbilityDefinition>={
  guardian:ability('ENEMY_T1_BARK_GUARD','Bark Guard',28000,1100,60,'self',
    [{kind:'shield',flat:Math.round(hp*.02)}],true),
  bruiser:ability('ENEMY_T1_WINDUP','Heavy Windup',17000,1350,65,'current_target',
    [{kind:'damage',coeff:.75,damageType:'physical'}],true),
  executioner:ability('ENEMY_T1_FINISHER','Measured Finisher',20000,1400,65,'current_target',
    [{kind:'damage',coeff:.72,damageType:'physical',executeBelowHpPct:.30,executeBonus:.05}],true),
  assassin:ability('ENEMY_T1_SLICE','Quick Slice',15000,700,60,'current_target',
    [{kind:'damage',coeff:.52,damageType:'physical'}],false),
  swarm:ability('ENEMY_T1_NIP','Pack Nip',15000,750,60,'current_target',
    [{kind:'damage',coeff:.48,damageType:'physical'}],false),
  caster:ability('ENEMY_T1_ARC_BOLT','Arc Bolt',19000,1500,65,'current_target',
    [{kind:'damage',coeff:.65,damageType:'arcane'}],true),
  hexer:ability('ENEMY_T1_WHISPER','Weakening Whisper',23000,1600,65,'current_target',[
    {kind:'damage',coeff:.48,damageType:'shadow'},
    {kind:'debuff',tag:'damage_done',value:-.03,durationMs:3000},
  ],true),
  support:ability('ENEMY_T1_MEND','Mending Sigil',27000,1500,65,'self',
    [{kind:'hot',flat:Math.max(1,Math.round(hp*.001)),tickMs:1000,durationMs:4000,tag:'regeneration'}],
    true,'self_below_50'),
 };
 const chosen=available[a];
 if(base.abilities.some(x=>x.id===chosen.id))
   throw Error('combat_v2_t1_duplicate_intro_ability');
 return {...base,stats:{...base.stats},
   abilities:[...base.abilities,chosen],
   tags:[...(base.tags??[]),'enemy-v2:t1-intro:'+a]};
}
