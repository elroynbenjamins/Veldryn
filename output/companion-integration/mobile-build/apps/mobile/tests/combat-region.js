"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const combat_region_1 = require("../src/core/combat-region");
const ok = (condition, message) => { if (!condition)
    throw new Error(message); };
const beginner = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Region Test');
ok((0, combat_region_1.currentRegionId)(beginner) === 'GREENFIELDS', 'A new character must begin in Greenfields');
let rejected = false;
try {
    (0, game_1.startGathering)(beginner, 'COPPER_VEIN', 1);
}
catch {
    rejected = true;
}
ok(rejected, 'Gathering outside the current region must be rejected by core game logic');
const veteran = { ...beginner, character: { ...beginner.character, level: 20 } };
const travelled = (0, game_1.travelToRegion)(veteran, 'OLD_MINES', 2);
ok((0, combat_region_1.currentRegionId)(travelled.state) === 'OLD_MINES', 'Travel must persist the new current region');
ok((0, game_1.startGathering)(travelled.state, 'COPPER_VEIN', 3).activity?.targetId === 'COPPER_VEIN', 'Gathering in the current region must be allowed');
rejected = false;
try {
    (0, game_1.startCombat)(travelled.state, 'MOSS_RAT', 4);
}
catch {
    rejected = true;
}
ok(rejected, 'Combat outside the current region must be rejected by core game logic');
const active = (0, game_1.startGathering)(travelled.state, 'COPPER_VEIN', 5);
const returned = (0, game_1.travelToRegion)(active, 'GREENFIELDS', 60005);
ok(returned.state.currentRegionId === 'GREENFIELDS' && returned.state.activity === null, 'Travel must settle and stop an active regional activity');
ok(returned.reward.elapsedSeconds > 0, 'Travel must preserve rewards earned before departure');
rejected = false;
try {
    (0, game_1.travelToRegion)(beginner, 'KINGS_ROAD', 6);
}
catch {
    rejected = true;
}
ok(rejected, 'Locked regions must reject travel');
console.log('PASS: travel persists location and region gates combat and gathering');
