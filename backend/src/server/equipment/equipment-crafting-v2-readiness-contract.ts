/**
 * Hidden Equipment 2.0: transport-only, empty-queue rehearsal projection.
 *
 * No executable server dependencies, RNG, node:crypto, item issuer, or writes.
 * The mobile readiness screen needs only this safe shape to describe whether
 * an authenticated live snapshot could later be converted by a PRIVATE
 * server adapter. It is NOT a request schema or an authority to craft.
 *
 * Keep this type structurally compatible with V2DraftSnapshot; the Node-only
 * hidden contract test enforces that relationship.
 */
export interface V2ReadinessCharacter {
 level:number;
 professionLevels:Record<'smithing'|'tailoring',number>;
 gold:number;
 inventory:Record<string,number>;
}
export interface V2ReadinessSnapshot {
 accountId:string;
 activeCharacterId:string;
 version:number;
 forgeSlotCapacity:number;
 characters:Record<string,V2ReadinessCharacter>;
 bank:Record<string,number>;
 // Deliberately empty: live V33 Forge work, receipts and exact copies may
 // never be silently converted into new Equipment 2.0 records.
 jobs:[];
 equipment:[];
 skillAwards:[];
 receipts:[];
}
