import type {WardrobeCategory,WardrobeEquipped,WardrobeRow} from './profile-wardrobe';
import type {QuickCosmeticSet} from './profile-quick-set-equip';
import type {PlayerNameStylePreference} from './player-name-style';
import {NEXT_PREMIUM_SETS} from './next-premium-set-review';

/** Review-only adapter for the existing Ultra Luxe service-owned collection projection.
 * These are candidate definitions, not authorization. The future caller must obtain a
 * fresh authenticated self-only RPC readback and server-projected piece ownership.
 * Never pass a mutable client save as either proof. No route or persistence imports. */
export type NextPremiumScope={accountId:string;characterId:string};
export type NextPremiumGrantSnapshot={accountId:string;collectionIds:readonly string[]};
export type NextPremiumOwnedPieces={
 accountId:string;characterId:string;
 backgrounds:readonly string[];borders:readonly string[];pets:readonly string[];
 titles:readonly string[];badges:readonly string[];icons:readonly string[];nameStyles:readonly string[];
};
export type NextPremiumReadiness={wardrobe:boolean;iconArt:boolean;namePresets:boolean};
export const NEXT_PREMIUM_REVIEW_READINESS:Readonly<NextPremiumReadiness>={wardrobe:false,iconArt:false,namePresets:false};
export const NEXT_PREMIUM_PRESTIGE=[
 {id:NEXT_PREMIUM_SETS[0].id,iconName:'Sakura Blossom Medallion',namePreset:'Sakura Radiance'},
 {id:NEXT_PREMIUM_SETS[1].id,iconName:'Stormforged Wolf Medallion',namePreset:'Stormborn Radiance'},
] as const;
function sameScope(a:NextPremiumScope,b:NextPremiumScope){
 return !!a.accountId&&!!a.characterId&&a.accountId===b.accountId&&a.characterId===b.characterId;
}
function has(ids:readonly string[]|undefined,id:string){return Array.isArray(ids)&&ids.includes(id);}
function projectedSets(scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined){
 if(!grant||!pieces||grant.accountId!==scope.accountId||!sameScope(scope,pieces))return [];
 return NEXT_PREMIUM_SETS.filter(s=>has(grant.collectionIds,s.id)&&has(pieces.backgrounds,s.background)&&has(pieces.borders,s.border)&&has(pieces.pets,s.pet)&&has(pieces.titles,s.title)&&has(pieces.badges,s.badge));
}
export function nextPremiumOwnedSets(scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS){
 return ready.wardrobe?projectedSets(scope,grant,pieces):[];
}
export function nextPremiumQuickSets(scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS):QuickCosmeticSet[]{
 return nextPremiumOwnedSets(scope,grant,pieces,ready).map(s=>({id:s.id,name:s.name,accent:s.colors[0],choices:[{
  id:s.id,name:s.name,patch:{scene:s.background,frame:s.border,pet:s.pet,title:s.titleName,effect:''},
 }]}));
}
/** Draft only; preserve icon and account-wide badge/name preference. Existing queue must
 * recheck the same account/character and fresh projection immediately before saving. */
export function nextPremiumQuickSelection(scope:NextPremiumScope,requested:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,current:WardrobeEquipped,id:string,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS):WardrobeEquipped|null{
 if(!sameScope(scope,requested))return null;
 const choice=nextPremiumQuickSets(scope,grant,pieces,ready).find(s=>s.id===id)?.choices[0];
 return choice?{...current,...choice.patch}:null;
}
export function nextPremiumPatchAllowed(scope:NextPremiumScope,requested:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,patch:Partial<WardrobeEquipped>,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS){
 if(!sameScope(scope,requested))return false;
 const owned=nextPremiumOwnedSets(scope,grant,pieces,ready);
 return NEXT_PREMIUM_SETS.every(s=>{
  if(patch.effect===s.showcase)return false; // implicit signature, never an equipable legacy effect
  const referenced=patch.scene===s.background||patch.frame===s.border||patch.pet===s.pet||patch.title?.trim().toLowerCase()===s.titleName.toLowerCase();
  if(referenced&&!owned.some(o=>o.id===s.id))return false;
  return patch.icon!==s.icon||(ready.iconArt&&owned.some(o=>o.id===s.id)&&has(pieces?.icons,s.icon));
 });
}
export function appendNextPremiumWardrobe(categories:WardrobeCategory[],equipped:WardrobeEquipped,scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS):WardrobeCategory[]{
 const owned=nextPremiumOwnedSets(scope,grant,pieces,ready);
 if(!owned.length)return categories;
 const rows=owned.flatMap<WardrobeRow>(s=>{
  const result:WardrobeRow[]=[
   {kind:'scene',id:s.background,name:s.backgroundName,group:'Ascendant',unlocked:true,equipped:equipped.scene===s.background},
   {kind:'frame',id:s.border,name:s.borderName,group:'Ascendant',unlocked:true,equipped:equipped.frame===s.border},
   {kind:'pet',id:s.pet,name:s.petName,group:'Ascendant',unlocked:true,equipped:equipped.pet===s.pet},
   {kind:'title',id:s.title,name:s.titleName,group:'Ascendant',unlocked:true,equipped:equipped.title===s.titleName},
  ];
  if(ready.iconArt&&has(pieces?.icons,s.icon))result.push({kind:'icon',id:s.icon,name:NEXT_PREMIUM_PRESTIGE.find(p=>p.id===s.id)!.iconName,group:'Ascendant',unlocked:true,equipped:equipped.icon===s.icon});
  return result;
 });
 return categories.map(c=>{
  const additions=rows.filter(r=>r.kind===c.kind&&!c.rows.some(old=>old.id===r.id));
  return additions.length?{...c,rows:[...c.rows,...additions],owned:c.owned+additions.length,total:c.total+additions.length}:c;
 });
}
/** Name presets resolve an exact, server-projected selected ID, never raw gradient colors. */
export function nextPremiumNameStyle(selected:unknown,scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS):PlayerNameStylePreference|undefined{
 if(!ready.namePresets)return undefined;
 const row=nextPremiumOwnedSets(scope,grant,pieces,ready).find(s=>s.nameStyle===selected&&has(pieces?.nameStyles,s.nameStyle));
 return row?{mode:'gradient',gradientColors:[...row.colors],animation:'flow'}:undefined;
}
/** Public rendering is independent of viewer ownership. allowed IDs must be the
 * viewed account's server-sanitized appearance marker, not its raw save or viewer grants. */
export type NextPremiumAppearance={background?:string|null;border?:string|null;pet?:string|null;effect?:string|null;verifiedTitleId?:string|null;displayedBadges:readonly string[]};
export function nextPremiumPublicShowcase(selection:NextPremiumAppearance,allowed:readonly string[],enabled=false){
 if(!enabled)return undefined;
 const row=NEXT_PREMIUM_SETS.find(s=>has(allowed,s.id)&&selection.background===s.background&&selection.border===s.border);
 if(!row||selection.effect&&selection.effect!==row.showcase)return undefined;
 const fullSet=selection.pet===row.pet&&selection.verifiedTitleId===row.title&&has(selection.displayedBadges,row.badge);
 return {id:row.id,fullSet};
}
export function nextPremiumReservedTitle(text:string|undefined){
 return NEXT_PREMIUM_SETS.find(s=>s.titleName.toLowerCase()===text?.trim().toLowerCase());
}
export function nextPremiumTitleAllowed(text:string|undefined,scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS){
 const row=nextPremiumReservedTitle(text);
 return !row||nextPremiumOwnedSets(scope,grant,pieces,ready).some(s=>s.id===row.id);
}

/** Badge selection is independently account-wide. Only verified owned rows appear. */
export function nextPremiumOwnedBadges(scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS){
 return nextPremiumOwnedSets(scope,grant,pieces,ready).map(s=>({id:s.badge,name:s.badgeName}));
}
export function nextPremiumOwnedNamePresets(scope:NextPremiumScope,grant:NextPremiumGrantSnapshot|undefined,pieces:NextPremiumOwnedPieces|undefined,ready:NextPremiumReadiness=NEXT_PREMIUM_REVIEW_READINESS){
 if(!ready.namePresets)return [];
 return nextPremiumOwnedSets(scope,grant,pieces,ready).filter(s=>has(pieces?.nameStyles,s.nameStyle)).map(s=>({
  id:s.nameStyle,name:NEXT_PREMIUM_PRESTIGE.find(p=>p.id===s.id)!.namePreset,colors:[...s.colors],
 }));
}

/** Filter candidate fields only. Other families remain the responsibility of the
 * existing public appearance sanitizer. Never add anything to viewer inventory. */
export function sanitizeNextPremiumAppearance(selection:NextPremiumAppearance,allowed:readonly string[],enabled=false):NextPremiumAppearance{
 const allowedRow=(id:string)=>enabled&&has(allowed,id);
 const background=NEXT_PREMIUM_SETS.find(s=>s.background===selection.background);
 const border=NEXT_PREMIUM_SETS.find(s=>s.border===selection.border);
 const pet=NEXT_PREMIUM_SETS.find(s=>s.pet===selection.pet);
 const title=NEXT_PREMIUM_SETS.find(s=>s.title===selection.verifiedTitleId);
 const effect=NEXT_PREMIUM_SETS.find(s=>s.showcase===selection.effect);
 return {...selection,
  background:background&&!allowedRow(background.id)?'asterfall-night':selection.background,
  border:border&&!allowedRow(border.id)?undefined:selection.border,
  pet:pet&&!allowedRow(pet.id)?undefined:selection.pet,
  verifiedTitleId:title&&!allowedRow(title.id)?undefined:selection.verifiedTitleId,
  effect:effect&&!allowedRow(effect.id)?undefined:selection.effect,
  displayedBadges:selection.displayedBadges.filter(id=>{
   const row=NEXT_PREMIUM_SETS.find(s=>s.badge===id);return !row||allowedRow(row.id);
  }),
 };
}
