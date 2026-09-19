"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const combat_region_1 = require("../src/core/combat-region");
const world_navigation_1 = require("../src/core/world-navigation");
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
const later = { ...beginner, character: { ...beginner.character, level: 30 } };
const sunscar = (0, game_1.travelToRegion)(later, 'SUNSCAR', 7).state;
ok((0, combat_region_1.currentRegionId)(sunscar) === 'SUNSCAR', 'Later-region travel must persist Sunscar');
const sunscarScout = (0, game_1.startExploration)(sunscar, 'SCOUT_SUNSCAR', 8);
const sunscarMapped = (0, game_1.claimActivity)(sunscarScout, 218008).state;
ok(sunscarMapped.unlockedMonsterIds.includes('SUNSCAR_SCORPION'), 'Sunscar scouting must unlock its first authored encounter');
const sunscarCombat = (0, game_1.startCombat)(sunscarMapped, 'SUNSCAR_SCORPION', 218009);
ok(sunscarCombat.activity?.targetId === 'SUNSCAR_SCORPION', 'Sunscar encounters must use the normal combat activity lane');
ok(!(0, game_1.claimActivity)(sunscarCombat, 338009).state.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'), 'Sunscar combat must not bypass Ashlands scouting');
const frost = { ...beginner, character: { ...beginner.character, level: 50 } };
const frostmarch = (0, game_1.travelToRegion)(frost, 'FROSTMARCH', 9).state;
const frostScout = (0, game_1.startExploration)(frostmarch, 'SCOUT_FROSTMARCH', 10);
const frostMapped = (0, game_1.claimActivity)(frostScout, 310010).state;
ok((0, game_1.startCombat)(frostMapped, 'FROSTWOLF', 310011).activity?.targetId === 'FROSTWOLF', 'Frostmarch encounters must be startable after scouting and its level gate');
rejected = false;
try {
    (0, game_1.travelToRegion)(later, 'FROSTMARCH', 11);
}
catch {
    rejected = true;
}
ok(rejected, 'Frostmarch must remain locked below its level gate');
const ash = { ...beginner, character: { ...beginner.character, level: 75 } };
const ashlands = (0, game_1.travelToRegion)(ash, 'ASHLANDS', 12).state;
const ashScout = (0, game_1.startExploration)(ashlands, 'SCOUT_ASHLANDS', 13);
const ashMapped = (0, game_1.claimActivity)(ashScout, 373013).state;
ok(ashMapped.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'), 'Ashlands scouting must unlock its first authored encounter');
ok((0, game_1.startCombat)(ashMapped, 'BLACKGLASS_MIRELING', 373014).activity?.targetId === 'BLACKGLASS_MIRELING', 'Ashlands encounters must use the normal combat activity lane');
ok((0, world_navigation_1.encounterUnlocked)(ashMapped, { id: 'BLACKGLASS_MIRELING', name: 'Blackglass Mireling', level: 72, hp: 1, attack: 1, defense: 1, xp: 1, gold: 1, secondsPerKill: 1, unlockLevel: 71, zone: 'Ashlands', drops: [] }), 'Unlocked Ashlands encounter must appear in the world browser');
ok((0, world_navigation_1.regionEncounters)(ashMapped, 'Ashlands', 'glass', true).some(monster => monster.id === 'BLACKGLASS_MIRELING'), 'Later-region encounter search must include discovered content');
ok((0, world_navigation_1.nextRegionUnlock)(30)?.id === 'FROSTMARCH' && (0, world_navigation_1.nextRegionUnlock)(50)?.id === 'ASHLANDS', 'Next-region navigation must include later regions');
console.log('PASS: travel persists location and region gates combat and gathering');
