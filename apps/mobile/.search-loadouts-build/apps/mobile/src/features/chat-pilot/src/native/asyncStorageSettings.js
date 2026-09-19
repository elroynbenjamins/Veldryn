"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncStorageSettings = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
/** Separate account-scoped preference key. Never overwrite the game's save or auth tokens. */
exports.asyncStorageSettings = {
    async load(accountId) {
        const raw = await async_storage_1.default.getItem(`veldryn.chat.pilot.v1:${encodeURIComponent(accountId)}`);
        if (!raw)
            return null;
        const value = JSON.parse(raw);
        if (!value || typeof value !== 'object')
            throw new Error('Invalid chat settings');
        const v = value;
        if (v.schemaVersion !== 1 || !Array.isArray(v.tray) || v.tray.some(id => typeof id !== 'string') || typeof v.worldOptIn !== 'boolean')
            throw new Error('Invalid chat settings');
        return v;
    },
    async save(accountId, settings) { await async_storage_1.default.setItem(`veldryn.chat.pilot.v1:${encodeURIComponent(accountId)}`, JSON.stringify(settings)); }
};
