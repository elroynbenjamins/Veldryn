"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_NAMES = exports.SUPPORTED_LANGUAGES = void 0;
exports.isSupportedLanguage = isSupportedLanguage;
exports.SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'nl', 'it', 'fr'];
exports.LANGUAGE_NAMES = {
    en: 'English',
    de: 'Deutsch',
    es: 'Español',
    nl: 'Nederlands',
    it: 'Italiano',
    fr: 'Français',
};
function isSupportedLanguage(value) {
    return typeof value === 'string' && exports.SUPPORTED_LANGUAGES.includes(value);
}
