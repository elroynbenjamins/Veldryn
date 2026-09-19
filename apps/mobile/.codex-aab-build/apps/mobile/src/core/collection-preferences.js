"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COLLECTION_PREFERENCES = void 0;
exports.normalizeCollectionPreferences = normalizeCollectionPreferences;
exports.favoriteIds = favoriteIds;
exports.isFavorite = isFavorite;
exports.setFavorite = setFavorite;
exports.toggleFavorite = toggleFavorite;
exports.DEFAULT_COLLECTION_PREFERENCES = { favoriteItemIds: [], favoriteRecipeIds: [], favoriteCompanionIds: [], favoriteQuestIds: [], favoriteAchievementIds: [] };
const keyFor = { item: 'favoriteItemIds', recipe: 'favoriteRecipeIds', companion: 'favoriteCompanionIds', quest: 'favoriteQuestIds', achievement: 'favoriteAchievementIds' };
const clean = (value) => Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string' && id.length > 0))].slice(0, 250) : [];
function normalizeCollectionPreferences(value) { return { favoriteItemIds: clean(value?.favoriteItemIds), favoriteRecipeIds: clean(value?.favoriteRecipeIds), favoriteCompanionIds: clean(value?.favoriteCompanionIds), favoriteQuestIds: clean(value?.favoriteQuestIds), favoriteAchievementIds: clean(value?.favoriteAchievementIds) }; }
function favoriteIds(state, kind) { return state.account.collectionPreferences?.[keyFor[kind]] ?? []; }
function isFavorite(state, kind, id) { return favoriteIds(state, kind).includes(id); }
function setFavorite(state, kind, id, favorite) { const prefs = normalizeCollectionPreferences(state.account.collectionPreferences), key = keyFor[kind], ids = prefs[key]; return { ...state, account: { ...state.account, collectionPreferences: { ...prefs, [key]: favorite ? [...new Set([...ids, id])] : ids.filter(entry => entry !== id) } } }; }
function toggleFavorite(state, kind, id) { return setFavorite(state, kind, id, !isFavorite(state, kind, id)); }
