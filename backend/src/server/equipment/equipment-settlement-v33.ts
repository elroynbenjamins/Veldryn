import {EQUIPMENT_PIECES_V33} from './equipment-catalog-v33';
import {setProgressV33} from './equipment-set-progress-v33';
import {SET_PIECE_SLOTS_V33} from './equipment-types-v33';
export interface CraftHistoryV33{characterId:string;pieceId:string;}
export interface CraftReceiptV33{characterId:string;pieceId:string;instanceId:string;completedAt:string;idempotencyKey:string;}
export interface EquipmentRepositoryV33{hasMutationKey(key:string):Promise<boolean>;markMutationKey(key:string):Promise<void>;hasCraftReceipt(characterId:string,pieceId:string):Promise<boolean>;insertCraftReceipt(receipt:CraftReceiptV33):Promise<void>;listCraftedPieceIds(characterId:string):Promise<readonly string[]>;}
export interface SettlementResultV33{duplicate:boolean;firstCraft:boolean;setProgress:{setId:string;crafted:number;required:number;missingSlots:readonly string[];complete:boolean;}}

export async function settleEquipmentCraftV33(repo:EquipmentRepositoryV33,receipt:CraftReceiptV33):Promise<SettlementResultV33>{
  const piece=EQUIPMENT_PIECES_V33.find(entry=>entry.id===receipt.pieceId);if(!piece)throw new Error('unknown_piece');
  if(await repo.hasMutationKey(receipt.idempotencyKey))return {duplicate:true,firstCraft:false,setProgress:setProgressV33(piece.setId,await repo.listCraftedPieceIds(receipt.characterId))};
  const firstCraft=!(await repo.hasCraftReceipt(receipt.characterId,receipt.pieceId));
  if(firstCraft)await repo.insertCraftReceipt(receipt);
  await repo.markMutationKey(receipt.idempotencyKey);
  const progress=setProgressV33(piece.setId,await repo.listCraftedPieceIds(receipt.characterId));
  return {duplicate:false,firstCraft,setProgress:progress};
}
export function setCraftProgressV33(characterId:string,setId:string,history:readonly CraftHistoryV33[]){
 const crafted=new Set(history.filter(h=>h.characterId===characterId).map(h=>h.pieceId));
 const setPieces=EQUIPMENT_PIECES_V33.filter(p=>p.setId===setId); const slots=new Set(setPieces.filter(p=>crafted.has(p.id)).map(p=>p.slot));
 const missing=SET_PIECE_SLOTS_V33.filter(s=>!slots.has(s)); return {setId,crafted:10-missing.length,required:10,missingSlots:missing,complete:missing.length===0};
}
