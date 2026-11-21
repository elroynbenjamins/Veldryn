/**
 * V88 — HIDDEN / NOT MOUNTED. One source of truth, one payment transaction.
 *
 * Combines V87's independently certified V61 DB proof with V86's physical
 * guaranteed reward writes in a single V70 SQL connection. Source and credit
 * methods receive the SAME tx from createChestPostgresStoreV70. This never
 * builds a new pool, transaction, public route or service-role RPC.
 *
 * V23 worker replay alone is intentionally insufficient, V87 certificates
 * need a separately audited server producer, and EQ2 gear hits stay blocked.
 */
import type {ChestPhysicalPortsV70} from '../loot/chest-postgres-store-v70';
import {
 createPartyEventCanonicalSourcePortsV87,
} from './weekly-party-event-canonical-pg-v87';
import {
 createPartyEventRealRewardPortsV86,
} from './weekly-party-event-real-reward-ports-v86';

export const PARTY_EVENT_ATOMIC_PORTS_V88_RELEASED=false;
export const PARTY_EVENT_ATOMIC_PORTS_V88_VERSION='party-event-atomic-ports-v88' as const;

export type PartyEventAtomicPortsV88=Pick<ChestPhysicalPortsV70,
 'readCanonicalSource'|'creditGuaranteed'|'grantDrop'|'grantInbox'|'verifyPhysical'>;

/**
 * This is a composition seam for isolated QA only. The V70 adapter still
 * requires independently audited readAccountOwnedDrops, isOwnedCharacter,
 * readApprovedEquipmentContext and a service-authenticated owner.
 */
export function createPartyEventAtomicPortsV88(qaEnabled=false):
 PartyEventAtomicPortsV88{
 if(!qaEnabled||PARTY_EVENT_ATOMIC_PORTS_V88_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v88_unreleased');
 return {
  ...createPartyEventCanonicalSourcePortsV87(qaEnabled),
  ...createPartyEventRealRewardPortsV86(qaEnabled),
 };
}
