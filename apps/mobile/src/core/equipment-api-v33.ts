import type {EquipmentSetDef} from '../content/equipment-sets';
import type {GearSlot} from './types';

export interface EquipmentPiecePayloadV33{id:string;setId:string;slot:GearSlot;name:string;requiredLevel:number;crafted?:boolean;}
export interface EquipmentSetPayloadV33{set:EquipmentSetDef;pieces:readonly EquipmentPiecePayloadV33[];slotOrder:readonly string[];setThresholds:readonly number[];skinRule:string;}
export interface EquipmentApiEnvelopeV33<T>{requestId:string;serverTime:string;contentVersion:string;data:T;}

export function equipmentSetPayloadV33(value:unknown):EquipmentSetPayloadV33{
  const payload=value as Partial<EquipmentSetPayloadV33>;
  if(!payload||typeof payload!=='object'||!payload.set||!Array.isArray(payload.pieces)||!Array.isArray(payload.slotOrder)||!Array.isArray(payload.setThresholds))throw new Error('Invalid v33 equipment set payload');
  if(payload.pieces.length!==10||payload.slotOrder.length!==10||payload.setThresholds.join(',')!=='2,4,6,8,10')throw new Error('Invalid v33 equipment set shape');
  return payload as EquipmentSetPayloadV33;
}

export function unwrapEquipmentSetPayloadV33(value:unknown):EquipmentSetPayloadV33{
  const envelope=value as Partial<EquipmentApiEnvelopeV33<unknown>>;
  return equipmentSetPayloadV33(envelope?.data);
}
