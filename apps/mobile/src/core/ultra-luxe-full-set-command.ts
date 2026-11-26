/** Dedicated combined-equipment command contract. No client-supplied state, colors,
 * account ID, gold, arbitrary wardrobe patch or service credentials. */
import {ultraLuxeFullSetNamePreset,type FullSetPlan} from './ultra-luxe-full-set-name';
import type {GameCommand} from './game-commands';
export const ULTRA_LUXE_FULL_SET_COMMAND='ultra_luxe_full_set';
export const ULTRA_LUXE_REQUEST_PREFIX='luxe_full_set_';
export function canonicalUltraLuxeCollection(id:unknown){
 if(typeof id!=='string'||!ultraLuxeFullSetNamePreset(id))return undefined;
 return id.startsWith('ascendant-')?id:'ascendant-'+id;
}
export function ultraLuxeFullSetCommand(plan:FullSetPlan):GameCommand{
 const collectionId=canonicalUltraLuxeCollection(plan.setId);
 if(!collectionId||!plan.scope.characterId||!plan.scope.accountId)throw Error('invalid_full_set_plan');
 return {type:ULTRA_LUXE_FULL_SET_COMMAND,args:{collectionId,characterId:plan.scope.characterId,expectedNameId:plan.before.namePresetId}};
}
export function fullSetRequestId(key:string){
 if(!/^[A-Za-z0-9_-]{16,80}$/.test(key))throw Error('invalid_full_set_request_key');
 return ULTRA_LUXE_REQUEST_PREFIX+key;
}
