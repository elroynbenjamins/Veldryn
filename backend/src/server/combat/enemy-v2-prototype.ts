import {CombatRng} from './deterministic-rng';
import type {AbilityDefinition,CombatantDefinition} from './types';

/**
 * Enemy 2.0 opt-in prototype. This module does NOT change legacy combat by itself.
 * Invoke only from a server-owned, versioned encounter snapshot (never a client flag).
 * Prepare and persist the enemy snapshot ONCE; retries must reuse that snapshot.
 */
export const ENEMY_V2_RULESET = 'enemy-v2-prototype-1' as const;
export type EnemyV2Region = 'asterfall' | 'sunscar' | 'frostmarch';
export type EnemyV2Tier = 1 | 2 | 3 | 4 | 5;
export type EnemyV2Kind = 'normal' | 'elite' | 'boss';
export type EnemyV2Archetype = 'bulwark' | 'berserker' | 'predator' | 'spellcaster' | 'hexer' | 'mender';
export type EnemyV2TraitId =
  | 'savage' | 'swift' | 'keen' | 'piercing' | 'enraged' | 'vampiric'
  | 'stonehide' | 'warded' | 'fortified' | 'elusive' | 'resolute' | 'regenerating'
  | 'venomous' | 'rending' | 'chilling' | 'hexing' | 'thorned' | 'sundering';

type TraitGroup = 'offense' | 'defense' | 'control';
interface TraitSpec {
  label: string;
  group: TraitGroup;
  min: number;
  max: number;
  /** Unsupported effects are intentionally excluded from the prototype roll pool. */
  implemented: boolean;
}

/** The complete approved 18-trait catalogue, without pretending every effect works yet. */
export const ENEMY_V2_TRAITS: Readonly<Record<EnemyV2TraitId,Readonly<TraitSpec>>> = Object.freeze({
  savage:{label:'Savage',group:'offense',min:.05,max:.08,implemented:true},
  swift:{label:'Swift',group:'offense',min:.05,max:.08,implemented:true},
  keen:{label:'Keen',group:'offense',min:.03,max:.05,implemented:true},
  piercing:{label:'Piercing',group:'offense',min:.05,max:.08,implemented:false},
  enraged:{label:'Enraged',group:'offense',min:.10,max:.15,implemented:false},
  vampiric:{label:'Vampiric',group:'offense',min:.02,max:.03,implemented:false},
  stonehide:{label:'Stonehide',group:'defense',min:.06,max:.10,implemented:true},
  warded:{label:'Warded',group:'defense',min:.06,max:.10,implemented:false},
  fortified:{label:'Fortified',group:'defense',min:.03,max:.05,implemented:true},
  elusive:{label:'Elusive',group:'defense',min:.02,max:.04,implemented:false},
  resolute:{label:'Resolute',group:'defense',min:.15,max:.25,implemented:false},
  regenerating:{label:'Regenerating',group:'defense',min:.0015,max:.0025,implemented:true},
  venomous:{label:'Venomous',group:'control',min:.10,max:.12,implemented:true},
  rending:{label:'Rending',group:'control',min:.10,max:.12,implemented:true},
  chilling:{label:'Chilling',group:'control',min:.08,max:.10,implemented:false},
  hexing:{label:'Hexing',group:'control',min:.05,max:.08,implemented:true},
  thorned:{label:'Thorned',group:'defense',min:.03,max:.05,implemented:false},
  sundering:{label:'Sundering',group:'control',min:.05,max:.08,implemented:false},
});

const POOLS: Readonly<Record<EnemyV2Archetype,readonly EnemyV2TraitId[]>> = {
  bulwark:['stonehide','fortified','resolute','thorned'],
  berserker:['savage','rending','enraged','vampiric'],
  predator:['swift','keen','rending','elusive'],
  spellcaster:['hexing','warded','chilling','venomous'],
  hexer:['hexing','venomous','chilling','sundering'],
  mender:['regenerating','fortified','warded','resolute'],
};

const PVE_TO_V2:Readonly<Record<string,EnemyV2Archetype>> = {
  guardian:'bulwark',bruiser:'berserker',executioner:'berserker',
  assassin:'predator',swarm:'predator',caster:'spellcaster',
  hexer:'hexer',support:'mender',
};
const REGION_CHANCE:Readonly<Record<EnemyV2Region,number>> = {
  asterfall:.20,sunscar:.40,frostmarch:.55,
};
const TAG_PREFIX='enemy-v2:';

export interface EnemyV2ServerOptions {
  /** Requires explicit server authorization; never sourced from incoming client JSON. */
  ruleset: typeof ENEMY_V2_RULESET;
  serverSeed: string;
  encounterId: string;
  region: EnemyV2Region;
  equipmentTier: EnemyV2Tier;
  /** IDs of elite enemies from authoritative encounter data, not presentation labels. */
  eliteEnemyIds?: readonly string[];
}

export interface EnemyV2Prepared {
  enemies: CombatantDefinition[];
  /** Presentation-safe: IDs and names, no RNG seed or rolled effect magnitudes. */
  preview: Array<{enemyId:string;archetype:EnemyV2Archetype;traitIds:EnemyV2TraitId[];traitLabels:string[]}>;
}

function unit(rng:CombatRng,label:string):number {
  // Portable legacy CombatRng.next() returns [0, 0.5). Scale ONLY these
  // isolated prototype rolls; do not alter the combat engine's RNG sequence.
  return Math.min(1-Number.EPSILON,rng.next(label)*2);
}

function archetypeOf(enemy:CombatantDefinition):EnemyV2Archetype|undefined {
  const pve=(enemy.tags??[]).find(tag=>tag.startsWith('pve:archetype:'))?.slice('pve:archetype:'.length);
  return pve ? PVE_TO_V2[pve] : undefined;
}

function traitAbility(id:EnemyV2TraitId,power:number,enemy:CombatantDefinition):AbilityDefinition|undefined {
  const base={id:`ENEMY_V2_${id.toUpperCase()}`,name:ENEMY_V2_TRAITS[id].label,priority:45};
  switch(id) {
    case 'fortified':
      // The base engine has no one-shot ability flag yet; a 24h cooldown is
      // longer than any supported encounter and prevents repeat shield farming.
      return {...base,cooldownMs:86400000,castTimeMs:0,target:'self',effects:[{kind:'shield',flat:Math.round(enemy.stats.maxHp*power)}]};
    case 'regenerating':
      return {...base,cooldownMs:24000,castTimeMs:0,target:'self',aiCondition:'self_below_50',effects:[{kind:'hot',flat:enemy.stats.maxHp*power,durationMs:6000,tickMs:1000,tag:'regeneration'}]};
    case 'rending':
    case 'venomous':
      return {...base,cooldownMs:14000,castTimeMs:500,target:'current_target',effects:[
        {kind:'damage',coeff:.9,damageType:'physical'},
        {kind:'dot',coeff:power,durationMs:4000,tickMs:1000,damageType:id==='rending'?'physical':'nature',tag:id==='rending'?'bleed':'poison'},
      ]};
    case 'hexing':
      return {...base,cooldownMs:14000,castTimeMs:500,target:'current_target',effects:[
        {kind:'damage',coeff:.7,damageType:'shadow'},
        {kind:'debuff',tag:'damage_done',value:-power,durationMs:4000},
      ]};
    default:return undefined;
  }
}
function applyTrait(enemy:CombatantDefinition,id:EnemyV2TraitId,power:number):CombatantDefinition {
  const stats={...enemy.stats};
  switch(id){
    case 'savage':stats.attackPower*=1+power;break;
    case 'swift':stats.haste+=power;break;
    case 'keen':stats.critChance=Math.min(.75,stats.critChance+power);break;
    case 'stonehide':stats.defense*=1+power;break;
  }
  const ability=traitAbility(id,power,enemy);
  return {...enemy,stats,abilities:ability?[...enemy.abilities,ability]:[...enemy.abilities]};
}
function pickTraits(rng:CombatRng,pool:readonly EnemyV2TraitId[],count:number):EnemyV2TraitId[]{
  const selected:EnemyV2TraitId[]=[];
  const available=pool.filter(id=>ENEMY_V2_TRAITS[id].implemented);
  for(let i=0;i<count;i++){
    // At most one major offensive and one defensive trait. Control can coexist.
    const eligible=available.filter(id=>!selected.includes(id)&&
      (ENEMY_V2_TRAITS[id].group==='control'||!selected.some(p=>ENEMY_V2_TRAITS[p].group===ENEMY_V2_TRAITS[id].group)));
    if(!eligible.length)break;
    const index=Math.floor(unit(rng,`trait:${i}`)*eligible.length);
    selected.push(eligible[index]);
  }
  return selected;
}

/**
 * Explicit opt-in transform. Missing ruleset => strict legacy no-op.
 * Bosses are excluded: they will receive handcrafted kits in a later pass.
 * Never call again after a snapshot has been persisted.
 */
export function prepareEnemyV2(
  definitions:readonly CombatantDefinition[],
  options?:EnemyV2ServerOptions,
):EnemyV2Prepared {
  if(!options || options.ruleset!==ENEMY_V2_RULESET)
    return {enemies:definitions.slice(),preview:[]};
  if(!options.serverSeed||!options.encounterId)throw new Error('enemy_v2_requires_server_seed_and_encounter');
  const eliteIds=new Set(options.eliteEnemyIds??[]);
  const preview:EnemyV2Prepared['preview']=[];
  const enemies=definitions.map(enemy=>{
    if(enemy.team!=='enemies'||enemy.boss||options.equipmentTier===1||
       (enemy.tags??[]).some(tag=>tag.startsWith(TAG_PREFIX)))return enemy;
    const archetype=archetypeOf(enemy);
    if(!archetype)return enemy; // Preserve existing unknown/legacy families.
    const rng=new CombatRng(`${options.serverSeed}:enemy-v2:${options.encounterId}:${enemy.id}`);
    const kind:EnemyV2Kind=eliteIds.has(enemy.id)?'elite':'normal';
    const shouldRoll=kind==='elite'||unit(rng,'spawn')<REGION_CHANCE[options.region];
    if(!shouldRoll)return enemy;
    const count=kind==='elite'&&options.equipmentTier>=3?2:1;
    const chosen=pickTraits(rng,POOLS[archetype],count);
    if(!chosen.length)return enemy;
    let next:CombatantDefinition={...enemy,stats:{...enemy.stats},abilities:[...enemy.abilities],tags:[...(enemy.tags??[]),`${TAG_PREFIX}archetype:${archetype}`]};
    for(const id of chosen) {
      const spec=ENEMY_V2_TRAITS[id];
      const power=spec.min+(spec.max-spec.min)*unit(rng,`power:${id}`);
      next=applyTrait(next,id,power);
      next.tags=[...(next.tags??[]),`${TAG_PREFIX}trait:${id}`];
    }
    preview.push({enemyId:enemy.id,archetype,traitIds:chosen,traitLabels:chosen.map(id=>ENEMY_V2_TRAITS[id].label)});
    return next;
  });
  return {enemies,preview};
}
