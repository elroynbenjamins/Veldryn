import type {AbilityDefinition,CombatantDefinition,DamageType} from './types';

export type PveArchetype='bruiser'|'assassin'|'caster'|'swarm'|'guardian'|'hexer'|'executioner'|'support';
export type PveMechanicId='heavy_hit'|'focus'|'interrupt'|'aoe'|'dot'|'vulnerability'|'healing_reduction'|'barrier'|'enrage'|'execute'|'sustain';

export interface PveMechanicPresentation{id:PveMechanicId;label:string;description:string;}
export interface PveEncounterPreview{
  archetypes:Array<{id:PveArchetype;label:string}>;
  mechanics:PveMechanicPresentation[];
  summary:string;
}

const ARCHETYPE_LABEL:Readonly<Record<PveArchetype,string>>=Object.freeze({
  bruiser:'Bruiser',assassin:'Assassin',caster:'Caster',swarm:'Swarm',guardian:'Guardian',hexer:'Hexer',executioner:'Executioner',support:'Support',
});
const MECHANICS:Readonly<Record<PveMechanicId,PveMechanicPresentation>>=Object.freeze({
  heavy_hit:{id:'heavy_hit',label:'Heavy Hit',description:'Strong focused attacks create tank pressure.'},
  focus:{id:'focus',label:'Focus',description:'Can pressure a non-tank party member.'},
  interrupt:{id:'interrupt',label:'Interrupt',description:'Dangerous casts can be interrupted.'},
  aoe:{id:'aoe',label:'Party Damage',description:'Can damage multiple party members at once.'},
  dot:{id:'dot',label:'DoT',description:'Applies damage over time.'},
  vulnerability:{id:'vulnerability',label:'Vulnerability',description:'Applies increased damage taken.'},
  healing_reduction:{id:'healing_reduction',label:'Heal Cut',description:'Reduces healing received for a short time.'},
  barrier:{id:'barrier',label:'Barrier',description:'Can create a protective barrier.'},
  enrage:{id:'enrage',label:'Enrage',description:'Temporarily increases offensive pressure.'},
  execute:{id:'execute',label:'Execute',description:'Deals increased damage to low-health targets.'},
  sustain:{id:'sustain',label:'Sustain',description:'Can restore health or prolong the fight.'},
});

const archetypeTag=(value:PveArchetype)=>`pve:archetype:${value}`;
const mechanicTag=(value:PveMechanicId)=>`pve:mechanic:${value}`;

export function withPveIdentity(definition:CombatantDefinition,archetype:PveArchetype,mechanics:readonly PveMechanicId[]):CombatantDefinition{
  const existing=(definition.tags??[]).filter(tag=>!tag.startsWith('pve:archetype:')&&!tag.startsWith('pve:mechanic:'));
  return {...definition,tags:[...existing,archetypeTag(archetype),...[...new Set(mechanics)].map(mechanicTag)]};
}

export function pveHeavyStrike(id:string,name:string,damageType:DamageType,coeff:number,cooldownMs=6800,castTimeMs=700):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs,target:'current_target',priority:78,effects:[{kind:'damage',coeff,damageType}]};
}
export function pveFocusStrike(id:string,name:string,damageType:DamageType,coeff:number,cooldownMs=7000):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:500,target:'random_enemy',priority:92,effects:[{kind:'damage',coeff,damageType,executeBelowHpPct:.35,executeBonus:.22}]};
}
export function pveInterruptibleWave(id:string,name:string,damageType:DamageType,coeff:number,cooldownMs=9800,castTimeMs=1300):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs,target:'all_enemies',priority:95,interruptible:true,effects:[{kind:'damage',coeff,damageType}]};
}
export function pveHex(id:string,name:string,damageType:DamageType,coeff=.62,cooldownMs=7600):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:800,target:'current_target',priority:92,effects:[{kind:'damage',coeff,damageType},{kind:'debuff',tag:'damage_taken',value:.07,durationMs:6000}]};
}
export function pveDotWave(id:string,name:string,damageType:DamageType,coeff=.5,cooldownMs=9800):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:1300,target:'all_enemies',priority:94,interruptible:true,effects:[{kind:'damage',coeff,damageType},{kind:'dot',coeff:.10,damageType,durationMs:6000,tickMs:2000}]};
}
export function pveBarrier(id:string,name:string,flat:number,cooldownMs=12000):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:0,target:'self',priority:88,effects:[{kind:'shield',flat}]};
}
export function pveEnrage(id:string,name:string,value=.1,cooldownMs=16000):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:0,target:'self',priority:70,effects:[{kind:'buff',tag:'damage_done',value,durationMs:7000}]};
}
export function pveExecuteStrike(id:string,name:string,damageType:DamageType,coeff:number,cooldownMs=7200):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:650,target:'current_target',priority:90,effects:[{kind:'damage',coeff,damageType,executeBelowHpPct:.35,executeBonus:.3}]};
}
export function pveSustain(id:string,name:string,flat:number,cooldownMs=11000):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:900,target:'self',priority:86,aiCondition:'self_below_50',effects:[{kind:'heal',flat}]};
}

export function pveAllyMend(id:string,name:string,flat:number,cooldownMs=9000):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:850,target:'lowest_hp_ally',priority:96,aiCondition:'ally_below_80',effects:[{kind:'heal',flat}]};
}
export function pveSupportRally(id:string,name:string,value=.06,cooldownMs=14500):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:0,target:'all_allies',priority:72,effects:[{kind:'buff',tag:'damage_done',value,durationMs:6000}]};
}
export function pveHealingPressure(id:string,name:string,damageType:DamageType,coeff=.52,cooldownMs=8200):AbilityDefinition{
  return{id,name,cooldownMs,castTimeMs:750,target:'current_target',priority:93,effects:[{kind:'damage',coeff,damageType},{kind:'debuff',tag:'healing_received',value:-.25,durationMs:6000}]};
}

function parseArchetype(tags:readonly string[]):PveArchetype|undefined{
  const value=tags.find(tag=>tag.startsWith('pve:archetype:'))?.slice('pve:archetype:'.length) as PveArchetype|undefined;
  return value&&value in ARCHETYPE_LABEL?value:undefined;
}
function parseMechanics(tags:readonly string[]):PveMechanicId[]{
  return [...new Set(tags.filter(tag=>tag.startsWith('pve:mechanic:')).map(tag=>tag.slice('pve:mechanic:'.length) as PveMechanicId).filter(value=>value in MECHANICS))];
}
export function pveEncounterPreview(definitions:readonly CombatantDefinition[]):PveEncounterPreview|undefined{
  const enemies=definitions.filter(definition=>definition.team==='enemies');if(!enemies.length)return undefined;
  const archetypes=[...new Set(enemies.map(enemy=>parseArchetype(enemy.tags??[])).filter((value):value is PveArchetype=>Boolean(value)))].slice(0,2);
  const mechanicIds=[...new Set(enemies.flatMap(enemy=>parseMechanics(enemy.tags??[])))].slice(0,4);
  if(!archetypes.length&&!mechanicIds.length)return undefined;
  const mechanics=mechanicIds.map(id=>MECHANICS[id]);
  const labels=[...archetypes.map(id=>ARCHETYPE_LABEL[id]),...mechanics.slice(0,2).map(item=>item.label)];
  return{archetypes:archetypes.map(id=>({id,label:ARCHETYPE_LABEL[id]})),mechanics,summary:labels.join(' · ')};
}
