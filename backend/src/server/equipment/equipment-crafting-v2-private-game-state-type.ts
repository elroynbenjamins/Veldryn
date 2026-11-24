import type {GameState as MobileGameState} from '../../../../apps/mobile/src/core/types';
/** Cross-project QA snapshot only. The public Mobile GameState type stays
 * unchanged; hidden ledger data is opaque until the existing server readers
 * validate its schema, claims and custody. This is not a persistence route. */
export type V2PrivateGameState=Omit<MobileGameState,'account'>&{
 account:MobileGameState['account']&{equipmentV2Hidden?:unknown};
};
