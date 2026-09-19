"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncStorageGameRepository = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const save_migrations_1 = require("../core/save-migrations");
const i18n_1 = require("../i18n");
const KEY = 'veldryn.local.save.v1';
const LANGUAGE_KEY = 'veldryn.local.language.v1';
class AsyncStorageGameRepository {
    async load() {
        const raw = await async_storage_1.default.getItem(KEY);
        return raw ? (0, save_migrations_1.migrateSave)(JSON.parse(raw)) : null;
    }
    async loadLanguage() {
        const language = await async_storage_1.default.getItem(LANGUAGE_KEY);
        return (0, i18n_1.isSupportedLanguage)(language) ? language : 'en';
    }
    async save(state) { await async_storage_1.default.multiSet([[KEY, JSON.stringify(state)], [LANGUAGE_KEY, state.settings.language]]); }
    async reset() { await async_storage_1.default.multiRemove([KEY, LANGUAGE_KEY]); }
}
exports.AsyncStorageGameRepository = AsyncStorageGameRepository;
