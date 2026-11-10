import type {AbilityDefinition,CombatantDefinition} from '../combat/types';

/**
 * Server-only encounter counters for the companion already frozen into a character.
 * No extra party member, no item mutations, no new rewards and at most one counter
 * per player/room. Never read a player-supplied companion or mechanic modifier.
 */
export type DungeonCompanionCounterId='armor_break'|'swarm_hunt'|'bulwark'|'recovery'|'spellbreak'|'finisher';
export interface DungeonCompanionCounter{
 playerId:string;companionId:string;id:DungeonCompanionCounterId;description:string;
}
type CounterProfile={id:DungeonCompanionCounterId;companionIds:readonly string[];description:string;applies:(traits:ReadonlySet<string>)=>boolean};
const counters:readonly CounterProfile[]=[
 {id:'spellbreak',companionIds:['UNIT_005'],description:'Lantern Wisp interrupts dangerous casts instead of casting its usual healing assist.',applies:t=>t.has('interruptible_cast')},
 {id:'armor_break',companionIds:['UNIT_010','UNIT_021','GUILD_UNIT_002'],description:'Armor breaker: +3.5% owner Attack and +6% companion strike against guardians or barriers.',applies:t=>t.has('guardian')||t.has('barrier')},
 {id:'swarm_hunt',companionIds:['UNIT_017','UNIT_023'],description:'Swarm hunter: +2.5 percentage points owner Haste and +6% companion strike against swarms.',applies:t=>t.has('swarm')},
 {id:'bulwark',companionIds:['UNIT_002','UNIT_015','UNIT_019','UNIT_022'],description:'Bulwark: +4% owner Defense and +6% companion shielding against heavy pressure.',applies:t=>t.has('heavy_hit')||t.has('focus')||t.has('execute')},
 {id:'recovery',companionIds:['UNIT_003','UNIT_014','UNIT_018','UNIT_024'],description:'Recovery: +4% owner Healing Power and +6% companion heals against sustained pressure.',applies:t=>t.has('dot')||t.has('healing_reduction')},
 {id:'finisher',companionIds:['UNIT_007','UNIT_013','UNIT_020'],description:'Finisher: +3% owner Attack and +6% companion strike against self-healing enemies.',applies:t=>t.has('sustain')},
];

/** Read server-authored enemy tags and actual, unsuppressed skills after room tuning. */
export function dungeonEncounterTraits(enemies:readonly CombatantDefinition[]):ReadonlySet<string>{
 const traits=new Set<string>();
 for(const enemy of enemies){
  if(enemy.team!=='enemies')continue;
  for(const tag of enemy.tags??[]){
   if(tag.startsWith('pve:archetype:'))traits.add(tag.slice('pve:archetype:'.length));
   if(tag.startsWith('pve:mechanic:'))traits.add(tag.slice('pve:mechanic:'.length));
  }
  for(const ability of enemy.abilities){
   if(ability.interruptible&&ability.castTimeMs>=800&&ability.effects.some(effect=>effect.kind==='damage'||effect.kind==='dot'))traits.add('interruptible_cast');
   if(ability.effects.some(effect=>effect.kind==='shield'))traits.add('barrier');
   if(ability.effects.some(effect=>effect.kind==='dot'))traits.add('dot');
   if(ability.effects.some(effect=>effect.kind==='heal'))traits.add('sustain');
  }
 }
 return traits;
}

function companionAssist(player:CombatantDefinition):{id:string;ability:AbilityDefinition}|undefined{
 const companionId=(player.tags??[]).find(tag=>tag.startsWith('companion:'))?.slice('companion:'.length);
 if(!companionId)return undefined;
 const ability=player.abilities.find(item=>item.tags?.includes('combat_companion')&&item.id===`${player.id}:${companionId}:assist`);
 return ability?{id:companionId,ability}:undefined;
}
function scaleAssist(ability:AbilityDefinition,kind:'damage'|'shield'|'heal'){
 return {...ability,effects:ability.effects.map(effect=>effect.kind===kind?{
  ...effect,...(effect.coeff===undefined?{}:{coeff:effect.coeff*1.06}),
  ...(effect.flat===undefined?{}:{flat:effect.flat*1.06}),
 }:effect)};
}

export function applyDungeonCompanionCounters(
 players:readonly CombatantDefinition[],
 enemies:readonly CombatantDefinition[],
 inactivePlayerIds:ReadonlySet<string>=new Set(),
):{players:CombatantDefinition[];matchups:DungeonCompanionCounter[]}{
 const traits=dungeonEncounterTraits(enemies),matchups:DungeonCompanionCounter[]=[];
 const adjusted=players.map(player=>{
  if(inactivePlayerIds.has(player.id))return player;
  const assist=companionAssist(player);if(!assist)return player;
  const counter=counters.find(entry=>entry.companionIds.includes(assist.id)&&entry.applies(traits));
  if(!counter)return player;
  let ability=assist.ability,stats=player.stats;
  switch(counter.id){
   case 'spellbreak':
    // Swap rather than add an action: the single assist cooldown remains budgeted.
    ability={...ability,target:'interruptible_casting_enemy',aiCondition:'target_casting',priority:96,effects:[{kind:'interrupt',tag:'companion_spellbreak'}]};
    break;
   case 'armor_break':
    stats={...stats,attackPower:stats.attackPower*1.035};ability=scaleAssist(ability,'damage');break;
   case 'swarm_hunt':
    stats={...stats,haste:Math.min(.75,stats.haste+.025)};ability=scaleAssist(ability,'damage');break;
   case 'bulwark':
    stats={...stats,defense:stats.defense*1.04};ability=scaleAssist(ability,'shield');break;
   case 'recovery':
    stats={...stats,healingPower:stats.healingPower*1.04};ability=scaleAssist(ability,'heal');break;
   case 'finisher':
    stats={...stats,attackPower:stats.attackPower*1.03};ability=scaleAssist(ability,'damage');break;
  }
  matchups.push({playerId:player.id,companionId:assist.id,id:counter.id,description:counter.description});
  return {...player,stats,abilities:player.abilities.map(item=>item===assist.ability?ability:item)};
 });
 return {players:adjusted,matchups};
}
