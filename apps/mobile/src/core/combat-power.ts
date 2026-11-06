import {combatCompanionDef,COMPANION_RARITY_CONFIG} from '../content/combat-companions';
import {CLASSES} from '../content/classes';
import {companionCombatContribution} from './combat-companions';
import {effectiveStats} from './game';
import type {GameState} from './types';

export type CombatPowerBreakdownRow={id:'base'|'build'|'passives'|'companion';label:string;value:number;detail:string};

const statScore=(stats:{hp:number;attack:number;defense:number;power?:number;critChance?:number;critMultiplier?:number;accuracy?:number;evasion?:number;haste?:number;armor?:number;ward?:number;tenacity?:number;potency?:number;penetration?:number},level:number)=>Math.max(0,Math.round(
  stats.attack*18+stats.defense*11+stats.hp*.7+(stats.power??0)*4+level*12+
  (stats.critChance??0)*220+(stats.critMultiplier??1.5)*18+(stats.accuracy??.84)*45+
  (stats.evasion??.04)*50+(stats.haste??.05)*150+
  (stats.armor??0)*110+(stats.ward??0)*140+(stats.tenacity??0)*60+
  (stats.potency??0)*80+(stats.penetration??0)*135,
));

/** A readable build comparison score, not a replacement for encounter damage simulation.\n * Breakdown rows are exact marginal projections, not estimated source percentages. */
export function combatPowerRating(state:GameState){
  const character=state.character;
  if(!character)return {total:0,player:0,companion:0,rows:[] as CombatPowerBreakdownRow[]};
  const stats=effectiveStats(state),player=statScore(stats,character.level);
  const role=CLASSES.find(def=>def.id===character.classId)?.role;
  const base=statScore({
    hp:character.hp,attack:character.attack,defense:character.defense,
    power:Math.round(character.attack*1.5+character.defense*.8+character.hp*.08+character.level*2.5),
    critChance:role==='Damage'?.10:.05,critMultiplier:1.5,
    accuracy:.84,evasion:role==='Damage'?.07:.04,haste:.05,
  },character.level);
  // Project the same character without equipment. This preserves genuine
  // class/Faith/permanent effects while removing gear, sets and all socket
  // gems. Differences telescope to the exact displayed player rating.
  const unequipped:GameState={...state,character:{...character,equipment:{},equipmentInstanceIds:{}}};
  const withoutGear=statScore(effectiveStats(unequipped),character.level);
  const build=player-withoutGear;
  const passive=withoutGear-base;
  const id=character.equippedCombatCompanionId,def=id?combatCompanionDef(id):undefined,progress=id?state.account.combatCompanionProgress?.[id]:undefined;
  const contribution=companionCombatContribution(state);
  const companion=def&&progress
    ?Math.round((def.baseStats.power*18+def.baseStats.defense*10+def.baseStats.hp*.3)*(1+(progress.level-1)*.025+progress.ascensionTier*.1+progress.bondLevel*.01)*COMPANION_RARITY_CONFIG[def.rarity].targetPowerMultiplier+player*contribution.contributionPct)
    :0;
  const rows:CombatPowerBreakdownRow[]=[
    {id:'base',label:'Class base',value:base,detail:`Level ${character.level} base stats`},
    {id:'build',label:'Gear, sets & gems',value:build,detail:'Equipped stat gains and build effects'},
    {id:'passives',label:'Other character bonuses',value:passive,detail:'Class training, Faith, preparation and permanent boosts'},
    {id:'companion',label:'Combat companion',value:companion,detail:def&&progress?`${def.name} · Lv. ${progress.level} · Bond ${progress.bondLevel}`:'No combat companion equipped'},
  ];
  return {total:player+companion,player,companion,rows};
}
