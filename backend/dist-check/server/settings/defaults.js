"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_CHANNELS = exports.ANDROID_PACKAGE = exports.DEFAULT_SETTINGS = exports.SETTINGS_VERSION = void 0;
exports.SETTINGS_VERSION = 1;
exports.DEFAULT_SETTINGS = { gameplay: { combatSpeed: 1, confirmRareSalvage: true, confirmExpensivePurchase: true, confirmMarketListing: true }, interface: { uiScale: 'normal', textScale: 1, density: 'comfortable', numberMode: 'abbreviated', homeDensity: 'standard', dataMode: 'simple' }, accessibility: { highContrast: false, reduceMotion: false, screenShake: 'normal', reduceFlash: false, telegraphLabels: true }, chat: { worldChatEnabled: true, autoOpen: false, rememberState: true, preferredChannelId: 'CHAT_WORLD_01', timestamps: true, personalFilter: true, filteredBehavior: 'mask', dmPolicy: 'everyone' }, notifications: { quietStart: '22:00', quietEnd: '08:00' }, performance: { fpsCap: 60, batterySaver: false, effectsQuality: 'high', backgroundAnimation: true } };
exports.ANDROID_PACKAGE = 'com.elroybenjamins.veldryn';
exports.CHAT_CHANNELS = [{ id: 'CHAT_WORLD_01', name: 'English', language: 'en' }, { id: 'CHAT_WORLD_02', name: 'Spanish', language: 'es' }, { id: 'CHAT_WORLD_03', name: 'Global 1', language: 'multi-eu' }, { id: 'CHAT_WORLD_04', name: 'Global 2', language: 'multi' }];
