import {createCharacter,newGame} from '../src/core/game';
import {combatPowerRating} from '../src/core/combat-power';
import {unlockCombatCompanion,equipCombatCompanion} from '../src/core/combat-companions';
import {equal,ok} from './account-test-helpers';

let state=createCharacter(newGame(0),'IRONWARDEN','Power Test');
const bare=combatPowerRating(state);
ok(bare.total>0,'a character must have a positive Combat Power score');
equal(bare.companion,0,'an unequipped companion must not add Combat Power');
state=equipCombatCompanion(unlockCombatCompanion(state,'UNIT_001',0),'UNIT_001');
const withCompanion=combatPowerRating(state);
ok(withCompanion.companion>0,'an equipped companion must contribute to Combat Power');
ok(withCompanion.total>bare.total,'Combat Power must increase with a combat companion');
equal(withCompanion.rows.map(row=>row.id).join(','),'base,build,passives,companion','the rating must expose its full breakdown');
console.log('PASS: Combat Power rating is transparent and includes companion strength');
