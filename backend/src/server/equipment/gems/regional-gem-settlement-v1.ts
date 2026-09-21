import {gemPoolForSourceV1,type GemSourceKind} from './gem-acquisition-v1';

export type RegionalGemEncounterKindV1=Extract<GemSourceKind,'enemy'|'elite'|'regional_boss'>;
export interface VerifiedRegionalGemEncounterV1{
  accountId:string;
  receiptKey:string;
  zoneId:string;
  kind:RegionalGemEncounterKindV1;
  victory:boolean;
}
export interface RegionalGemSettlementResultV1{
  eligible:boolean;
  duplicate?:boolean;
  sourceId?:string;
  gemItemId?:string;
  pityTriggered?:boolean;
  recipeUnlockedId?:string;
  duplicateRecipeDust?:number;
  regionalCatalysts?:number;
}
export interface RegionalGemSettlementRpcV1{
  rpc<T>(name:string,args:Record<string,unknown>):Promise<T>;
}

export function regionalGemSourceForEncounterV1(zoneId:string,kind:RegionalGemEncounterKindV1):string|undefined{
  const pool=gemPoolForSourceV1(zoneId);
  if(!pool||!['enemy','elite','regional_boss'].includes(pool.kind)||pool.kind!==kind)return undefined;
  return pool.id;
}

/**
 * Settlement boundary for an already-verified regional combat receipt.
 * The caller owns combat verification; this layer never accepts client-authored
 * rolls, pity counters, recipe unlocks or reward bundles.
 */
export async function settleVerifiedRegionalGemEncounterV1(
  services:RegionalGemSettlementRpcV1,
  encounter:VerifiedRegionalGemEncounterV1,
):Promise<RegionalGemSettlementResultV1>{
  if(!encounter.victory)return {eligible:false};
  if(!/^[a-zA-Z0-9:_-]{8,160}$/.test(encounter.receiptKey))throw new Error('invalid_regional_gem_receipt');
  const sourceId=regionalGemSourceForEncounterV1(encounter.zoneId,encounter.kind);
  if(!sourceId)return {eligible:false};
  return services.rpc<RegionalGemSettlementResultV1>('settle_regional_gem_source_server_v1',{
    p_account_id:encounter.accountId,
    p_source_id:sourceId,
    p_receipt_key:encounter.receiptKey,
  });
}
