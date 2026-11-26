import type {GameCommand} from './game-commands';
import type {FullSetScope} from './ultra-luxe-full-set-name';
export const ULTRA_LUXE_UNDO_COMMAND='ultra_luxe_full_set_undo';
export const ULTRA_LUXE_UNDO_PREFIX='luxe_undo_set_';
export function isFullSetEquipReceipt(id:unknown):id is string{
 return typeof id==='string'&&/^luxe_full_set_[A-Za-z0-9_-]{16,80}$/.test(id);
}
export function fullSetUndoRequestId(key:string){
 if(!/^[A-Za-z0-9_-]{16,80}$/.test(key))throw Error('invalid_full_set_undo_key');
 return ULTRA_LUXE_UNDO_PREFIX+key;
}
export function fullSetUndoCommand(scope:FullSetScope,equipRequestId:string):GameCommand{
 if(!scope.accountId||!scope.characterId||!isFullSetEquipReceipt(equipRequestId))throw Error('invalid_full_set_undo');
 return {type:ULTRA_LUXE_UNDO_COMMAND,args:{characterId:scope.characterId,equipRequestId}};
}
