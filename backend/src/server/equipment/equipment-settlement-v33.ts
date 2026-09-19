import {EQUIPMENT_PIECES_V33} from './equipment-catalog-v33';
import {skinProgressV33} from './equipment-skin-progress-v33';
import {SKIN_REQUIRED_SLOTS_V33} from './equipment-types-v33';
export interface CraftHistoryV33{characterId:string;pieceId:string;}
export interface CraftReceiptV33{characterId:string;pieceId:string;instanceId:string;completedAt:string;idempotencyKey:string;}
export interface EquipmentRepositoryV33{hasMutationKey(key:string):Promise<boolean>;markMutationKey(key:string):Promise<void>;hasCraftReceipt(characterId:string,pieceId:string):Promise<boolean>;insertCraftReceipt(receipt:CraftReceiptV33):Promise<void>;listCraftedPieceIds(characterId:string):Promise<readonly string[]>;hasSkin(characterId:string,setId:string):Promise<boolean>;unlockSkin(characterId:string,setId:string):Promise<void>;}
export interface SettlementResultV33{duplicate:boolean;firstCraft:boolean;skinUnlocked?:string;skinProgress:{setId:string;crafted:number;required:number;missingSlots:readonly string[];complete:boolean;}}

export async function settleEquipmentCraftV33(repo:EquipmentRepositoryV33,receipt:CraftReceiptV33):Promise<SettlementResultV33>{
  const piece=EQUIPMENT_PIECES_V33.find(entry=>entry.id===receipt.pieceId);if(!piece)throw new Error('unknown_piece');
  if(await repo.hasMutationKey(receipt.idempotencyKey))return {duplicate:true,firstCraft:false,skinProgress:skinProgressV33(piece.setId,await repo.listCraftedPieceIds(receipt.characterId))};
  const firstCraft=!(await repo.hasCraftReceipt(receipt.characterId,receipt.pieceId));
  if(firstCraft)await repo.insertCraftReceipt(receipt);
  await repo.markMutationKey(receipt.idempotencyKey);
  const progress=skinProgressV33(piece.setId,await repo.listCraftedPieceIds(receipt.characterId));
  let skinUnlocked:string|undefined;
  if(progress.complete&&!(await repo.hasSkin(receipt.characterId,piece.setId))){await repo.unlockSkin(receipt.characterId,piece.setId);skinUnlocked=piece.setId;}
  return {duplicate:false,firstCraft,skinProgress:progress,skinUnlocked};
}
export function setSkinProgressV33(characterId:string,setId:string,history:readonly CraftHistoryV33[]){
 const crafted=new Set(history.filter(h=>h.characterId===characterId).map(h=>h.pieceId));
 const setPieces=EQUIPMENT_PIECES_V33.filter(p=>p.setId===setId); const slots=new Set(setPieces.filter(p=>crafted.has(p.id)).map(p=>p.slot));
 const missing=SKIN_REQUIRED_SLOTS_V33.filter(s=>!slots.has(s)); return {setId,crafted:10-missing.length,required:10,missingSlots:missing,complete:missing.length===0};
}
