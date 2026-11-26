import {ULTRA_LUXE_GRADIENTS,ultraLuxeGradient,type UltraLuxeGradientId} from '../core/ultra-luxe-name-gradients';
import {normalizeUltraLuxeNameSelection,ownedUltraLuxeNamePresets} from '../core/ultra-luxe-prestige';
import type {PlayerNameStylePreference} from '../core/player-name-style';
import type {VerifiedFullSetNames} from '../core/ultra-luxe-full-set-name';
declare const process:{env:Record<string,string|undefined>};
/** Presentation and self-RPC readback only, not server authority. */
export const sixLuxeNamesEnabled=typeof process!=='undefined'&&process.env.EXPO_PUBLIC_ULTRA_LUXE_FULL_SET==='true';
export function normalizeLuxeNameReadback(raw:unknown,accountId:string,allSix=sixLuxeNamesEnabled):VerifiedFullSetNames|undefined{
 if(!allSix)return normalizeUltraLuxeNameSelection(raw,accountId);
 if(!raw||typeof raw!=='object'||!accountId)return undefined;
 const row=raw as {accountId?:unknown;ownedIds?:unknown;selectedId?:unknown};
 if(row.accountId!==accountId||!Array.isArray(row.ownedIds))return undefined;
 const owned:unknown[]=row.ownedIds;
 const ids=ULTRA_LUXE_GRADIENTS.filter(p=>owned.includes(p.id)).map(p=>p.id);
 // A non-null unknown or unowned selection is malformed, never coerce it to
 // a valid compare-and-set expectation.
 if(row.selectedId!==null&&!ids.some(id=>id===row.selectedId))return undefined;
 return {accountId,ownedIds:ids,selectedId:ids.find(id=>id===row.selectedId)??null};
}
export function verifiedLuxeNameReadbackStyle(verified:VerifiedFullSetNames|undefined):PlayerNameStylePreference|undefined{
 const preset=verified?.selectedId&&verified.ownedIds.includes(verified.selectedId)?ultraLuxeGradient(verified.selectedId):undefined;
 return preset?{mode:'gradient',gradientColors:[...preset.colors],animation:'flow'}:undefined;
}
export function ownedLuxePickerPresets(ids:readonly string[],allSix=sixLuxeNamesEnabled){
 return allSix?ULTRA_LUXE_GRADIENTS.filter(p=>ids.includes(p.id)):ownedUltraLuxeNamePresets(ids);
}
export type {UltraLuxeGradientId};
