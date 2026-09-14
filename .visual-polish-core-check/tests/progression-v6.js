"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const skills_1 = require("../src/content/skills");
const monsters_1 = require("../src/content/monsters");
const progression_1 = require("../src/core/progression");
const save_migrations_1 = require("../src/core/save-migrations");
const game_1 = require("../src/core/game");
if ((0, progression_1.characterXpForNextLevel)(1) !== Math.floor((90 * Math.pow(1, 1.42) + 35) * 43.2))
    throw new Error('Character XP scaling missing');
if ((0, progression_1.skillXpForNextLevel)(1) !== Math.floor((90 * Math.pow(1, 1.42) + 35) * 4.3))
    throw new Error('Skill XP scaling missing');
if (monsters_1.MONSTERS.find(m => m.id === 'MOSS_RAT').secondsPerKill !== 14)
    throw new Error('Current combat action pacing missing');
if (skills_1.GATHERING.find(g => g.id === 'COPPER_VEIN').seconds !== 30)
    throw new Error('Gathering pacing missing');
if (skills_1.RECIPES.find(r => r.id === 'SMITH_COPPER_BLADE').inputs.find(i => i.itemId === 'COPPER_INGOT').quantity !== 44)
    throw new Error('Gear materials were not doubled');
const old = { ...(0, game_1.newGame)(0), version: 5, account: undefined, settings: { numberMode: 'abbreviated', reduceMotion: false, textScale: 1, autoEatThresholdPct: 40, stopCombatWhenOutOfFood: true } };
const migrated = (0, save_migrations_1.migrateSave)(old);
if (migrated.version !== 6 || migrated.settings.language !== 'en' || migrated.account.createdCharacterCount !== 1)
    throw new Error('v5 migration failed');
console.log('PASS: v6 pacing, requirements, language and account migration');
