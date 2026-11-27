import {FullSetCommandError,type FullSetCommandServices} from './ultra-luxe-full-set-command';
import {ULTRA_LUXE_UNDO_COMMAND,isFullSetEquipReceipt} from '../../apps/mobile/src/core/ultra-luxe-full-set-undo-command';
const object=(v:unknown):Record<string,unknown>|undefined=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:undefined;
const exactKeys=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
/** Authenticated server route; SQL reads the trusted pre-image and current save
 * inside one lock. Neither client nor Edge supplies old appearance or wallet. */
export async function executeUltraLuxeUndoCommand(services:FullSetCommandServices,accountId:string,raw:unknown){
 if(!services.enabled)throw new FullSetCommandError('feature_not_released',403);
 if(!accountId)throw new FullSetCommandError('auth_required',401);
 const body=object(raw),cmd=object(body?.command),a=object(cmd?.args);
 if(!body||!cmd||!a||!exactKeys(body,['requestId','expectedVersion','command'])||
  !exactKeys(cmd,['type','args'])||!exactKeys(a,['characterId','equipRequestId'])||
  cmd.type!==ULTRA_LUXE_UNDO_COMMAND||typeof body.requestId!=='string'||!/^luxe_undo_set_[A-Za-z0-9_-]{16,80}$/.test(body.requestId)||
  typeof body.expectedVersion!=='number'||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0||
  typeof a.characterId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.characterId)||
  !isFullSetEquipReceipt(a.equipRequestId))throw new FullSetCommandError('invalid_full_set_undo_request');
 const requestHash=await services.hash(JSON.stringify([ULTRA_LUXE_UNDO_COMMAND,body.expectedVersion,a.characterId,a.equipRequestId]));
 const result=object(await services.rpc('undo_ultra_luxe_full_set_server_v1',{
  p_account_id:accountId,p_character_id:a.characterId,p_equip_request_id:a.equipRequestId,
  p_expected_version:body.expectedVersion,p_request_id:body.requestId,p_request_hash:requestHash,
 }));
 const gameplay=object(result?.gameplay),names=object(result?.nameSelection);
 if(!result||!gameplay||!names||names.accountId!==accountId||
  (gameplay.accountId!==undefined&&gameplay.accountId!==accountId)||typeof result.replayed!=='boolean'||
  !Number.isSafeInteger(gameplay.version)||!object(gameplay.state))throw new FullSetCommandError('full_set_undo_readback_invalid',503);
 return {replayed:result.replayed,gameplay:{...gameplay,accountId},nameSelection:names};
}
