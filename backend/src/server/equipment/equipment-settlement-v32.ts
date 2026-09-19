import {EQUIPMENT_PIECES_V23,EQUIPMENT_SETS_V23} from './equipment-catalog-v23';
import {SKIN_REQUIRED_SLOTS} from './equipment-types-v22';
import type {CraftedRarityV26} from './equipment-craft-rarity-v26';

export interface CraftReceiptV32{characterId:string;pieceId:string;instanceId:string;rarity:CraftedRarityV26;completedAt:string;idempotencyKey:string;source:'craft'|'legacy_conversion'|'admin_repair'|'quest_grant'|'chase_recipe';}
export interface EquipmentRepositoryV32{
 hasMutationKey(key:string):Promise<boolean>;markMutationKey(key:string):Promise<void>;
 hasCraftReceipt(characterId:string,pieceId:string):Promise<boolean>;insertCraftReceipt(receipt:CraftReceiptV32):Promise<void>;listCraftedPieceIds(characterId:string):Promise<readonly string[]>;
 hasSkin(characterId:string,setId:string):Promise<boolean>;unlockSkin(characterId:string,setId:string,source:'equipment_set'):Promise<void>;
}
export interface SettlementResultV32{duplicate:boolean;firstCraft:boolean;skinUnlocked?:string;skinProgress:{setId:string;crafted:number;required:number;missingSlots:readonly string[];};}
export async function settleEquipmentCraftV32(repo:EquipmentRepositoryV32,receipt:CraftReceiptV32):Promise<SettlementResultV32>{
 const piece=EQUIPMENT_PIECES_V23.find(p=>p.id===receipt.pieceId);if(!piece)throw new Error('unknown_piece');
 if(await repo.hasMutationKey(receipt.idempotencyKey)){
  const crafted=await repo.listCraftedPieceIds(receipt.characterId);return {...skinProgress(piece.setId,crafted),duplicate:true,firstCraft:false};
 }
 const firstCraft=!(await repo.hasCraftReceipt(receipt.characterId,receipt.pieceId));if(firstCraft)await repo.insertCraftReceipt(receipt);await repo.markMutationKey(receipt.idempotencyKey);
 const crafted=await repo.listCraftedPieceIds(receipt.characterId);const progress=skinProgress(piece.setId,crafted);let skinUnlocked:string|undefined;
 if(progress.skinProgress.crafted===progress.skinProgress.required&&!(await repo.hasSkin(receipt.characterId,piece.setId))){await repo.unlockSkin(receipt.characterId,piece.setId,'equipment_set');skinUnlocked=piece.setId;}
 return {...progress,duplicate:false,firstCraft,skinUnlocked};
}
function skinProgress(setId:string,craftedIds:readonly string[]){
 const set=EQUIPMENT_SETS_V23.find(s=>s.id===setId);if(!set)throw new Error('unknown_set');const crafted=new Set(craftedIds);const pieces=EQUIPMENT_PIECES_V23.filter(p=>p.setId===setId&&p.requiredForSkin);const slots=new Set(pieces.filter(p=>crafted.has(p.id)).map(p=>p.slot));const missing=SKIN_REQUIRED_SLOTS.filter(s=>!slots.has(s));return {skinProgress:{setId,crafted:SKIN_REQUIRED_SLOTS.length-missing.length,required:SKIN_REQUIRED_SLOTS.length,missingSlots:missing}};
}
