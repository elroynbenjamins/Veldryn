import {ULTRA_LUXE_GRADIENTS} from './ultra-luxe-name-gradients';
import type {GameState} from './types';
import type {PlayerNameStylePreference} from './player-name-style';

/** These assets are private, cosmetic-only account grants. A crest is not a badge. */
export const ULTRA_LUXE_ICONS=[
 {id:'ascendant-celestial-crown-icon',name:'Crown of the Cosmos'},
 {id:'ascendant-draconic-ruby-icon',name:'Crest of Eternal Embers'},
] as const;
export function isUltraLuxeIcon(id:string){return ULTRA_LUXE_ICONS.some(row=>row.id===id);}
export function ownedUltraLuxeIcons(state:GameState){
 const owned=new Set(state.account.unlockedProfileIconIds??[]);
 return ULTRA_LUXE_ICONS.filter(row=>owned.has(row.id));
}

/** Preset identity is separate from color stops. Supporters may choose similar ordinary
 * colors, but only an authoritative private grant can confer the preset ID. */
export const ULTRA_LUXE_NAME_PRESETS=[
 ULTRA_LUXE_GRADIENTS[0],
 ULTRA_LUXE_GRADIENTS[1],
] as const;
export type UltraLuxeNamePresetId=typeof ULTRA_LUXE_NAME_PRESETS[number]['id'];
export function ownedUltraLuxeNamePresets(verifiedOwnedIds:readonly string[]|undefined){
 const owned=new Set(verifiedOwnedIds??[]);
 return ULTRA_LUXE_NAME_PRESETS.filter(row=>owned.has(row.id));
}
export function ultraLuxeNamePresetStyle(id:unknown):PlayerNameStylePreference|undefined{
 const preset=ULTRA_LUXE_NAME_PRESETS.find(row=>row.id===id);
 return preset?{mode:'gradient',gradientColors:[...preset.colors],animation:'flow'}:undefined;
}
/** Resolve only the selected ID in a verified server projection. Never infer prestige from raw colors. */
export function verifiedUltraLuxeNameStyle(selectedId:unknown,verifiedOwnedIds:readonly string[]|undefined){
 return typeof selectedId==='string'&&verifiedOwnedIds?.includes(selectedId)?ultraLuxeNamePresetStyle(selectedId):undefined;
}

/** Account-scoped server readback. Unknown IDs and cross-account payloads fail closed. */
export function normalizeUltraLuxeNameSelection(raw:unknown,accountId:string){
 if(!raw||typeof raw!=='object'||!accountId)return undefined;
 const row=raw as {accountId?:unknown;ownedIds?:unknown;selectedId?:unknown};
 if(row.accountId!==accountId||!Array.isArray(row.ownedIds))return undefined;
 const ownedIds=ownedUltraLuxeNamePresets(row.ownedIds.filter((id):id is string=>typeof id==='string')).map(p=>p.id);
 const selectedId=ownedIds.find(id=>id===row.selectedId)??null;
 return {accountId,ownedIds,selectedId};
}
