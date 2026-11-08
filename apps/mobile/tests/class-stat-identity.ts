import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {classWeightedGearStats,CLASS_EQUIPMENT_ATTACK_SHARE} from '../src/core/class-stat-identity';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import {noviceItemId,noviceSetFor} from '../src/content/novice-sets';
import {enhancedGearStats} from '../src/core/equipment-enhancement';
import {equipmentComparison} from '../src/core/equipment-comparison';

const almost=(actual:number,expected:number,message:string)=>assert.ok(Math.abs(actual-expected)<1e-7,`${message}: ${actual} vs ${expected}`);

assert.equal(CLASSES.length,9);
for(const cls of CLASSES){
  const share=CLASS_EQUIPMENT_ATTACK_SHARE[cls.id];
  assert.ok(share>.3&&share<.7,cls.id+' must have a sane non-extreme identity');
  const split=classWeightedGearStats(cls.id,500,500);
  almost(split.attack,share*1000,cls.id+' must express identity with balanced equipment');
  almost(split.defense,(1-share)*1000,cls.id+' defense share');
  for(const [attack,defense] of [[0,0],[100,0],[0,100],[100,200],[200,100],[456.25,331.75]]){
    const adjusted=classWeightedGearStats(cls.id,attack,defense);
    almost(adjusted.attack+adjusted.defense,attack+defense,cls.id+' must preserve equipped stat budget');
    assert.ok(adjusted.attack>=0&&adjusted.defense>=0,cls.id+' never creates negative stats');
  }
  almost(classWeightedGearStats(cls.id,100,0).attack,100,cls.id+' pure offensive gear stays offensive');
  almost(classWeightedGearStats(cls.id,0,100).defense,100,cls.id+' pure defensive gear stays defensive');
  assert.ok(classWeightedGearStats(cls.id,200,100).attack>classWeightedGearStats(cls.id,100,200).attack,
    cls.id+' gear choices must remain meaningful');

  const state=createCharacter(newGame(0),cls.id,'Class Identity');
  const rawBefore=JSON.stringify(state);
  const bare={...state,character:{...state.character!,equipment:{}}};
  almost(effectiveStats(bare).attack,cls.attack,cls.id+' must retain saved base attack');
  almost(effectiveStats(bare).defense,cls.defense,cls.id+' must retain saved base defense');

  // The canonical equipment pipeline (including novice set bonus) must match
  // the class converter, not just a unit-test-only hypothetical stat budget.
  const novice=noviceSetFor(cls.id);
  const equipped={...state,character:{...state.character!,equipment:Object.fromEntries(
    novice.slots.map(slot=>[slot,noviceItemId(cls.id,slot)]))}};
  const raw=Object.values(equipped.character.equipment).reduce((acc,itemId)=>{
    if(itemId){const stats=enhancedGearStats(equipped,itemId);acc.attack+=stats.attack;acc.defense+=stats.defense;}
    return acc;
  },{attack:novice.setBonus.attack,defense:novice.setBonus.defense});
  const gear=classWeightedGearStats(cls.id,raw.attack,raw.defense);
  const stats=effectiveStats(equipped);
  almost(stats.attack,cls.attack+gear.attack,cls.id+' Character stat view must use converted Attack');
  almost(stats.defense,cls.defense+gear.defense,cls.id+' Character stat view must use converted Defense');
  const diff=equipmentComparison(bare,equipped);
  almost(diff.after.attack,stats.attack,cls.id+' gear compare must use effective Attack');
  almost(diff.after.defense,stats.defense,cls.id+' gear compare must use effective Defense');
  assert.equal(JSON.stringify(state),rawBefore,cls.id+' stat calculation must not mutate save state');
}
console.log('PASS: class equipment stats express nine roles with conserved budgets, intact builds, actual Character and Compare parity');
