import type {CombatantDefinition} from './types';
import {ENEMY_V2_TRAITS,type EnemyV2Archetype,type EnemyV2TraitId} from './enemy-v2-prototype';
import {pveBossTelegraph} from './pve-encounter-identity';

/**
 * Mobile-friendly, read-only prototype metadata. This is a server projection,
 * NOT a client-selectable encounter or gameplay activation flag.
 *
 * Never reveal trait power rolls, combat seed, equipment rolls, actor stats,
 * damage coefficients, cooldown priority or private encounter state.
 */
const labels:Readonly<Record<EnemyV2Archetype,string>>={
  bulwark:'Bulwark',berserker:'Berserker',predator:'Predator',
  spellcaster:'Spellcaster',hexer:'Hexer',mender:'Mender',
};
const icons={offense:'swords',defense:'shield',control:'sparkles'} as const;
const descriptions:Readonly<Record<EnemyV2TraitId,string>>={
  savage:'Stronger attacks',swift:'Faster attacks',keen:'More critical hits',
  piercing:'Penetrates Armor',enraged:'More dangerous when wounded',
  vampiric:'Recovers health from damage',stonehide:'Increased physical defense',
  warded:'Increased magical protection',fortified:'Starts with extra protection',
  elusive:'Harder to hit',resolute:'Shorter debuff duration',
  regenerating:'Restores health over time',venomous:'Inflicts Poison',
  rending:'Inflicts Bleed',chilling:'Slows attacks',hexing:'Weakens outgoing damage',
  thorned:'Returns a little damage',sundering:'Weakens Armor',
};
export interface EnemyV2TraitPreview {
  id:EnemyV2TraitId;
  label:string;
  description:string;
  category:'offense'|'defense'|'control';
  icon:'swords'|'shield'|'sparkles';
}
export interface EnemyV2BossPreview {
  phases:ReadonlyArray<{id:string;label:string;hpPct:number}>;
  casts:ReadonlyArray<{id:string;label:string;castMs:number;interruptible:boolean}>;
}
export interface EnemyV2CombatCard {
  enemyId:string;
  name:string;
  archetype?:{id:EnemyV2Archetype;label:string};
  traits:EnemyV2TraitPreview[];
  boss?:EnemyV2BossPreview;
}

function projectedArchetype(tags:readonly string[]):EnemyV2CombatCard['archetype'] {
  const id=tags.find(t=>t.startsWith('enemy-v2:archetype:'))?.slice('enemy-v2:archetype:'.length);
  if(!id||!Object.prototype.hasOwnProperty.call(labels,id))return undefined;
  return {id:id as EnemyV2Archetype,label:labels[id as EnemyV2Archetype]};
}
function traitProjection(tags:readonly string[]):EnemyV2TraitPreview[]{
  const seen=new Set<string>(),entries:EnemyV2TraitPreview[]=[];
  for(const tag of tags) {
    if(!tag.startsWith('enemy-v2:trait:'))continue;
    const id=tag.slice('enemy-v2:trait:'.length) as EnemyV2TraitId;
    if(!Object.prototype.hasOwnProperty.call(ENEMY_V2_TRAITS,id)||seen.has(id))continue;
    seen.add(id);
    const spec=ENEMY_V2_TRAITS[id];
    entries.push({id,label:spec.label,description:descriptions[id],category:spec.group,icon:icons[spec.group]});
    if(entries.length>=2)break;
  }
  return entries;
}

/** Only accept server-derived combatant definitions, not arbitrary client data. */
export function enemyV2CombatCards(definitions:readonly CombatantDefinition[]):EnemyV2CombatCard[]{
  return definitions.filter(def=>def.team==='enemies').map(def=>{
    const tags=def.tags??[];
    const card:EnemyV2CombatCard={
      enemyId:def.id,name:def.name,
      traits:traitProjection(tags),
    };
    const archetype=projectedArchetype(tags);
    if(archetype)card.archetype=archetype;
    if(def.boss&&tags.some(tag=>tag.startsWith('enemy-v2:boss-profile:'))){
      const plan=pveBossTelegraph([def]);
      if(plan)card.boss={
        phases:plan.phases.map(p=>({id:p.id,label:p.label,hpPct:p.hpPct})),
        casts:plan.castAbilities.map(a=>({id:a.id,label:a.label,castMs:a.castMs,interruptible:a.interruptible})),
      };
    }
    return card;
  });
}
