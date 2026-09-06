"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monsters_1 = require("../src/content/monsters");
const combat_presentation_1 = require("../src/core/combat-presentation");
const game_1 = require("../src/core/game");
const item_rarity_1 = require("../src/core/item-rarity");
const items_1 = require("../src/content/items");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
const monster = monsters_1.MONSTERS[0], start = (0, combat_presentation_1.combatPresentation)(state, monster, 0, monster.secondsPerKill), late = (0, combat_presentation_1.combatPresentation)(state, monster, 6, monster.secondsPerKill);
if (start.enemyHp !== monster.hp || late.enemyHp >= start.enemyHp)
    throw new Error('Enemy health cycle must visibly fall');
if (start.playerHit < 1 || start.enemyHit < 1)
    throw new Error('Presented damage must remain positive');
if ((0, item_rarity_1.itemRarity)((0, items_1.itemDef)('MOSS_FIBER')) !== 'common' || (0, item_rarity_1.itemRarity)((0, items_1.itemDef)('OATHGLASS_CAPE')) !== 'epic')
    throw new Error('Rarity classification failed');
console.log(JSON.stringify({ status: 'PASS', start, late }));
