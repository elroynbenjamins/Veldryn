"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const classes_1 = require("../src/content/classes");
const items_1 = require("../src/content/items");
const game_1 = require("../src/core/game");
const save_migrations_1 = require("../src/core/save-migrations");
const character_creation_1 = require("../src/core/character-creation");
function ok(value, message) { if (!value)
    throw new Error(message); }
for (const name of ['Éira', 'O\'Brien', 'Li', 'Anne-Marie', '  Rowan  '])
    ok((0, character_creation_1.characterNameError)(name) === '', `Valid name: ${name}`);
for (const name of ['', ' ', 'A', '123', '<script>', 'A'.repeat(21)]) {
    ok(!!(0, character_creation_1.characterNameError)(name), `Invalid name: ${name}`);
    if (name.trim()) {
        let rejected = false;
        try {
            (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN', name);
        }
        catch {
            rejected = true;
        }
        ok(rejected, 'Core rejects invalid names');
    }
}
for (const count of [2, 3, 4, 9]) {
    ok((0, character_creation_1.carouselIndex)(0, -1, count) === count - 1, 'Previous wraps');
    ok((0, character_creation_1.carouselIndex)(count - 1, 1, count) === 0, 'Next wraps');
}
ok((0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN', '  ').character?.name === 'Adventurer', 'Empty API name retains legacy fallback');
for (const c of classes_1.CLASSES) {
    for (const body of ['male', 'female']) {
        const state = (0, game_1.createCharacter)((0, game_1.newGame)(1000), c.id, '  Rowan  ', body);
        const character = state.character;
        ok(character.name === 'Rowan', 'Name is trimmed');
        ok(character.bodyPresentation === body, 'Presentation is stored');
        ok(Object.keys(character.equipment).length === 1, 'Exactly one starting item');
        ok(character.equipment.weapon === c.starterEquipment.weapon, 'Preview and equipped weapon agree');
        ok((0, items_1.itemDef)(character.equipment.weapon).slot === 'weapon', 'Primary item occupies weapon slot');
        ok(character.currentHp === (0, game_1.effectiveStats)(state).hp, 'Starting health matches equipment');
        const loaded = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(state)));
        ok(loaded.character?.bodyPresentation === body, 'Presentation survives save/load');
        let rejected = false;
        try {
            (0, game_1.createCharacter)(state, c.id, 'Overwrite', body);
        }
        catch {
            rejected = true;
        }
        ok(rejected, 'Creation must not replace an existing character');
    }
}
const legacy = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN');
delete legacy.character.bodyPresentation;
legacy.character.equipment = { weapon: 'START_IRON_SWORD', offhand: 'START_KITE_SHIELD' };
const migrated = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(legacy)));
ok(migrated.character?.bodyPresentation === 'male', 'Legacy presentation default');
ok(JSON.stringify(migrated.character?.equipment) === JSON.stringify(legacy.character.equipment), 'Migration preserves all legacy equipment');
console.log('PASS: 18 character variants, primary weapon contract, persistence and legacy equipment preservation');
