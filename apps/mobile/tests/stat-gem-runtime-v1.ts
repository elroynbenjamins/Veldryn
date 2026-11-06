import {createCharacter,effectiveStats,newGame,previewFallenKnightBattle} from '../src/core/game';
import {CANONICAL_STAT_GEM_KEYS_V1,equippedCanonicalStatGemBonusesV1,equippedGemBonuses} from '../src/core/equipment-enhancement';
import {assertEffectGemEquipAllowedV1,effectFamilyCopiesV1,equippedCanonicalGemIdsV1,resonanceForFamilyV1} from '../src/core/gem-progression-v1';
import {activeEquipmentBuildStats,equipmentSetCombatModifiers} from '../src/core/equipment-set-runtime';
import {combatPowerRating} from '../src/core/combat-power';
import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {itemDef} from '../src/content/items';
import type {CraftedGearInstance,GearSlot} from '../src/core/types';
import {MOBILE_GEM_FAMILIES_V1} from '../src/content/gems-v1';
import {formatGemValueV1} from '../src/core/gem-progression-v1';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,label:string){if(!value)throw new Error(label)}
function close(actual:number,expected:number,label:string){
 if(Math.abs(actual-expected)>1e-8)throw new Error(label+': expected '+expected+', got '+actual);
}

const backend=fs.readFileSync('../../backend/src/server/equipment/gems/gem-catalog-v1.ts','utf8');
ok(formatGemValueV1('stat_might',5).includes('Power')&&!formatGemValueV1('stat_might',5).includes('Attack'),
 'Canonical Might description must match its real Power bonus');
ok(formatGemValueV1('stat_iron',4).includes('Armor'),
 'Canonical Iron description must match its Armor bonus');
const keys=Object.keys(CANONICAL_STAT_GEM_KEYS_V1);
ok(keys.length===12,'All twelve server Stat Gem families must be mapped');
for(const familyId of keys){
 const family=MOBILE_GEM_FAMILIES_V1.find(row=>row.familyId===familyId)!;
 ok(family&&family.kind==='stat','Mobile must contain mapped canonical gem '+familyId);
 const pattern=new RegExp("familyId:'"+familyId+"',name:'[^']+',stat:'([^']+)',unit:'([^']+)',values:vals\\(([^)]+)\\)");
 const match=backend.match(pattern);
 ok(match,'Server must declare canonical Stat Gem '+familyId);
 ok(match![1]===CANONICAL_STAT_GEM_KEYS_V1[familyId as keyof typeof CANONICAL_STAT_GEM_KEYS_V1],
   'Server and mobile must agree on '+familyId+' stat key');
 ok(match![2]===family.unit,'Server and mobile must agree on '+familyId+' unit');
 const serverGrades=match![3].split(',').map(Number);
 for(const grade of [1,2,3,4,5] as const)
   close(family.values[grade],serverGrades[grade-1],familyId+' grade '+grade+' value');
}

const base=createCharacter(newGame(0),'IRONWARDEN','Stat Gem Audit');
const without=effectiveStats(base);
const withGem=(familyId:string,grade=5)=>({
 ...base,character:{...base.character!,gearEnhancements:{
  ...(base.character!.gearEnhancements??{}),
  basic_sword:{rank:0,failures:0,gemIds:['gem:'+familyId+':g'+grade],statGemId:'gem:'+familyId+':g'+grade},
 }},
});
const expected={
 stat_ward:{field:'ward',value:.0125},
 stat_precision:{field:'accuracy',value:.008},
 stat_keen:{field:'critChance',value:.006},
 stat_piercing:{field:'penetration',value:.0075},
 stat_swift:{field:'haste',value:.008},
 stat_potent:{field:'potency',value:.012},
 stat_elusive:{field:'evasion',value:.005},
 stat_resolute:{field:'tenacity',value:.009},
} as const;
for(const [familyId,row] of Object.entries(expected)){
 const actual=effectiveStats(withGem(familyId));
 close(actual[row.field]-without[row.field],row.value,'Gem must affect Character '+row.field+': '+familyId);
}
const power=effectiveStats(withGem('stat_might'));
ok(power.power>without.power,'Might must affect derived Power');
close(power.attack,without.attack,'Might must not masquerade as legacy Attack');
const vitality=effectiveStats(withGem('stat_vitality'));
ok(vitality.hp>without.hp,'Vitality must increase effective Max HP');
const iron=effectiveStats(withGem('stat_iron'));
ok(iron.defense>without.defense&&iron.armor>without.armor,'Iron must increase effective Armor and Defense');
const savage=effectiveStats(withGem('stat_savage'));
close(savage.critMultiplier,1.5+.5*.025,'Savage applies to the actual base critical-damage bonus');

const unequippedWard=withGem('stat_ward');
const noSocketedGear={...unequippedWard,character:{...unequippedWard.character,equipment:{}}};
close(effectiveStats(noSocketedGear).ward,0,
 'Unequipping a socketed item must remove its Ward bonus from Character and combat stats');
close(equipmentSetCombatModifiers(noSocketedGear).stats.ward,0,
 'Unequipped Ward gem cannot mitigate combat damage');
const emptyCanonical=equippedCanonicalStatGemBonusesV1(base);
ok(Object.keys(emptyCanonical.statPercent).length===0&&Object.keys(emptyCanonical.statPercentagePoints).length===0,
  'Unsocketed canonical gems cannot grant bonuses');
const oldGem={...base,character:{...base.character!,gearEnhancements:{
 basic_sword:{rank:0,failures:0,gemIds:['WARD_SHARD'],statGemId:'WARD_SHARD'},
}}};
ok(effectiveStats(oldGem).defense>without.defense,'Older Defense Gems retain their existing effect');
ok(Object.keys(equippedCanonicalStatGemBonusesV1(oldGem).statPercent).length===0,
 'Older gems must not enter canonical totals');
close(equippedGemBonuses(withGem('stat_iron')).defense,0,'Canonical Iron must not be counted twice as legacy Defense');

// A named legacy Stat Gem occupies the slot even if an old saved gemIds
// array erroneously contains a second canonical Stat Gem.
const legacySlotPrecedence={...base,character:{...base.character!,gearEnhancements:{
 basic_sword:{rank:0,failures:0,statGemId:'WARD_SHARD',
  gemIds:['WARD_SHARD','gem:stat_precision:g5']},
}}};
ok(!equippedCanonicalGemIdsV1(legacySlotPrecedence).includes('gem:stat_precision:g5'),
 'Stale gemIds must never fabricate a second Stat Gem in a legacy named socket');
close(effectiveStats(legacySlotPrecedence).accuracy,without.accuracy,
 'Named legacy socket must not create phantom canonical Accuracy');
const activeSet=EQUIPMENT_SETS.find(row=>row.id==='T1_001')!;
ok(activeSet&&activeSet.itemIds.length>=4,'Expected the 10-piece Oathbound set');
const equipment={...base.character!.equipment};
for(const itemId of activeSet.itemIds.slice(0,4)){
 const slot=itemDef(itemId).slot;
 if(!slot)throw new Error('Set item without slot');
 equipment[slot]=itemId;
}
const first=activeSet.itemIds[0];
const setState={...base,character:{...base.character!,equipment}};
const setWithGem={...setState,character:{...setState.character,gearEnhancements:{
 [first]:{rank:0,failures:0,statGemId:'gem:stat_iron:g5',gemIds:['gem:stat_iron:g5']},
}}};
const setOnly=activeEquipmentBuildStats(setState);
const stacked=activeEquipmentBuildStats(setWithGem);
close(stacked.armor,(1+setOnly.armor)*(1+.0125)-1,
 'Iron and active 4-piece Armor set multiplier must stack exactly');
ok(effectiveStats(setWithGem).defense>effectiveStats(setState).defense,
 'Set+gem stacking must affect total effective Defense');

const ward=withGem('stat_ward'),piercing=withGem('stat_piercing'),swift=withGem('stat_swift'),potent=withGem('stat_potent');
close(equipmentSetCombatModifiers(ward).stats.ward,.0125,'Ward must feed incoming-damage mitigation');
close(equipmentSetCombatModifiers(piercing).penetrationMultiplier,1.0075,'Piercing must feed combat penetration');
close(equipmentSetCombatModifiers(swift).speedMultiplier,1.008,'Swift must feed action-speed modifier');
close(equipmentSetCombatModifiers(potent).recoveryMultiplier,1.012,'Potent must feed recovery modifier');

// The boss timer already uses effectiveStats.haste; actionSpeedMultiplier
// must not apply the same Swift/4-piece Haste bonus again.
const intervalBefore=previewFallenKnightBattle(base,1234).player.attackIntervalMs;
const intervalSwift=previewFallenKnightBattle(swift,1234).player.attackIntervalMs;
ok(intervalSwift<intervalBefore,'Swift should shorten the Fallen Knight basic-attack interval');
ok(Math.abs(intervalSwift-Math.round(intervalBefore*1.05/1.058))<=2,
 'Fallen Knight must apply Swift Haste once, not twice');

// Socketed gems on uniquely forged copies must affect live stats, collection,
// Resonance, socket limits, and projected changes; legacy itemId records must
// not override them.
const forgedIds=activeSet.itemIds.slice(0,4);
const crafted:CraftedGearInstance[]=forgedIds.map((id,index)=>({
 id:'STAT_GEM_FORGED_'+index,itemId:id,ownerCharacterId:base.character!.id,
 rarity:'rare',quality:80,acquireSource:'craft',sourceReceiptKey:'STAT_GEM_FORGED_'+index,createdAtMs:0,
 enhancement:{
   rank:0,failures:0,
   statGemId:index===0?'gem:stat_precision:g4':undefined,
   effectGemId:'gem:effect_bulwark:g1',
   gemIds:[...(index===0?['gem:stat_precision:g4']:[]),'gem:effect_bulwark:g1'],
 },
}));
const forgedEquipment={...base.character!.equipment};
const instanceSlots:Partial<Record<GearSlot,string>>={};
for(let i=0;i<3;i++){
 const slot=itemDef(forgedIds[i]).slot!;
 forgedEquipment[slot]=forgedIds[i];
 instanceSlots[slot]=crafted[i].id;
}
const forgedState={...base,character:{...base.character!,equipment:forgedEquipment,
 equipmentInstanceIds:instanceSlots,gearEnhancements:{
 [forgedIds[0]]:{rank:0,failures:0,effectGemId:'gem:effect_renewal:g5',gemIds:['gem:effect_renewal:g5']},
 }},account:{...base.account,craftedGearInstances:crafted}};
close(effectiveStats(forgedState).accuracy-effectiveStats({
 ...forgedState,character:{...forgedState.character,gearEnhancements:{},
 equipmentInstanceIds:{...instanceSlots,[itemDef(forgedIds[0]).slot!]:'NOT_EQUIPPED'}},
}).accuracy,.0065,'Canonical Stat Gem on a forged equipment copy must affect Accuracy');
ok(equippedCanonicalGemIdsV1(forgedState).includes('gem:stat_precision:g4'),
 'Canonical gem discovery must read forged Stat Gem sockets');
ok(resonanceForFamilyV1(forgedState,'effect_bulwark').resonance===3,
 'Three forged Effect Gems must reach Resonance III');
ok(resonanceForFamilyV1(forgedState,'effect_renewal').copies===0,
 'Stale legacy gem sockets cannot override forged copies');
ok(effectFamilyCopiesV1(forgedState,'effect_bulwark',forgedIds[0])===2,
 'Replacing one forged Effect Gem excludes only its active equipment slot');
let capRejected=false;
try{assertEffectGemEquipAllowedV1(forgedState,forgedIds[3],'gem:effect_bulwark:g1')}catch{capRejected=true}
ok(capRejected,'Fourth matching Effect Gem must be rejected when first three are on Forge instances');
const rating=combatPowerRating(ward);
ok(rating.rows.reduce((total,row)=>total+row.value,0)===rating.total,
 'Combat Power source rows must reconcile exactly including Ward gems');
ok(rating.total>combatPowerRating(base).total,
 'Active canonical Ward Gem must contribute to Combat Power');
const ratingSet=combatPowerRating(setWithGem);
ok(ratingSet.rows.reduce((total,row)=>total+row.value,0)===ratingSet.total,
 'Combat Power must reconcile after set bonuses and canonical gems');

console.log('PASS canonical twelve-stat gem catalog parity, legacy separation, Character totals, combat modifiers and rating breakdown');
