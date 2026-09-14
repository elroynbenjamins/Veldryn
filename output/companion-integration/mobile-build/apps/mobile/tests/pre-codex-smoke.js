"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const save_migrations_1 = require("../src/core/save-migrations");
const debug_tools_1 = require("../src/dev/debug-tools");
function ok(value, message) { if (!value)
    throw new Error(message); }
const now = 10_000;
let state = (0, game_1.createCharacter)((0, game_1.newGame)(now), 'IRONWARDEN', 'CodexTest');
const migrated = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(state)));
ok(migrated.version === save_migrations_1.SAVE_SCHEMA_VERSION, 'Current save should migrate/load unchanged');
let futureRejected = false;
try {
    (0, save_migrations_1.migrateSave)({ ...state, version: 999 });
}
catch {
    futureRejected = true;
}
ok(futureRejected, 'Future save versions must be rejected safely');
state = (0, debug_tools_1.debugSetLevel)(state, 25);
ok(state.character?.level === 25, 'Debug set level should work');
state = (0, debug_tools_1.debugAddGold)(state, 500);
ok(state.character?.gold === 600, 'Debug gold should work');
state = { ...state, activity: { kind: 'combat', targetId: 'MOSS_RAT', startedAtMs: now, lastClaimAtMs: now } };
state = (0, debug_tools_1.debugAdvanceActivity)(state, 3600);
ok(state.activity.lastClaimAtMs === now - 3600_000, 'Debug time advance should adjust persisted timestamp');
console.log(JSON.stringify({ status: 'PASS', saveSchema: save_migrations_1.SAVE_SCHEMA_VERSION, debugLevel: state.character?.level, debugGold: state.character?.gold }, null, 2));
