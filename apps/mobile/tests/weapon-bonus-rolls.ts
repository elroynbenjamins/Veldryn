import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame} from '../src/core/game';
import {activeEquipmentBuildStats,equippedWeaponBonusStats} from '../src/core/equipment-set-runtime';
import {draftCraftedGearInstance,normalizeCraftedGearInstances,TARGET_CRAFTED_GEAR_COPIES_PER_ITEM} from '../src/core/crafted-gear-instances';
import {planCraftedGearRetention} from '../src/core/crafted-gear-retention';
import {normalizeWeaponBonuses,rollWeaponBonuses,weaponBonusConfig,weaponBonusLine} from '../src/core/weapon-bonus-rolls';
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

const t1=weapon('T1','WAYFINDER'),t2=weapon('T2','WAYFINDER');
const t3=weapon('T3','WAYFINDER'),t4=weapon('T4','WAYFINDER'),t5=weapon('T5','WAYFINDER'),t9=weapon('T9','WAYFINDER');
ok(!rollWeaponBonuses(t1,'mythic','t1-epic',.25),'T1 never rolls, even Mythic');
ok(!rollWeaponBonuses(t2,'epic','t2-epic',.25),'T2 never rolls, even Epic');
ok(weaponBonusConfig(t3,'common')?.count===1,'T3 Common gets one stat');
ok(weaponBonusConfig(t3,'epic')?.count===2,'T3 Epic gets two stats');
ok(weaponBonusConfig(t4,'legendary')?.count===2,'T4 Legendary gets two stats');
ok(weaponBonusConfig(t5,'common')?.count===2,'T5 Common gets two stats');
ok(weaponBonusConfig(t9,'common')?.count===2,'T9 Common gets two stats');

for(const [id,rarity,count,min,max] of [
  [t3,'common',1,100,300],[t3,'epic',2,100,300],
  [t4,'mythic',2,100,300],[t5,'common',2,200,400],[t9,'rare',2,400,600],
] as const){
  const first=rollWeaponBonuses(id,rarity,'stable-receipt',.4);
  const again=rollWeaponBonuses(id,rarity,'stable-receipt',.4);
  ok(first?.length===count,'Wrong weapon roll count');
  ok(JSON.stringify(first)===JSON.stringify(again),'The same receipt must never reroll');
  ok(new Set(first!.map(row=>row.stat)).size===count,'Weapon stats must be distinct');
  ok(first!.every(row=>row.basisPoints>=min&&row.basisPoints<=max&&(row.basisPoints-min)%10===0),
    'Roll value must be inside tier range in 0.1% steps');
  ok(first!.every(row=>weaponBonusLine(id,rarity,row).includes('roll)')),'Tooltip should show the range and roll strength');
  ok(JSON.stringify(normalizeWeaponBonuses(id,rarity,first))===JSON.stringify(first),'Valid rolls must survive normalization');
}

for(const classId of ['WAYFINDER','DREADGUARD','DAWNKEEPER'] as const){
  const id=weapon('T5',classId),cfg=weaponBonusConfig(id,'common')!;
  const bonuses=rollWeaponBonuses(id,'common','class-pool',.5)!;
  ok(bonuses.every(row=>cfg.pool.includes(row.stat)),'Bonus must be valid for its class role');
}
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
