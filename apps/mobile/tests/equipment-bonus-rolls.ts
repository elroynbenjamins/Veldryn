import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {CLASSES} from '../src/content/classes';
import {itemDef} from '../src/content/items';
import {createCharacter,newGame} from '../src/core/game';
import {activeEquipmentBuildStats,equippedEquipmentBonusStats} from '../src/core/equipment-set-runtime';
import {moveCraftedGearInstance,equipCraftedGearInstance,unequipCraftedGearInstance} from '../src/core/crafted-gear-ownership';
import {planCraftedGearRetention} from '../src/core/crafted-gear-retention';
import {TARGET_CRAFTED_GEAR_COPIES_PER_ITEM} from '../src/core/crafted-gear-instances';
import {draftCraftedGearInstance,normalizeCraftedGearInstances} from '../src/core/crafted-gear-instances';
import {equipmentBonusConfig,equipmentBonusLine,equipmentBonusRange,normalizeEquipmentBonuses,rollEquipmentBonuses,EQUIPMENT_BONUS_ROLL_VERSION} from '../src/core/equipment-bonus-rolls';
import type {CraftedGearInstance,GameState,GearSlot} from '../src/core/types';

function ok(value:unknown,label:string){if(!value)throw new Error(label);}
function close(a:number,b:number,label:string){ok(Math.abs(a-b)<1e-8,`${label}: expected ${b}, got ${a}`);}
const tiers=['T1','T2','T3','T4','T5'] as const;
const slots:readonly GearSlot[]=['helmet','chest','gloves','legs','boots','offhand','cape','amulet','ring'];
function item(tier:string,classId:string,slot:GearSlot){
  const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier===tier&&row.classId===classId
    &&itemDef(row.output.itemId).slot===slot);
  ok(recipe,`Missing ${tier} ${classId} ${slot} recipe`);
  return recipe!.output.itemId;
}

// Every class and every armor/accessory slot has meaningful but limited T2–T5 rolls.
for(const tier of tiers){
  for(const cls of CLASSES){
    for(const slot of slots){
      const itemId=item(tier,cls.id,slot);
      for(const rarity of ['common','epic','mythic'] as const){
        const cfg=equipmentBonusConfig(itemId,rarity);
        if(tier==='T1'){
          ok(!cfg&&!rollEquipmentBonuses(itemId,rarity,'t1-test',.21),'T1 gear must stay simple');
          continue;
        }
        ok(cfg,`Missing ${tier}/${cls.id}/${slot} roll configuration`);
        const count=tier==='T5'||(tier!=='T2'&&rarity!=='common')?2:1;
        ok(cfg!.count===count,`${tier} ${rarity} requires ${count} stat rolls`);
        const key=`equipment:${tier}:${cls.id}:${slot}:${rarity}`;
        const rolls=rollEquipmentBonuses(itemId,rarity,key,.43210)!;
        const same=rollEquipmentBonuses(itemId,rarity,key,.43210)!;
        ok(JSON.stringify(rolls)===JSON.stringify(same),'A Forge receipt must never reroll');
        ok(rolls.length===count&&new Set(rolls.map(roll=>roll.stat)).size===count,
          'No missing or duplicate rolled stats');
        ok(rolls.every(roll=>cfg!.pool.includes(roll.stat)),'Rolled stats must belong to the class role');
        ok(rolls.every(roll=>{
          const range=equipmentBonusRange(cfg!.tier,roll.stat,cfg!.slot,rarity);
          return !!range&&roll.basisPoints>=range[0]&&roll.basisPoints<=range[1]
            &&(roll.basisPoints-range[0])%10===0
            &&equipmentBonusLine(itemId,rarity,roll).includes('/100 roll');
        }),'Each roll must honor its stat-specific tier and slot range');
        ok(JSON.stringify(normalizeEquipmentBonuses(itemId,rarity,rolls,EQUIPMENT_BONUS_ROLL_VERSION))===JSON.stringify(rolls),
          'Receipt must survive validation without modification');
      }
    }
  }
}

const t2=item('T2','WAYFINDER','gloves'),t5=item('T5','WAYFINDER','gloves');
ok(equipmentBonusConfig(t2,'mythic')?.count===1,'T2 Mythic stays one bonus');
ok(equipmentBonusRange(5,'critRate','amulet','mythic')![1]>
   equipmentBonusRange(5,'critRate','amulet','common')![1],
  'Mythic amulets have higher Critical Rate bounds than Common amulets');
ok(equipmentBonusRange(5,'critDamage','gloves','uncommon')![1]>
   equipmentBonusRange(5,'critDamage','gloves','common')![1],
  'Critical Damage armor ranges also use rarity multipliers');
ok(equipmentBonusRange(2,'healingPower','gloves','mythic')![1]<
   equipmentBonusRange(5,'healingPower','gloves','common')![1],
  'T2 Mythic support rolls must stay below T5 Common tier ceiling');

ok(equipmentBonusConfig(t5,'common')?.count===2,'T5 Common has two bonuses');
ok(!equipmentBonusConfig(t5,'common')?.pool.includes('abilityDamage'),
  'The early-release armor pool excludes the combat-incomplete Ability Damage affix');
ok(equipmentBonusConfig(t5,'common',2)?.pool.includes('abilityDamage'),
  'Prior v2 nonweapon development receipts retain their original pool');
ok(!equipmentBonusRange(5,'abilityDamage','gloves','uncommon',3),
  'New v3 nonweapon receipts cannot mint Ability Damage');
ok(equipmentBonusRange(5,'abilityDamage','gloves','uncommon',2)!==undefined,
  'Old v2 nonweapon receipts retain their original stat-specific range');
ok(equipmentBonusRange(2,'critRate','gloves')![1]<equipmentBonusRange(5,'critRate','gloves')![1],
  'Early T2 must have lower caps than T5');
ok(!normalizeEquipmentBonuses(t2,'common',[{stat:'critRate',basisPoints:9000}],2),
  'Out-of-range values must fail closed');
ok(!normalizeEquipmentBonuses(t2,'common',[{stat:'critRate',basisPoints:40}],999),
  'Unknown roll versions cannot grant stats');
ok(!normalizeEquipmentBonuses(t2,'common',null,2),'Legacy T2 gear has no invented roll');
ok(!normalizeEquipmentBonuses(t5,'common',[{stat:'haste',basisPoints:50},{stat:'haste',basisPoints:50}],2),
  'Duplicate stat types must fail closed');

const initial=createCharacter(newGame(1),'WAYFINDER','Roll Tester','male');
const crafted=draftCraftedGearInstance({itemId:t2,ownerCharacterId:initial.character!.id,jobId:'t2-gloves-receipt',createdAtMs:1,roll:.3});
ok(crafted.equipmentBonuses?.length===1&&crafted.equipmentBonusRollVersion===3,
  'A fresh T2 forged glove must gain a persistent single bonus');
const loaded=normalizeCraftedGearInstances([crafted])[0];
ok(!crafted.equipmentBonuses?.some(b=>b.stat==='abilityDamage'),
  'Fresh nonweapon rolls must never include the deferred Ability Damage attribute');
const previousV1={...crafted,equipmentBonusRollVersion:1 as const,
  equipmentBonuses:[{stat:'evasion' as const,basisPoints:30}]};
const preservedV1=normalizeCraftedGearInstances([previousV1])[0];
ok(preservedV1.equipmentBonusRollVersion===1&&preservedV1.equipmentBonuses?.[0]?.basisPoints===30,
  'Older v1 T2 armor bonuses must remain readable on the old 0.1% table');

ok(JSON.stringify(loaded.equipmentBonuses)===JSON.stringify(crafted.equipmentBonuses),
  'Save/load must retain the exact T2 stat and value');

function withEquipped(copy:CraftedGearInstance,instanceId=copy.id):GameState{
  return {...initial,account:{...initial.account,craftedGearInstances:[copy]},
    character:{...initial.character!,equipment:{...initial.character!.equipment,gloves:copy.itemId},
      equipmentInstanceIds:{gloves:instanceId}}};
}
const active=withEquipped(loaded),stats=equippedEquipmentBonusStats(active);
for(const roll of loaded.equipmentBonuses!)close(stats[roll.stat]??0,roll.basisPoints/10_000,
  'Equipped exact copy must apply its roll');
ok(Object.keys(equippedEquipmentBonusStats(withEquipped(loaded,'missing-receipt'))).length===0,
  'An unknown equipped receipt cannot borrow a stored roll');
ok(Object.keys(equippedEquipmentBonusStats({...active,character:{...active.character!,equipmentInstanceIds:{}}})).length===0,
  'Legacy item-ID-only equipment cannot borrow another physical copy');
const legacy={...loaded,equipmentBonuses:undefined,equipmentBonusRollVersion:undefined};
ok(Object.keys(equippedEquipmentBonusStats(withEquipped(legacy))).length===0,
  'Existing equipment with no rolls stays unchanged');

const high=draftCraftedGearInstance({itemId:t5,ownerCharacterId:initial.character!.id,jobId:'t5-gloves-receipt',createdAtMs:2,roll:.4});
ok(high.equipmentBonuses?.length===2,'New T5 gloves should have two random stat rolls');
const preDeferV2={
  ...high,id:'v2-ability-development-receipt',equipmentBonusRollVersion:2 as const,
  equipmentBonuses:[
    {stat:'abilityDamage' as const,basisPoints:equipmentBonusRange(5,'abilityDamage','gloves',high.rarity,2)![0]},
    {stat:'critRate' as const,basisPoints:equipmentBonusRange(5,'critRate','gloves',high.rarity,2)![0]},
  ],
};
const preservedV2=normalizeCraftedGearInstances([preDeferV2])[0];
ok(preservedV2.equipmentBonusRollVersion===2&&preservedV2.equipmentBonuses?.[0]?.stat==='abilityDamage',
  'Existing version 2 nonweapon development receipts must remain readable');
ok(!normalizeEquipmentBonuses(t5,high.rarity,preDeferV2.equipmentBonuses,3),
  'Old Ability Damage values cannot be minted as new nonweapon v3 receipts');
const noRoll={...high,equipmentBonuses:undefined,equipmentBonusRollVersion:undefined};
const clean=withEquipped(noRoll),rolled=withEquipped(high);
const cleanStats=activeEquipmentBuildStats(clean),rolledStats=activeEquipmentBuildStats(rolled);
for(const roll of high.equipmentBonuses!){
  close(rolledStats[roll.stat]-cleanStats[roll.stat],roll.basisPoints/10_000,
    'Every non-weapon roll must impact the canonical combat stat exactly once');
}
ok(!cleanStats.haste&&!cleanStats.critRate&&!cleanStats.evasion,
  'Removed fixed T5 glove affix must not activate for an unrolled legacy copy');

const tampered={...high,equipmentBonuses:[{stat:'critRate' as const,basisPoints:9999},{stat:'haste' as const,basisPoints:9999}]};
ok(Object.keys(equippedEquipmentBonusStats(withEquipped(tampered))).length===0,
  'Invalid stored bonuses must not grant combat stats');
// Cross-character Bank transfers keep the original Forge receipt and its bonuses.
const recipient:GameState={...active,
  character:{...active.character!,id:'SECOND_CHARACTER_ON_ACCOUNT',level:999,
    equipment:{...initial.character!.equipment},equipmentInstanceIds:{},equipmentPouch:{capacity:30,stacks:[]}},
  bank:{...active.bank,stacks:[{itemId:t2,quantity:1,instanceId:loaded.id}]},
};
const fromBank=moveCraftedGearInstance(recipient,loaded.id,'equipment_pouch');
const equipped=equipCraftedGearInstance(fromBank,loaded.id);
ok(equipped.character?.equipmentInstanceIds?.gloves===loaded.id,
  'Bank transfer must equip the exact T2 glove receipt');
for(const roll of loaded.equipmentBonuses!)
  close(equippedEquipmentBonusStats(equipped)[roll.stat]??0,roll.basisPoints/10_000,
    'Transferred T2 gear retains its original stat roll');
const unequipped=unequipCraftedGearInstance(equipped,loaded.id);
ok(Object.keys(equippedEquipmentBonusStats(unequipped)).length===0,
  'Unequipping rolled armor must immediately remove its bonus');
const restored=normalizeCraftedGearInstances(JSON.parse(JSON.stringify(unequipped.account.craftedGearInstances)))[0];
ok(JSON.stringify(restored.equipmentBonuses)===JSON.stringify(loaded.equipmentBonuses),
  'Bank and pouch movement must preserve rolls through a save round-trip');

// The Keep Best policy cannot silently sell a better-playstyle rolled armor copy.
const existing=Array.from({length:TARGET_CRAFTED_GEAR_COPIES_PER_ITEM},(_,index)=>({
  instance:{...high,id:`saved-rolled-gloves-${index}`,sourceReceiptKey:`saved-roll-${index}`},
  location:'inventory' as const,holderCharacterId:initial.character!.id,
  ownershipVerified:true,protectionsVerified:true,locked:false,favorite:false,savedLoadout:false,
}));
const keepBest=planCraftedGearRetention(existing,{...high,id:'incoming-rolled-gloves'},'keep_best_seven');
ok(keepBest.action==='manual_review','Rolled non-weapon bonuses must require manual choice at the copy cap');
console.log('PASS: T2–T5 role-based equipment rolls, transfers, retention and exact-copy combat safety');
