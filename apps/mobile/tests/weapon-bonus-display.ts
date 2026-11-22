import {weaponBonusComparisonRows,weaponBonusDisplayPercent,weaponBonusDisplayDelta} from '../src/core/weapon-bonus-display';
import {WEAPON_BONUS_CURRENT_POOL,weaponBonusConfig,weaponBonusRange} from '../src/core/weapon-bonus-rolls';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {weaponBonusStatText,weaponBonusUiText} from '../src/i18n/weapon-bonus-ux';

const check=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
const one=weaponBonusComparisonRows([{stat:'haste',basisPoints:120},{stat:'accuracy',basisPoints:80}],
  [{stat:'haste',basisPoints:170},{stat:'accuracy',basisPoints:130}]);
check(one.length===2&&one.some(row=>row.stat==='haste'&&row.deltaBps===50)&&one.some(row=>row.stat==='accuracy'&&row.deltaBps===50),
  'Equal stat pools must compare exact before/after bonus values, not total character power');
check(weaponBonusDisplayPercent(0)==='—'&&weaponBonusDisplayPercent(80)==='+0.8%',
  'Missing and present bonus values need a readable distinction');
check(weaponBonusDisplayDelta(50)==='+0.5%'&&weaponBonusDisplayDelta(-20)==='−0.2%'
  &&weaponBonusDisplayDelta(0)==='—','Bonus deltas show the numeric difference between percent bonuses as % while preserving losses');

const removed=weaponBonusComparisonRows([{stat:'critRate',basisPoints:150}],[]);
check(removed.length===1&&removed[0].deltaBps===-150&&removed[0].afterBps===0,
  'Replacing rolled gear with an unrolled candidate must show stat loss');
const introduced=weaponBonusComparisonRows([],[{stat:'potency',basisPoints:100}]);
check(introduced.length===1&&introduced[0].beforeBps===0&&introduced[0].deltaBps===100,
  'Newly added bonus types must appear');
const legacy=weaponBonusComparisonRows([{stat:'ward',basisPoints:100},{stat:'penetration',basisPoints:150}],
  [{stat:'tenacity',basisPoints:100}]);
check(legacy.length===3&&legacy.some(row=>row.stat==='ward'&&row.deltaBps===-100)
  &&legacy.some(row=>row.stat==='penetration'&&row.deltaBps===-150),
  'Old Ward and Penetration roll values must remain visible in equipment comparisons');
check(weaponBonusComparisonRows([],[]).length===0,'Unrolled copies should have no bonus table');
check(new Set(WEAPON_BONUS_CURRENT_POOL).size===7,'Seven class-neutral live roll types expected');
const nonWeapon=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T1'&&itemDef(row.output.itemId).slot==='chest');
check(nonWeapon&&!weaponBonusConfig(nonWeapon.output.itemId,'common'),
  'Forge must not promise weapon-specific affixes on armor or other gear slots');

for(const language of SUPPORTED_LANGUAGES){
  for(const key of ['possible','possibleCount','oneOrTwo','twoCount','single','double','shared','claim','current','candidate','points'] as const)
    check(!!weaponBonusUiText(language,key).trim(),language+' missing bonus UX label '+key);
  for(const stat of ['maxHp','armor','tenacity','critRate','haste','accuracy','potency','ward','penetration','evasion','critDamage','abilityDamage','healingPower'] as const)
    check(!!weaponBonusStatText(language,stat).trim(),language+' missing stat name '+stat);
}

for(const tier of ['T1','T2','T3','T4','T5','T6','T7','T8','T9']){
  const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier===tier&&itemDef(row.output.itemId).slot==='weapon');
  check(recipe,`Missing ${tier} forged weapon recipe`);
  const config=weaponBonusConfig(recipe!.output.itemId,'common');
  check(config?.tier===Number(tier.slice(1)),'Forge disclosure must match selected recipe tier');
  check(config?.pool.length===7,'Forge disclosure must include exactly seven live stats');
  check(config?.count===(Number(tier.slice(1))>=5?2:1),'Per-tier bonus count must match Forge eligibility');
  for(const stat of WEAPON_BONUS_CURRENT_POOL){
    const range=weaponBonusRange(config!.tier,stat);
    check(range&&range[0]>0&&range[1]>=range[0],`Missing ${tier} ${stat} range`);
  }
}
console.log('PASS: T1–T9 bonus UX values, legacy changes, losses and all eight locales');
