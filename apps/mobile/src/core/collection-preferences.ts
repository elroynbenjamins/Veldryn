import type {GameState} from './types';
export type FavoriteKind='item'|'recipe'|'companion'|'quest'|'achievement';
export interface CollectionPreferences{favoriteItemIds:string[];favoriteRecipeIds:string[];favoriteCompanionIds:string[];favoriteQuestIds:string[];favoriteAchievementIds:string[];}
export const DEFAULT_COLLECTION_PREFERENCES:CollectionPreferences={favoriteItemIds:[],favoriteRecipeIds:[],favoriteCompanionIds:[],favoriteQuestIds:[],favoriteAchievementIds:[]};
const keyFor:Record<FavoriteKind,keyof CollectionPreferences>={item:'favoriteItemIds',recipe:'favoriteRecipeIds',companion:'favoriteCompanionIds',quest:'favoriteQuestIds',achievement:'favoriteAchievementIds'};
const clean=(value:unknown)=>Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&id.length>0))].slice(0,250):[];
export function normalizeCollectionPreferences(value:any):CollectionPreferences{return {favoriteItemIds:clean(value?.favoriteItemIds),favoriteRecipeIds:clean(value?.favoriteRecipeIds),favoriteCompanionIds:clean(value?.favoriteCompanionIds),favoriteQuestIds:clean(value?.favoriteQuestIds),favoriteAchievementIds:clean(value?.favoriteAchievementIds)};}
export function favoriteIds(state:GameState,kind:FavoriteKind):readonly string[]{return state.account.collectionPreferences?.[keyFor[kind]]??[];}
export function isFavorite(state:GameState,kind:FavoriteKind,id:string){return favoriteIds(state,kind).includes(id);}
export function setFavorite(state:GameState,kind:FavoriteKind,id:string,favorite:boolean):GameState{const prefs=normalizeCollectionPreferences(state.account.collectionPreferences),key=keyFor[kind],ids=prefs[key];return {...state,account:{...state.account,collectionPreferences:{...prefs,[key]:favorite?[...new Set([...ids,id])]:ids.filter(entry=>entry!==id)}}};}
export function toggleFavorite(state:GameState,kind:FavoriteKind,id:string){return setFavorite(state,kind,id,!isFavorite(state,kind,id));}
