"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const save_normalization_1 = require("../src/core/save-normalization");
const i18n_1 = require("../src/i18n");
function ok(value, message) { if (!value)
    throw new Error(message); }
ok(i18n_1.SUPPORTED_LANGUAGES.join(',') === 'en,de,es,nl,it,fr', 'Release languages are missing or out of order');
ok(new Set(i18n_1.SUPPORTED_LANGUAGES.map(language => i18n_1.LANGUAGE_NAMES[language])).size === 6, 'Language names must be unique');
for (const language of i18n_1.SUPPORTED_LANGUAGES) {
    ok((0, i18n_1.translatedMessageCount)(language) === i18n_1.MESSAGE_COUNT, `${language} shared catalog is incomplete`);
    const saved = { ...(0, game_1.newGame)(1_000), settings: { ...(0, game_1.newGame)(1_000).settings, language } };
    ok((0, save_normalization_1.normalizeSave)(saved).settings.language === language, `${language} was not preserved by save normalization`);
}
ok((0, i18n_1.t)('es', 'nav.home') === 'Inicio', 'Spanish navigation translation is unavailable');
ok((0, i18n_1.t)('fr', 'common.back') === 'Retour', 'French back translation is unavailable');
ok((0, i18n_1.ot)('es', 'save.retry') === 'Reintentar carga', 'Spanish recovery translation is unavailable');
ok((0, i18n_1.ot)('de', 'overflow.move', { count: 3 }) === '3 Gegenstände zur Bank verschieben', 'Operational interpolation failed');
ok(i18n_1.OPERATIONAL_MESSAGE_COUNT >= 30, 'Operational localization coverage unexpectedly shrank');
ok((0, save_normalization_1.normalizeSave)({ ...(0, game_1.newGame)(1_000), settings: { ...(0, game_1.newGame)(1_000).settings, language: 'unknown' } }).settings.language === 'en', 'Unknown languages must fall back to English');
console.log(`Localization tests passed (${i18n_1.SUPPORTED_LANGUAGES.length} languages, ${i18n_1.MESSAGE_COUNT} shared and ${i18n_1.OPERATIONAL_MESSAGE_COUNT} operational messages each).`);
