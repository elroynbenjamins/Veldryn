"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const progression_1 = require("../src/core/progression");
function ok(condition, message) { if (!condition)
    throw new Error(message); }
const t0 = 1_000_000;
let s = (0, game_1.createCharacter)((0, game_1.newGame)(t0), 'WAYFINDER', 'Tester');
s = (0, game_1.startCombat)(s, 'MOSS_RAT', t0);
let p = (0, game_1.previewActivityReward)(s, t0 + 60_000);
ok(p.kills >= 3, 'Should kill multiple Moss Rats in 60 sec');
let c = (0, game_1.claimActivity)(s, t0 + 60_000);
s = c.state;
ok(s.character.xp > 0 && s.character.gold > 100, 'Claim should award XP and gold');
const capped = (0, game_1.previewActivityReward)(s, t0 + 60_000 + (game_1.OFFLINE_CAP_SECONDS + 3600) * 1000);
ok(capped.elapsedSeconds === game_1.OFFLINE_CAP_SECONDS, 'Offline progress must cap at the 24-hour base reserve');
let level25Xp = (0, progression_1.totalXpAtLevel)(25);
ok(level25Xp > 0, 'Level curve should support level 25');
const a = (0, game_1.previewActivityReward)(s, t0 + 120_000);
const b = (0, game_1.previewActivityReward)(s, t0 + 120_000);
ok(JSON.stringify(a) === JSON.stringify(b), 'Offline rewards must be deterministic for same state/time');
console.log(JSON.stringify({ status: 'PASS', firstMinute: c.reward, offlineCapHours: game_1.OFFLINE_CAP_SECONDS / 3600, level25Xp }, null, 2));
