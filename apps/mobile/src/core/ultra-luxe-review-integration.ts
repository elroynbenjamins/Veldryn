import {ULTRA_LUXE_FULL_SET_DEFINITIONS,canonicalUltraLuxeCollection} from './ultra-luxe-full-set-command';
import type {WardrobeEquipped} from './profile-wardrobe';
import {ULTRA_LUXE_GRANT_COLLECTIONS} from './ultra-luxe-grants';
import {ABYSSAL_IDS,ABYSSAL_PRIVATE_REVIEW,ABYSSAL_COLLECTION} from './abyssal-showcase-layout';
import {PARADOX_IDS,PARADOX_REVIEW,PARADOX_COLLECTION} from './paradox-showcase-layout';
import {ultraLuxeVisualTier,ultraLuxeSceneEffectCompatible} from './ultra-luxe-set-visuals';

/** REVIEW ONLY. Candidates are not authoritative grant rows and must never
 * be appended to the production projection until the server is updated.
 * No new icon/name-style IDs are assumed; badges stay independently equipped. */
export const ULTRA_LUXE_REVIEW_COLLECTIONS=[
 {...ULTRA_LUXE_GRANT_COLLECTIONS[0],name:'Celestial Sovereign',effect:'premium:celestial-sovereign:celestial-alignment',status:'existing'},
 {...ULTRA_LUXE_GRANT_COLLECTIONS[1],name:'Draconic Dominion',effect:'premium:draconic-dominion:awakening-of-the-dragon',status:'existing'},
 {id:ABYSSAL_PRIVATE_REVIEW.collectionId,name:ABYSSAL_COLLECTION.name,...ABYSSAL_IDS,title:ABYSSAL_PRIVATE_REVIEW.titleId,titleName:ABYSSAL_COLLECTION.badgeName,effect:ABYSSAL_PRIVATE_REVIEW.effectId,status:'candidate'},
 {id:PARADOX_REVIEW.collectionId,name:PARADOX_COLLECTION.name,...PARADOX_IDS,title:PARADOX_REVIEW.titleId,titleName:PARADOX_COLLECTION.badgeName,effect:PARADOX_REVIEW.effectId,status:'candidate'},
] as const;
export type ReviewCollectionId=typeof ULTRA_LUXE_REVIEW_COLLECTIONS[number]['id'];
/** The adapter receives a server-owned projection, NOT mutable GameState
 * ownership arrays. The caller is responsible for authenticating the RPC.
 * Fixtures are for isolated review only; no client can authorize a save. */
export type ReviewGrantSnapshot={accountId:string;collectionIds:readonly string[]};
export type ReviewScope={accountId:string;characterId:string};
export function eligibleReviewCollections(enabled:boolean,scope:ReviewScope,snapshot:ReviewGrantSnapshot|undefined){
 if(!enabled||!scope.accountId||!scope.characterId||!snapshot||snapshot.accountId!==scope.accountId||!Array.isArray(snapshot.collectionIds))return [];
 return ULTRA_LUXE_REVIEW_COLLECTIONS.filter(c=>snapshot.collectionIds.includes(c.id));
}
export function reviewQuickSetChoices(enabled:boolean,scope:ReviewScope,snapshot:ReviewGrantSnapshot|undefined){
 return eligibleReviewCollections(enabled,scope,snapshot).map(c=>({id:c.id,name:c.name,patch:{
  scene:c.background,frame:c.border,pet:c.pet,title:c.titleName,
  // Dedicated ambient signature works without a separately granted legacy effect.
  // Clear an incompatible effect; never equip an unowned premium:* ID.
  effect:'',
 } satisfies Partial<WardrobeEquipped>}));
}
/** Re-resolve against the current authenticated scope and latest projection.
 * A selection is a pure draft, not a saved state or grant. */
export function reviewQuickSetSelection(enabled:boolean,scope:ReviewScope,requestedScope:ReviewScope,snapshot:ReviewGrantSnapshot|undefined,current:WardrobeEquipped,id:string):WardrobeEquipped|null{
 if(scope.accountId!==requestedScope.accountId||scope.characterId!==requestedScope.characterId)return null;
 const choice=reviewQuickSetChoices(enabled,scope,snapshot).find(c=>c.id===id);
 return choice?{...current,...choice.patch}:null;
}
export function reviewEquippedTier(enabled:boolean,scope:ReviewScope,snapshot:ReviewGrantSnapshot|undefined,actual:{background?:string|null;border?:string|null;pet?:string|null;effect?:string|null;verifiedTitleId?:string|null;displayedBadges:readonly string[]}){
 const row=eligibleReviewCollections(enabled,scope,snapshot).find(c=>c.background===actual.background&&c.border===actual.border&&ultraLuxeSceneEffectCompatible(actual.effect,c.effect));
 return row?{id:row.id,tier:ultraLuxeVisualTier(row,actual)}:null;
}

/** Normalize only authenticated self-RPC collection IDs. Keep the existing four-set
 * behavior unless the explicitly gated combined equip path requests all six. */
export function normalizeReviewGrantSnapshot(raw:unknown,accountId:string,allowSix=false):ReviewGrantSnapshot|undefined{
 if(!accountId||!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const row=raw as {accountId?:unknown;collectionIds?:unknown};
 if(row.accountId!==accountId||!Array.isArray(row.collectionIds))return undefined;
 const ids=new Set(row.collectionIds.filter((id):id is string=>typeof id==='string'));
 const canonical=allowSix?ULTRA_LUXE_FULL_SET_DEFINITIONS.map(c=>c[0]):ULTRA_LUXE_REVIEW_COLLECTIONS.map(c=>c.id);
 return {accountId,collectionIds:canonical.filter(id=>ids.has(id))};
}
/** A verified name preset and save projection alone are insufficient for the
 * combined wardrobe action: require the matching authenticated collection too. */
export function reviewGrantAllowsFullSet(snapshot:ReviewGrantSnapshot|undefined,scope:ReviewScope,setId:unknown){
 const id=canonicalUltraLuxeCollection(setId);
 return !!id&&!!scope.accountId&&!!scope.characterId&&snapshot?.accountId===scope.accountId&&snapshot.collectionIds.includes(id);
}
