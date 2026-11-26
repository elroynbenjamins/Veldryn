import type {GameState,CharacterState} from './types';

/** Server-owned collection grants. Never use the mutable save's ownership lists as proof. */
export const ULTRA_LUXE_GRANT_COLLECTIONS=[
 {id:'ascendant-celestial-sovereign',background:'ascendant-celestial-astral-sanctum',border:'ascendant-celestial-crown-of-the-cosmos',pet:'ascendant-celestial-aetherion',icon:'ascendant-celestial-crown-icon',title:'ascendant-celestial-title',titleName:'Sovereign of the Stars',badge:'ascendant_sovereign_of_stars',nameStyle:'ascendant-celestial-name'},
 {id:'ascendant-draconic-dominion',background:'ascendant-draconic-dominion-of-ash',border:'ascendant-draconic-throne-of-embers',pet:'ascendant-draconic-vharaxis',icon:'ascendant-draconic-ruby-icon',title:'ascendant-draconic-title',titleName:'Dragon Sovereign',badge:'ascendant_dragon_sovereign',nameStyle:'ascendant-draconic-name'},
] as const;
export function ultraLuxeGrantProjection(raw:unknown){
 const ids=new Set(Array.isArray(raw)?raw.filter((id):id is string=>typeof id==='string'):[]);
 const rows=ULTRA_LUXE_GRANT_COLLECTIONS.filter(row=>ids.has(row.id));
 return {collectionIds:rows.map(row=>row.id),backgrounds:rows.map(row=>row.background),borders:rows.map(row=>row.border),pets:rows.map(row=>row.pet),icons:rows.map(row=>row.icon),titles:rows.map(row=>row.title),badges:rows.map(row=>row.badge),nameStyles:rows.map(row=>row.nameStyle)};
}
const privateId=(id:string)=>id.startsWith('ascendant-')||id.startsWith('ascendant_');
function replacePrivate(existing:readonly string[]|undefined,verified:readonly string[]){
 return [...new Set([...(existing??[]).filter(id=>!privateId(id)),...verified])];
}
function allowed(id:string|undefined,owned:readonly string[]){
 return !id||!privateId(id)||owned.includes(id);
}
/** Rebuild only reserved private IDs, keeping all earned/ordinary cosmetics intact.
 * Pure and idempotent; no auto-equip, currency, CP or other gameplay change.
 * The caller must supply fresh service-only grant rows, not a client payload. */
export function withVerifiedUltraLuxeGrants(state:GameState,raw:unknown):GameState{
 const grants=ultraLuxeGrantProjection(raw);
 const sanitize=(c:CharacterState):CharacterState=>{
  const title=ULTRA_LUXE_GRANT_COLLECTIONS.find(row=>row.titleName.toLowerCase()===c.profileTitle?.trim().toLowerCase());
  return {...c,
   profileBackgroundId:allowed(c.profileBackgroundId,grants.backgrounds)?c.profileBackgroundId:'asterfall-night',
   profileBorderId:allowed(c.profileBorderId,grants.borders)?c.profileBorderId:undefined,
   selectedCosmeticPetId:allowed(c.selectedCosmeticPetId,grants.pets)?c.selectedCosmeticPetId:undefined,
   profileIconId:allowed(c.profileIconId,grants.icons)?c.profileIconId:'class:'+c.classId,
   profileTitle:title&&!grants.titles.includes(title.title)?'New Adventurer':c.profileTitle,
  };
 };
 return {...state,account:{...state.account,
  profileIconId:allowed(state.account.profileIconId,grants.icons)?state.account.profileIconId:state.character?'class:'+state.character.classId:undefined,
  unlockedProfileBackgroundIds:replacePrivate(state.account.unlockedProfileBackgroundIds,grants.backgrounds),
  unlockedProfileBorderIds:replacePrivate(state.account.unlockedProfileBorderIds,grants.borders),
  unlockedCosmeticPetIds:replacePrivate(state.account.unlockedCosmeticPetIds,grants.pets),
  unlockedProfileIconIds:replacePrivate(state.account.unlockedProfileIconIds,grants.icons),
  unlockedTitleIds:replacePrivate(state.account.unlockedTitleIds,grants.titles),
 },character:state.character?sanitize(state.character):state.character,
 ...(state.otherCharacters?{otherCharacters:state.otherCharacters.map(row=>({...row,character:sanitize(row.character)}))}:{})};
}
export function verifiedUltraLuxeTitleId(title:string|undefined,raw:unknown){
 const grants=ultraLuxeGrantProjection(raw);
 return ULTRA_LUXE_GRANT_COLLECTIONS.find(row=>row.titleName===title&&grants.titles.includes(row.title))?.title;
}

/** Reserve exact canonical title names, including whitespace/case variants.
 * The ordinary custom-title route cannot bypass private ownership. */
export function canUsePrivateTitleText(state:GameState,title:string|undefined){
 const reserved=ULTRA_LUXE_GRANT_COLLECTIONS.find(row=>row.titleName.toLowerCase()===title?.trim().toLowerCase());
 return !reserved||(state.account.unlockedTitleIds?.includes(reserved.title)??false);
}
