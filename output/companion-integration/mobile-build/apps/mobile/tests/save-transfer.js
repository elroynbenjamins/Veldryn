"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const number_format_1 = require("../src/core/number-format");
const save_transfer_1 = require("../src/core/save-transfer");
function ok(value, message) { if (!value)
    throw new Error(message); }
const state = (0, game_1.createCharacter)((0, game_1.newGame)(1_000), 'IRONWARDEN', 'Backup Tester');
const backup = (0, save_transfer_1.createSaveBackup)(state, new Date('2026-09-08T00:00:00.000Z'));
const restored = (0, save_transfer_1.parseSaveBackup)(backup);
ok(restored.character?.name === 'Backup Tester', 'A versioned backup must restore the character');
ok((0, save_transfer_1.parseSaveBackup)(JSON.stringify(state)).version === 6, 'A raw legacy-style save export must remain importable');
let invalidRejected = false;
try {
    (0, save_transfer_1.parseSaveBackup)('{broken');
}
catch (error) {
    invalidRejected = error instanceof Error && error.message.includes('valid JSON');
}
ok(invalidRejected, 'Malformed backup JSON must be rejected without producing a save');
let futureRejected = false;
try {
    (0, save_transfer_1.parseSaveBackup)(JSON.stringify({ format: 'veldryn-save-backup', formatVersion: 2, save: state }));
}
catch (error) {
    futureRejected = error instanceof Error && error.message.includes('format version');
}
ok(futureRejected, 'Unknown future backup envelope versions must be rejected');
ok((0, number_format_1.formatGameNumber)(999, 'abbreviated') === '999', 'Small abbreviated values must remain exact');
ok((0, number_format_1.formatGameNumber)(12_500, 'abbreviated') === '12.5K', 'Large abbreviated values must be compact');
ok((0, number_format_1.formatGameNumber)(12_500, 'exact') === '12,500', 'Exact number mode must use grouped digits');
console.log('PASS: versioned save export/import validation and display number formatting');
