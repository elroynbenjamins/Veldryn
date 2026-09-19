import {EQUIPMENT_PIECES_V22} from './equipment-catalog-v22';import {resolveCompletedSetSkinV22} from './equipment-skins-v22';
export interface CraftReceiptV22{characterId:string;pieceId:string;idempotencyKey:string;completedAt:string;}
export interface EquipmentRepositoryV22{hasCraftReceipt(characterId:string,pieceId:string):Promise<boolean>;insertCraftReceipt(v:CraftReceiptV22):Promise<void>;listCraftedPieceIds(characterId:string):Promise<readonly string[]>;hasSkin(characterId:string,skinId:string):Promise<boolean>;unlockSkin(characterId:string,skinId:string,source:'equipment_set'):Promise<void>;}
export async function settleCraftCompletionV22(repo:EquipmentRepositoryV22,receipt:CraftReceiptV22):Promise<{skinUnlocked?:string}>{
 const piece=EQUIPMENT_PIECES_V22.find(p=>p.id===receipt.pieceId);if(!piece)throw new Error('unknown_piece');
 if(!(await repo.hasCraftReceipt(receipt.characterId,receipt.pieceId)))await repo.insertCraftReceipt(receipt);
 const crafted=await repo.listCraftedPieceIds(receipt.characterId);const history=crafted.map((pieceId,i)=>({pieceId,characterId:receipt.characterId,craftedAt:String(i)}));
 if(resolveCompletedSetSkinV22(receipt.characterId,piece.setId,EQUIPMENT_PIECES_V22,history)&&!(await repo.hasSkin(receipt.characterId,piece.setId))){await repo.unlockSkin(receipt.characterId,piece.setId,'equipment_set');return {skinUnlocked:piece.setId};}
 return {};
}
