export interface CombatGearStats{
 attack:number;
 defense:number;
 hp:number;
 power:number;
}
export interface EquipmentTradeOff{
 grade:'improvement'|'tradeoff'|'downgrade'|'neutral';
 title:string;
 changes:readonly {key:'attack'|'defense'|'hp';label:string;difference:number}[];
 description:string;
}

/** Explains the real fully projected loadout delta, including socket and set
 * changes calculated by effectiveStats. Never infer an upgrade from Power
 * alone: gaining Attack at the expense of HP is a player decision.
 */
export function equipmentTradeOff(before:CombatGearStats,after:CombatGearStats):EquipmentTradeOff{
 const changes=[
  {key:'attack' as const,label:'Attack',difference:after.attack-before.attack},
  {key:'defense' as const,label:'Defense',difference:after.defense-before.defense},
  {key:'hp' as const,label:'Health',difference:after.hp-before.hp},
 ].filter(change=>Number.isFinite(change.difference)&&change.difference!==0);
 const positives=changes.filter(change=>change.difference>0).length;
 const negatives=changes.filter(change=>change.difference<0).length;
 const grade:EquipmentTradeOff['grade']=positives&&negatives?'tradeoff':positives?'improvement':negatives?'downgrade':'neutral';
 const title=grade==='tradeoff'?'Mixed stat trade-off'
  :grade==='improvement'?'Stat gains'
  :grade==='downgrade'?'Stat losses':'No direct stat change';
 const description=changes.length
  ?changes.map(change=>`${change.difference>0?'+':''}${change.difference} ${change.label}`).join(' · ')
  :'Both setups have the same Attack, Defense and Health.';
 return {grade,title,changes,description};
}
