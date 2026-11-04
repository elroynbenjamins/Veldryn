import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {coopCombatSetup} from '../src/core/coop-combat-setup';

const state=createCharacter(newGame(0),'IRONWARDEN','Dungeon Setup Test');
assert.equal(coopCombatSetup(state).companion,undefined,'do not invent a companion');
assert.equal(coopCombatSetup(state).healing,undefined,'do not invent an equipped potion');
assert.equal(coopCombatSetup(state).tonicCount,0,'no ghost tonics');
const c=state.character!;
c.equippedCombatCompanionId='UNIT_003';
c.equippedHealingPotionId='RIVERHEART_DRAUGHT';
state.inventory.stacks=[
 {itemId:'RIVERHEART_DRAUGHT',quantity:3},
 {itemId:'VIGOR_TONIC',quantity:2},
 {itemId:'WARD_TONIC',quantity:1},
 {itemId:'DEWLEAF_DRAUGHT',quantity:7},
 {itemId:'IRON_ORE',quantity:30},
];
const original=JSON.stringify(state);
const summary=coopCombatSetup(state);
assert.equal(summary.companion?.name,'Silverbrook Sprite','display actual equipped companion');
assert.equal(summary.companion?.role,'support','display companion combat role');
assert.equal(summary.healing?.name,'Riverheart Draught','display only selected HP potion');
assert.equal(summary.healing?.percent,35,'use potion catalog percent, not invented potencies');
assert.equal(summary.healing?.carried,3,'exclude other draughts and uncarried stock');
assert.equal(summary.tonicCount,3,'sum only owned preparation tonics');
assert.equal(summary.tonicPreviewId,'VIGOR_TONIC','preview the real carried potion atlas');
assert.equal(JSON.stringify(state),original,'preview cannot spend or equip items');
assert.equal(coopCombatSetup({...state,inventory:{...state.inventory,stacks:[]}}).healing?.carried,0,'selected but empty is not falsely ready');
assert.equal(coopCombatSetup({...state,character:{...c,equippedHealingPotionId:'WARD_TONIC'}}).healing,undefined,'tonic is not healing');
assert.equal(coopCombatSetup({...state,character:{...c,equippedCombatCompanionId:'UNRECOGNIZED'}}).companion,undefined,'no invented companion identity');
assert.equal(coopCombatSetup({...state,character:null}).companion,undefined,'safe when character is absent');
console.log('PASS dungeon setup previews are read-only, catalog-based and inventory-accurate');
