import {createCharacter,newGame} from '../src/core/game';
import {combatPowerRating,MAX_COMPANION_COMBAT_POWER_SHARE,redistributeCompanionCombatPower} from '../src/core/combat-power';
import {unlockCombatCompanion,equipCombatCompanion} from '../src/core/combat-companions';
import {equal,ok} from './account-test-helpers';

const oldSplit=redistributeCompanionCombatPower(7500,2500);
equal(oldSplit.total,10000,'reweighting must never change total Combat Power');
equal(oldSplit.player,8200,'a 25% companion share redistributes 7% to personal power');
equal(oldSplit.companion,1800,'a 25% companion share becomes 18%');
equal(oldSplit.reallocated,700,'the full reduction is allocated back to personal power');
equal(redistributeCompanionCombatPower(8500,1500).reallocated,0,'lower companion shares must stay untouched');

let state=createCharacter(newGame(0),'IRONWARDEN','Power Test');
const bare=combatPowerRating(state);
ok(bare.total>0,'a character must have a positive Combat Power score');
equal(bare.companion,0,'an unequipped companion must not add Combat Power');
state=equipCombatCompanion(unlockCombatCompanion(state,'UNIT_001',0),'UNIT_001');
const withCompanion=combatPowerRating(state);
ok(withCompanion.companion>0,'an equipped companion must contribute to Combat Power');
ok(withCompanion.total>bare.total,'Combat Power must increase with a combat companion');
equal(withCompanion.rows.map(row=>row.id).join(','),withCompanion.rows.some(row=>row.id==='allocation')?'base,build,passives,allocation,companion':'base,build,passives,companion','the rating must expose its full breakdown');
ok(withCompanion.companion<=Math.floor(withCompanion.total*MAX_COMPANION_COMBAT_POWER_SHARE),'equipped companion share must not exceed 18%');
equal(withCompanion.player+withCompanion.companion,withCompanion.total,'personal and companion shares must reconcile');
equal(withCompanion.rows.reduce((total,row)=>total+row.value,0),withCompanion.total,
 'Combat Power source rows must reconcile without estimating passive percentages');
// The maximum-share redistribution is tested above from legitimate rating inputs.
 // Do not forge a companion ascension tier 5: owned companion tiers are 0..3.
const noGear={...state,character:{...state.character!,equipment:{}}};
const noGearPower=combatPowerRating(noGear);
ok(withCompanion.player>=noGearPower.player,'Equipped gear must not reduce the personal Combat Power rating');
equal(noGearPower.rows.find(row=>row.id==='build')?.value,0,
 'No equipment means no gear/set/gem build contribution');

console.log('PASS: Combat Power rating reweights companion to at most 18%, preserves total, and reconciles breakdown');
