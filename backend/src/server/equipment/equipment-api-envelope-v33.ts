import {envelope,type ApiEnvelope} from '../api/contracts';
import {dispatchEquipmentApiV33,type EquipmentApiRequestV33} from './equipment-api-contract-v33';

export function dispatchEquipmentApiEnvelopeV33(requestId:string,contentVersion:string,request:EquipmentApiRequestV33,serverTime?:string):ApiEnvelope<ReturnType<typeof dispatchEquipmentApiV33>>{
  return envelope(requestId,contentVersion,dispatchEquipmentApiV33(request),serverTime);
}
