import {EQUIPMENT_PIECES_V33,EQUIPMENT_SETS_V33} from './equipment-catalog-v33';
import {SKIN_REQUIRED_SLOTS_V33} from './equipment-types-v33';

export interface SkinProgressV33{setId:string;crafted:number;required:10;missingSlots:readonly string[];complete:boolean;unlocked:boolean;}

export function skinProgressV33(setId:string,craftedPieceIds:readonly string[],unlockedSkinSetIds:readonly string[]=[]):SkinProgressV33{
  const set=EQUIPMENT_SETS_V33.find(entry=>entry.id===setId);if(!set)throw new Error('unknown_set');
  const crafted=new Set(craftedPieceIds),pieces=EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===setId&&crafted.has(piece.id));
  const slots=new Set(pieces.map(piece=>piece.slot));
  const missingSlots=SKIN_REQUIRED_SLOTS_V33.filter(slot=>!slots.has(slot));
  return {setId,crafted:10-missingSlots.length,required:10,missingSlots,complete:missingSlots.length===0,unlocked:unlockedSkinSetIds.includes(setId)};
}
