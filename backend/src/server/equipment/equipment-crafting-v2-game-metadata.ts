import type {V2DraftItem,V2DraftJob,V2DraftReceipt,V2DraftSkillAward} from './equipment-crafting-v2-transaction';
import type {V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import type {V2GemSidecarState} from './equipment-crafting-v2-gem-sidecar-types';
import type {V2VirtualMoveReceipt} from './equipment-crafting-v2-virtual-history';

/** Server-owned, hidden account-ledger schema. Not a client payload or grant. */
export interface V2HiddenGameMetadata{
 schemaVersion:'eq2-hidden-game-state-v1';
 jobs:V2DraftJob[];
 items:V2DraftItem[];
 receipts:V2DraftReceipt[];
 skillAwards:V2DraftSkillAward[];
 /** Optional for older hidden V1 snapshots; no public EQ2 storage is modified. */
 storageReservations?:V2HiddenStorageReservation[];
 /** Separate irreversible socket history; never rewrites the minted exact item. */
 gemSocketState?:V2GemSidecarState;
 /** Replayed account-wide Bank/equip custody decisions; still hidden only. */
 custodyReceipts?:V2VirtualMoveReceipt[];
}
