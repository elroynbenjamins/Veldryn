import type { CombatantDefinition, AbilityDefinition } from './types';
export type RunEffectKind='stat'|'ability_coeff'|'cooldown'|'starting_shield'|'revive'|'mark'|'cleanse'|'break_power';
export interface RunEffect { id:string; source:'boon'|'artifact'|'evolution'; kind:RunEffectKind; tag?:string; value:number; classId?:string; abilityId?:string; }
export interface ExpeditionBuild { boonIds:string[]; artifactIds:string[]; evolutionIds:string[]; effects:RunEffect[]; }
export function applyRunBuild(def:CombatantDefinition, build:ExpeditionBuild):CombatantDefinition {
  const effects=build.effects.filter(e=>!e.classId||e.classId===def.id.split(':')[0]);
  const stat=(tag:string)=>effects.filter(e=>e.kind==='stat'&&e.tag===tag).reduce((s,e)=>s+e.value,0);
  const abilities:AbilityDefinition[]=def.abilities.map(a=>{ const coeff=effects.filter(e=>e.kind==='ability_coeff'&&(!e.abilityId||e.abilityId===a.id)).reduce((s,e)=>s+e.value,0); const cd=effects.filter(e=>e.kind==='cooldown'&&(!e.abilityId||e.abilityId===a.id)).reduce((s,e)=>s+e.value,0); return {...a,cooldownMs:Math.max(500,Math.round(a.cooldownMs*(1-cd))),effects:a.effects.map(f=>f.kind==='damage'||f.kind==='heal'?{...f,coeff:(f.coeff??0)*(1+coeff)}:f)}; });
  return {...def,abilities,stats:{...def.stats,maxHp:Math.round(def.stats.maxHp*(1+stat('max_hp'))),attackPower:def.stats.attackPower*(1+stat('attack_power')),healingPower:def.stats.healingPower*(1+stat('healing_power')),defense:def.stats.defense*(1+stat('defense')),critChance:def.stats.critChance+stat('crit')}};
}
export const STARTER_RUN_EFFECTS:Record<string,RunEffect>={
  'BOON_009':{id:'BOON_009',source:'boon',kind:'stat',tag:'attack_power',value:.08},
  'BOON_032':{id:'BOON_032',source:'boon',kind:'stat',tag:'defense',value:.10},
  'BOON_104':{id:'BOON_104',source:'boon',kind:'cooldown',value:.08},
  'ART_001':{id:'ART_001',source:'artifact',kind:'stat',tag:'crit',value:.04},
};
export function buildFromIds(boonIds:string[],artifactIds:string[]=[]):ExpeditionBuild { const ids=[...boonIds,...artifactIds]; return {boonIds,artifactIds,evolutionIds:[],effects:ids.map(id=>STARTER_RUN_EFFECTS[id]).filter(Boolean)}; }
