import {wardrobeAnimatedSetPiece,type WardrobeRow} from '../../core/profile-wardrobe';
import {PROFILE_COSMETIC_PORTRAITS} from '../../core/profile-cosmetic-icons';
import {PREMIUM_PROFILE_COSMETICS} from '../../core/profile-premium-cosmetics';
import {CELESTIAL_IDS} from '../../core/ascendant-cosmetics';
import {DRACONIC_IDS} from '../../core/draconic-showcase-layout';
import {PROFILE_COSMETIC_STORE_COLLECTIONS} from '../../content/profile-cosmetic-store';
import {WAVE2_SETS} from '../../core/profile-cosmetic-wave2';
import {isNewUltraLuxeWardrobePiece,NEW_ULTRA_LUXE_WARDROBE} from '../../core/ultra-luxe-owned-wardrobe';
import {isUltraLuxeIcon} from '../../core/ultra-luxe-prestige';

/** Visual grouping only: never add rows or infer ownership from artwork.
 * Matching portraits belong to the collection tier even though they are static. */
export function wardrobeVisualTier(row:Pick<WardrobeRow,'kind'|'id'|'clear'>):'standard'|'animated'|'premium'{
 if(row.clear||!row.id)return 'standard';
 const premium=PREMIUM_PROFILE_COSMETICS.some(set=>
  row.kind==='frame'?set.borderId===row.id:
  row.kind==='effect'?set.effectId===row.id:
  row.kind==='scene'?set.backgroundId===row.id:
  row.kind==='pet'?set.petId===row.id:false);
 const dedicated=[CELESTIAL_IDS,DRACONIC_IDS].some(ids=>
  row.kind==='frame'?ids.border===row.id:
  row.kind==='scene'?ids.background===row.id:
  row.kind==='pet'?ids.pet===row.id:false);
 if(premium||dedicated||isNewUltraLuxeWardrobePiece(row)||(row.kind==='icon'&&isUltraLuxeIcon(row.id)))return 'premium';
 if(wardrobeAnimatedSetPiece(row)||(row.kind==='icon'&&PROFILE_COSMETIC_PORTRAITS.some(icon=>icon.id===row.id)))return 'animated';
 return 'standard';
}
export function wardrobeVisualSections(rows:readonly WardrobeRow[]){
 const sections:{standard:WardrobeRow[];animated:WardrobeRow[];premium:WardrobeRow[]}={standard:[],animated:[],premium:[]};
 for(const row of rows)sections[wardrobeVisualTier(row)].push(row);
 return sections;
}

/** Stable, human-readable collection tags are derived from exact item IDs.
 * Never use fallback artwork IDs, prefixes on arbitrary user data, or ownership
 * to guess membership. Full names stay in accessibility and unlock details. */
const COMPACT_COLLECTION_NAMES:Readonly<Record<string,string>>={
 'Frostbound Chime':'Frostbound','Amberglass Loop':'Amberglass',
 'Clockwork Covenant':'Clockwork','Celestial Sovereign':'Celestial',
 'Draconic Dominion':'Draconic','Abyssal Majesty':'Abyssal','Paradox Eternal':'Paradox',
};
type SetLabelRow=Pick<WardrobeRow,'kind'|'id'|'name'|'clear'>;
export function wardrobeCollectionName(row:Pick<WardrobeRow,'kind'|'id'|'clear'>):string|undefined{
 if(row.clear||!row.id)return undefined;
 for(const set of PROFILE_COSMETIC_STORE_COLLECTIONS){
  if((row.kind==='frame'&&row.id===set.border.itemId)||(row.kind==='effect'&&row.id===set.effect.itemId)||(row.kind==='icon'&&set.portraits.some(p=>p.id===row.id)))return set.name;
 }
 for(const set of WAVE2_SETS){
  if((row.kind==='frame'&&row.id===set.borderId)||(row.kind==='effect'&&row.id===set.effectId)||(row.kind==='icon'&&set.iconIds.some(id=>id===row.id)))return set.name;
 }
 for(const set of PREMIUM_PROFILE_COSMETICS){
  if((row.kind==='frame'&&row.id===set.borderId)||(row.kind==='effect'&&row.id===set.effectId)||(row.kind==='scene'&&row.id===set.backgroundId)||(row.kind==='pet'&&row.id===set.petId))return set.name;
 }
 for(const [ids,name,icon,title] of [
  [CELESTIAL_IDS,'Celestial Sovereign','ascendant-celestial-crown-icon','ascendant-celestial-title'],
  [DRACONIC_IDS,'Draconic Dominion','ascendant-draconic-ruby-icon','ascendant-draconic-title'],
 ] as const){
  if((row.kind==='frame'&&row.id===ids.border)||(row.kind==='scene'&&row.id===ids.background)||(row.kind==='pet'&&row.id===ids.pet)||(row.kind==='icon'&&row.id===icon)||(row.kind==='title'&&row.id===title))return name;
 }
 const candidate=NEW_ULTRA_LUXE_WARDROBE.find(c=>row.kind==='frame'&&row.id===c.ids.border||row.kind==='scene'&&row.id===c.ids.background||row.kind==='pet'&&row.id===c.ids.pet||row.kind==='title'&&row.id===c.titleId);
 return candidate?.name;
}
export function wardrobeCollectionLabel(row:SetLabelRow){
 const collection=wardrobeCollectionName(row);
 if(!collection)return undefined;
 const short=COMPACT_COLLECTION_NAMES[collection]??collection;
 const prefixes=[collection,short,...(collection==='Clockwork Covenant'?['Covenant']:[])];
 let item=row.name;
 for(const prefix of prefixes){
  if(item.startsWith(prefix+' ')&&item.length>prefix.length+1){item=item.slice(prefix.length+1);break;}
 }
 return {collection,short,item,fullName:collection+' · '+item};
}
