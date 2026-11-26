import {wardrobeAnimatedSetPiece,type WardrobeRow} from '../../core/profile-wardrobe';
import {PROFILE_COSMETIC_PORTRAITS} from '../../core/profile-cosmetic-icons';
import {PREMIUM_PROFILE_COSMETICS} from '../../core/profile-premium-cosmetics';
import {CELESTIAL_IDS} from '../../core/ascendant-cosmetics';
import {DRACONIC_IDS} from '../../core/draconic-showcase-layout';
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
 if(premium||dedicated||(row.kind==='icon'&&isUltraLuxeIcon(row.id)))return 'premium';
 if(wardrobeAnimatedSetPiece(row)||(row.kind==='icon'&&PROFILE_COSMETIC_PORTRAITS.some(icon=>icon.id===row.id)))return 'animated';
 return 'standard';
}
export function wardrobeVisualSections(rows:readonly WardrobeRow[]){
 const sections:{standard:WardrobeRow[];animated:WardrobeRow[];premium:WardrobeRow[]}={standard:[],animated:[],premium:[]};
 for(const row of rows)sections[wardrobeVisualTier(row)].push(row);
 return sections;
}
