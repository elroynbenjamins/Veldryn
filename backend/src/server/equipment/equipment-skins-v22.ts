import {SKIN_REQUIRED_SLOTS,type EquipmentPieceV22,type EquipmentSlot} from './equipment-types-v22';
export interface CraftedHistoryV22{pieceId:string;characterId:string;craftedAt:string;}
export function resolveCompletedSetSkinV22(characterId:string,setId:string,pieces:readonly EquipmentPieceV22[],history:readonly CraftedHistoryV22[]):boolean{const setPieces=pieces.filter(p=>p.setId===setId&&p.requiredForSkin);const crafted=new Set(history.filter(h=>h.characterId===characterId).map(h=>h.pieceId));const slots=new Set<EquipmentSlot>();for(const p of setPieces)if(crafted.has(p.id))slots.add(p.slot);return SKIN_REQUIRED_SLOTS.every(s=>slots.has(s));}
export const EVENT_SKINS_V22={tierless:true,providesEquipmentStats:false,providesSetBonuses:false,characterBound:true} as const;
