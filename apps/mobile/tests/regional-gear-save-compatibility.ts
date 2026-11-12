import {createCharacter,newGame,equipItem,effectiveStats} from '../src/core/game';
import {characterTotalXpAtLevel} from '../src/core/progression';
import {combatPowerRating} from '../src/core/combat-power';
import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {MAX_RELEASED_EQUIPMENT_TIER,isReleasedEquipmentTier} from '../src/content/equipment-release';
import type {ClassId,GameState} from '../src/core/types';

function assert(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
const classes:readonly ClassId[]=['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER'];
for(const cls of classes){
 for(const [tier,priorLevel] of [['T3',22],['T4',32],['T5',44]] as const){
  const item=EQUIPMENT_ITEMS_V33.find(x=>x.id.startsWith(tier+'P_')&&x.classRestriction===cls&&x.slot==='weapon');
  assert(item,tier+' weapon exists for '+cls);
  const required={T3:26,T4:38,T5:51}[tier];
  assert(item.requiredLevel===required,tier+' uses the new character-level floor');
  const original=createCharacter(newGame(0),cls,'Legacy Gear');
  original.character!.level=priorLevel;
  original.character!.xp=characterTotalXpAtLevel(priorLevel);
  // Existing saves already had these item IDs equipped. Updating minimum
  // levels must not delete, downgrade or zero their recognized item stats.
  const oldSave=structuredClone(original) as GameState;
  oldSave.character!.equipment.weapon=item.id;
  const oldStats=effectiveStats(oldSave),oldPower=combatPowerRating(oldSave);
  assert(oldSave.character!.equipment.weapon===item.id,tier+' existing weapon retained');
  assert(oldStats.attack>effectiveStats(original).attack,tier+' legacy weapon has real combat stats');
  assert(oldPower.total>combatPowerRating(original).total,tier+' legacy weapon counts for CP');
  const bag={...original,inventory:{...original.inventory,stacks:[{itemId:item.id,quantity:1}]}};
  let blocked=false;
  try{equipItem(bag,item.id);}catch(e){blocked=String(e).includes('Requires character level '+required);}
  assert(blocked,'new '+tier+' equip must require level '+required);
  bag.character!.level=required;
  bag.character!.xp=characterTotalXpAtLevel(required);
  const equipped=equipItem(bag,item.id);
  assert(equipped.character!.equipment.weapon===item.id,'eligible '+tier+' equipment equips normally');
 }
}
assert(MAX_RELEASED_EQUIPMENT_TIER===5&&!isReleasedEquipmentTier('T6'),'T6 remains unreleased');
console.log('PASS 9 classes: existing T3-T5 gear retained, new equip floors enforced, and T6 locked');
