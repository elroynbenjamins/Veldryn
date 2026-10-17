import {combatCompanionDef,COMPANION_RARITY_CONFIG} from '../content/combat-companions';
import {companionCombatContribution} from './combat-companions';
import {effectiveStats} from './game';
import {characterPermanentMultipliers} from './permanent-boosts';
import type {GameState} from './types';

export type CombatPowerBreakdownRow={id:'base'|'build'|'passives'|'companion';label:string;value:number;detail:string};

const statScore=(stats:{hp:number;attack:number;defense:number;power?:number;critChance?:number;critMultiplier?:number;accuracy?:number;evasion?:number;haste?:number},level:number)=>Math.max(0,Math.round(
  stats.attack*18+stats.defense*11+stats.hp*.7+(stats.power??0)*4+level*12+
  (stats.critChance??0)*220+(stats.critMultiplier??1.5)*18+(stats.accuracy??.84)*45+
  (stats.evasion??.04)*50+(stats.haste??.05)*150,
));

/** A readable build comparison score, not a replacement for encounter damage simulation. */
export function combatPowerRating(state:GameState){
  const character=state.character;
  if(!character)return {total:0,player:0,companion:0,rows:[] as CombatPowerBreakdownRow[]};
  const stats=effectiveStats(state),player=statScore(stats,character.level);
  const base=statScore({hp:character.hp,attack:character.attack,defense:character.defense},character.level);
  const permanent=characterPermanentMultipliers(state);
  const passive=Math.max(0,Math.round(player*(1-1/Math.max(1,permanent.combatPowerMultiplier))));
  const build=Math.max(0,player-base-passive);
  const id=character.equippedCombatCompanionId,def=id?combatCompanionDef(id):undefined,progress=id?state.account.combatCompanionProgress?.[id]:undefined;
  const contribution=companionCombatContribution(state);
  const companion=def&&progress
    ?Math.round((def.baseStats.power*18+def.baseStats.defense*10+def.baseStats.hp*.3)*(1+(progress.level-1)*.025+progress.ascensionTier*.1+progress.bondLevel*.01)*COMPANION_RARITY_CONFIG[def.rarity].targetPowerMultiplier+player*contribution.contributionPct)
    :0;
  const rows:CombatPowerBreakdownRow[]=[
    {id:'base',label:'Class base',value:base,detail:`Level ${character.level} base stats`},
    {id:'build',label:'Gear, sets & gems',value:build,detail:'Equipped stat gains and build effects'},
    {id:'passives',label:'Passive bonuses',value:passive,detail:passive?`Active permanent combat bonuses · +${Math.round((permanent.combatPowerMultiplier-1)*100)}%`:'No direct combat-power passive active'},
    {id:'companion',label:'Combat companion',value:companion,detail:def&&progress?`${def.name} · Lv. ${progress.level} · Bond ${progress.bondLevel}`:'No combat companion equipped'},
  ];
  return {total:player+companion,player,companion,rows};
}
