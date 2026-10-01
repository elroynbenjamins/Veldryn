import {EQUIPMENT_PIECES_V22} from './equipment-catalog-v22';
export interface CraftReceiptV22{characterId:string;pieceId:string;idempotencyKey:string;completedAt:string;}
export interface EquipmentRepositoryV22{hasCraftReceipt(characterId:string,pieceId:string):Promise<boolean>;insertCraftReceipt(v:CraftReceiptV22):Promise<void>;listCraftedPieceIds(characterId:string):Promise<readonly string[]>;}
export async function settleCraftCompletionV22(repo:EquipmentRepositoryV22,receipt:CraftReceiptV22):Promise<{firstCraft:boolean}>{
 if(!EQUIPMENT_PIECES_V22.some(p=>p.id===receipt.pieceId))throw new Error('unknown_piece');
 const firstCraft=!(await repo.hasCraftReceipt(receipt.characterId,receipt.pieceId));
 if(firstCraft)await repo.insertCraftReceipt(receipt);
 return {firstCraft};
}
