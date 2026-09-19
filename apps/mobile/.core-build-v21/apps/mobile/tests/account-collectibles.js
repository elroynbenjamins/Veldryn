"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collectibles_1 = require("../src/content/collectibles");
const collectibles_2 = require("../src/core/collectibles");
const game_1 = require("../src/core/game");
const fail = (message) => { throw new Error(message); };
const state = (0, collectibles_2.unlockCollectible)((0, game_1.createCharacter)((0, game_1.newGame)(1), 'IRONWARDEN', 'Mira'), 'pet_harvest_fox');
(0, collectibles_1.validateCollectibleCatalog)();
if (collectibles_1.COLLECTIBLES.length !== 15)
    fail('catalog');
if ((0, collectibles_2.collectionBonusBreakdown)(state).find(row => row.target === 'gold')?.ownedAppliedBps !== 50)
    fail('owned bonus');
const active = (0, collectibles_2.selectCollectible)(state, 'pet', 'pet_harvest_fox');
if (active.character?.selectedCosmeticPetId !== 'pet_harvest_fox')
    fail('selection');
console.log('account collectibles PASS');
