/** Pure hidden EQ2 socket-ledger DTOs. Never import mobile GameState or
 * grant any gem/equipment: server-only validation and replay shapes.
 */
export type V2GemSocketKind='stat'|'effect';
export interface V2GemInstalled{gemId:string;rollPercent:number}
export interface V2GemCopySockets {
 instanceId:string;
 stat?:V2GemInstalled;
 effect?:V2GemInstalled;
}
export interface V2GemReceipt {
 requestId:string;fingerprint:string;instanceId:string;
 socket:V2GemSocketKind;gemId:string;
 source:'gem_pouch'|'inventory'|'bank';
 rollPercent:number;burnedGemId:string|null;version:number;
}
export interface V2GemSidecarState{
 slots:V2GemCopySockets[];
 receipts:V2GemReceipt[];
}
