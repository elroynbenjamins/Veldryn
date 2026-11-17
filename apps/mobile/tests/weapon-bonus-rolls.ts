import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {CLASSES} from '../src/content/classes';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame} from '../src/core/game';
import {activeEquipmentBuildStats,equippedWeaponBonusStats} from '../src/core/equipment-set-runtime';
import {draftCraftedGearInstance,normalizeCraftedGearInstances,TARGET_CRAFTED_GEAR_COPIES_PER_ITEM} from '../src/core/crafted-gear-instances';
import {planCraftedGearRetention} from '../src/core/crafted-gear-retention';
import {normalizeWeaponBonuses,rollWeaponBonuses,weaponBonusConfig,weaponBonusLine,weaponBonusRange,WEAPON_BONUS_BPS_BY_BAND,WEAPON_BONUS_ROLL_VERSION,weaponBonusCompactLine,weaponBonusRollGrade} from '../src/core/weapon-bonus-rolls';
import type {ItemRarity} from '../src/core/item-rarity';
import type {CraftedGearInstance,GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
function close(a:number,b:number,label:string){ok(Math.abs(a-b)<1e-8,`${label}: expected ${b}, got ${a}`);}
function weapon(tier:string,classId:'WAYFINDER'|'DREADGUARD'|'DAWNKEEPER'){
  const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier===tier
    &&row.classId===classId&&itemDef(row.output.itemId).slot==='weapon');
  if(!recipe)throw new Error(`Missing ${tier} weapon for ${classId}`);
  return recipe.output.itemId;
}

// Every class and every eligible tier must have a valid roll pool and two-roll rule.
for(const tier of ['T3','T4','T5','T6','T7','T8','T9'] as const){
  for(const cls of CLASSES){
    const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier===tier
      &&row.classId===cls.id&&itemDef(row.output.itemId).slot==='weapon');
    ok(recipe,`Missing ${tier} ${cls.name} weapon recipe`);
    for(const rarity of ['common','epic'] as const){
      const itemId=recipe!.output.itemId,cfg=weaponBonusConfig(itemId,rarity)!;
      const rolls=rollWeaponBonuses(itemId,rarity,`all-classes-${tier}-${cls.id}-${rarity}`,.54321)!;
      const expectedCount=tier>='T5'||rarity==='epic'?2:1;
      ok(rolls.length===expectedCount,`${cls.name} ${tier} ${rarity}: expected ${expectedCount} rolls`);
      ok(rolls.every(row=>cfg.pool.includes(row.stat)),`${cls.name} ${tier} must use role-relevant stats`);
      ok(JSON.stringify(normalizeWeaponBonuses(itemId,rarity,rolls))===JSON.stringify(rolls),
        `${cls.name} ${tier} ${rarity} rolls must survive normalization`);
    }
  }
}

const t1=weapon('T1','WAYFINDER'),t2=weapon('T2','WAYFINDER');
const t3=weapon('T3','WAYFINDER'),t4=weapon('T4','WAYFINDER'),t5=weapon('T5','WAYFINDER'),t9=weapon('T9','WAYFINDER');
ok(!rollWeaponBonuses(t1,'mythic','t1-epic',.25),'T1 never rolls, even Mythic');
ok(!rollWeaponBonuses(t2,'epic','t2-epic',.25),'T2 never rolls, even Epic');
ok(weaponBonusConfig(t3,'common')?.count===1,'T3 Common gets one stat');
ok(weaponBonusConfig(t3,'epic')?.count===2,'T3 Epic gets two stats');
ok(weaponBonusConfig(t4,'legendary')?.count===2,'T4 Legendary gets two stats');
ok(weaponBonusConfig(t5,'common')?.count===2,'T5 Common gets two stats');
ok(weaponBonusConfig(t9,'common')?.count===2,'T9 Common gets two stats');

for(const [id,rarity,count] of [
  [t3,'common',1],[t3,'epic',2],
  [t4,'mythic',2],[t5,'common',2],[t9,'rare',2],
] as const){
  const first=rollWeaponBonuses(id,rarity,'stable-receipt',.4);
  const again=rollWeaponBonuses(id,rarity,'stable-receipt',.4);
  ok(first?.length===count,'Wrong weapon roll count');
  ok(JSON.stringify(first)===JSON.stringify(again),'The same receipt must never reroll');
  ok(new Set(first!.map(row=>row.stat)).size===count,'Weapon stats must be distinct');
  const tier=weaponBonusConfig(id,rarity)!.tier;
  ok(first!.every(row=>{
    const range=weaponBonusRange(tier,row.stat);
    return !!range&&row.basisPoints>=range[0]&&row.basisPoints<=range[1]&&(row.basisPoints-range[0])%10===0;
  }), 'Each rolled stat must use its own tier range in 0.1% steps');
  ok(first!.every(row=>weaponBonusLine(id,rarity,row).includes('/100 roll')),'Tooltip should show the range and roll strength');
  ok(JSON.stringify(normalizeWeaponBonuses(id,rarity,first))===JSON.stringify(first),'Valid rolls must survive normalization');
}

// Stat-specific balancing: high-value Crit Rate and Ward cap below broad HP / Tenacity.
ok(weaponBonusRange(3,'critRate')?.join(',')==='50,150','T3 Crit Rate is 0.5–1.5%, not the old global range');
ok(weaponBonusRange(3,'maxHp')?.join(',')==='200,400','T3 Max HP is 2.0–4.0%');
ok(weaponBonusRange(5,'haste')?.join(',')==='120,250','T5 Haste is 1.2–2.5%');
ok(weaponBonusRange(7,'potency')?.join(',')==='300,550','T7 Potency is 3.0–5.5%');
ok(weaponBonusRange(9,'critRate')?.join(',')==='150,300','T9 Crit Rate is capped at 3.0%');
ok(weaponBonusRange(9,'maxHp')?.join(',')==='500,800','T9 Max HP reaches 8.0%');
ok(weaponBonusLine(t3,'common',{stat:'critRate',basisPoints:100}).includes('Range 0.5–1.5%'),
  'Tooltip displays the Crit Rate-specific tier range');
ok(weaponBonusLine(t5,'common',{stat:'haste',basisPoints:200}).includes('Range 1.2–2.5%'),
  'Tooltip displays the Haste-specific tier range');
ok(!normalizeWeaponBonuses(t3,'common',[{stat:'critRate',basisPoints:200}]),
  'The former T3 2.0% Crit Rate value must be rejected under the new cap');
ok(!!normalizeWeaponBonuses(t3,'common',[{stat:'haste',basisPoints:200}]),
  'T3 Haste can reach its valid 2.0% cap');
for(const band of [3,5,7,9] as const){
  for(const [stat,range] of Object.entries(WEAPON_BONUS_BPS_BY_BAND[band])){
    ok(range.length===2&&range[0]<range[1]&&range.every(value=>Number.isInteger(value)&&value%10===0),
      `The ${stat} tier ${band} range must contain valid tenth-percent endpoints`);
    if(band>3){
      const previous=WEAPON_BONUS_BPS_BY_BAND[band===5?3:band===7?5:7][stat as keyof typeof WEAPON_BONUS_BPS_BY_BAND[3]];
      ok(range[0]>=previous[0]&&range[1]>=previous[1],
        `The ${stat} tier ${band} range must not decrease from the previous tier`);
    }
  }
}

for(const classId of ['WAYFINDER','DREADGUARD','DAWNKEEPER'] as const){
  const id=weapon('T5',classId),cfg=weaponBonusConfig(id,'common')!;
  const bonuses=rollWeaponBonuses(id,'common','class-pool',.5)!;
  ok(bonuses.every(row=>cfg.pool.includes(row.stat)),'Bonus must be valid for its class role');
}
ok(WEAPON_BONUS_ROLL_VERSION===2,'Current weapon rolls must use the versioned stat-specific balance table');
ok(weaponBonusRange(3,'critRate',1)?.join(',')==='100,300','Older v1 receipts keep their original T3 1–3% range');
ok(!!normalizeWeaponBonuses(t3,'common',[{stat:'critRate',basisPoints:250}],1),
  'Already minted v1 high Crit Rate rolls must be preserved after rebalance');
ok(!normalizeWeaponBonuses(t3,'common',[{stat:'critRate',basisPoints:250}],2),
  'New version 2 rolls must respect the tightened Crit Rate cap');
ok(weaponBonusLine(t3,'common',{stat:'critRate',basisPoints:250},1).includes('Range 1.0–3.0%'),
  'Old weapon tooltips must retain their original mint-time range');
ok(weaponBonusCompactLine({stat:'critRate',basisPoints:150})==='+1.5% Crit Rate',
  'Compact labels must never confuse the raw bonus with roll strength');
ok(weaponBonusRollGrade(100)==='Perfect'&&weaponBonusRollGrade(95)==='Excellent'
  &&weaponBonusRollGrade(80)==='Strong'&&weaponBonusRollGrade(35)==='Standard',
  'Roll quality labels must use distinct relative grades');
ok(new Set([.1,.2,.3,.4,.5,.6,.7,.8].map(roll=>JSON.stringify(rollWeaponBonuses(t3,'common','stable-receipt',roll)))).size>1,
  'The trusted claim roll must influence weapon attributes');
ok(!normalizeWeaponBonuses(t3,'common',[{stat:'critRate',basisPoints:500}]),'Out of range values must never grant stats');
ok(!normalizeWeaponBonuses(t3,'common',[{stat:'potency',basisPoints:200}]),'Damage weapons cannot roll Support-only stats');
ok(!normalizeWeaponBonuses(t3,'epic',[{stat:'haste',basisPoints:200},{stat:'haste',basisPoints:200}]),'Repeated bonuses are not legal');
ok(!normalizeWeaponBonuses(t5,'common',[{stat:'haste',basisPoints:200}]),'Missing second roll must be rejected');
ok(!normalizeWeaponBonuses(t5,'common',null),'Legacy missing rolls remain missing');

const state=createCharacter(newGame(1),'WAYFINDER','Weapon Bonus Tester','male');
const owner=state.character!.id;
const copy=draftCraftedGearInstance({itemId:t5,ownerCharacterId:owner,jobId:'weapon-affix-test',createdAtMs:1,roll:.5});
ok(copy.weaponBonuses?.length===2,'New T5 forged copy must receive two attributes');
const normalized=normalizeCraftedGearInstances([copy])[0];
ok(JSON.stringify(normalized.weaponBonuses)===JSON.stringify(copy.weaponBonuses),'Saved attributes must survive round-trip');
ok(normalized.weaponBonusRollVersion===2,'New copies retain their stat-range balance version');
const preRebalanceCopy={
  ...copy,id:'v1-legacy-draft',weaponBonusRollVersion:1 as const,
  weaponBonuses:[{stat:'critRate' as const,basisPoints:250},{stat:'haste' as const,basisPoints:290}],
};
const keptV1=normalizeCraftedGearInstances([preRebalanceCopy])[0];
ok(keptV1.weaponBonusRollVersion===1&&keptV1.weaponBonuses?.[0].basisPoints===250,
  'Stat-specific retuning must not silently remove earlier minted rolled weapons');
const unversionedV1=normalizeCraftedGearInstances([{...preRebalanceCopy,weaponBonusRollVersion:undefined}])[0];
ok(unversionedV1.weaponBonusRollVersion===1&&unversionedV1.weaponBonuses?.[0].basisPoints===250,
  'Older draft weapon rolls without an explicit version must use the prior table');
const unrolled:CraftedGearInstance={...copy,weaponBonuses:undefined};
ok(!normalizeCraftedGearInstances([unrolled])[0].weaponBonuses,'Old weapon remains unchanged and receives no fabricated attributes');
const withInstance=(record:CraftedGearInstance,selectedId=record.id):GameState=>({
  ...state,account:{...state.account,craftedGearInstances:[record]},
  character:{...state.character!,equipment:{...state.character!.equipment,weapon:t5},
    equipmentInstanceIds:{...state.character!.equipmentInstanceIds,weapon:selectedId}},
});
const without=withInstance(unrolled),withBonus=withInstance(normalized);
const oldStats=activeEquipmentBuildStats(without),newStats=activeEquipmentBuildStats(withBonus);
for(const roll of normalized.weaponBonuses!){
  close(newStats[roll.stat]-oldStats[roll.stat],roll.basisPoints/10000,
    'Only the equipped exact copy contributes its weapon bonus');
}
// A shared-bank transfer changes the holding character, not the original Forge receipt.
const transferred:GameState={
  ...withBonus,
  character:{...withBonus.character!,id:'SECOND_CHARACTER_ON_SAME_ACCOUNT',
    equipment:{...withBonus.character!.equipment,weapon:t5},
    equipmentInstanceIds:{...withBonus.character!.equipmentInstanceIds,weapon:normalized.id}},
};
const inheritedRolls=equippedWeaponBonusStats(transferred);
ok(normalized.ownerCharacterId!==transferred.character!.id,
  'Cross-character fixture retains original crafter identity');
for(const bonus of normalized.weaponBonuses!)
  close(inheritedRolls[bonus.stat]??0,bonus.basisPoints/10_000,
    'Shared-bank recipient must benefit from the exact equipped copy');
ok(Object.keys(equippedWeaponBonusStats(withInstance(normalized,'nonexistent-copy'))).length===0,
  'Wrong or missing equipped receipt must not grant another weapon bonus');
ok(Object.keys(equippedWeaponBonusStats({...withBonus,character:{...withBonus.character!,equipmentInstanceIds:{}}})).length===0,
  'An untagged legacy equipped weapon must not inherit a newer copy roll');
ok(normalizeCraftedGearInstances([{...copy,weaponBonuses:[{stat:'potency',basisPoints:9999}]}])[0].weaponBonuses===undefined,
  'Invalid persisted bonus values fail closed');

const atCopyCap=Array.from({length:TARGET_CRAFTED_GEAR_COPIES_PER_ITEM},(_,index)=>({
  instance:{...unrolled,id:`old-copy-${index}`,sourceReceiptKey:`old-receipt-${index}`},
  location:'inventory' as const,holderCharacterId:owner,ownershipVerified:true,protectionsVerified:true,
  locked:false,favorite:false,savedLoadout:false,
}));
const careful=planCraftedGearRetention(atCopyCap,normalized,'keep_best_seven');
ok(careful.action==='manual_review'&&careful.reason==='weapon_bonus_choice',
  'The auto-sell policy must never discard a rolled weapon based on quality alone');

console.log('PASS: T3+ weapon bonus rolls, two-stat eligibility, persistence, combat and legacy safety');
