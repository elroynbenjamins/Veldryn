import raw from '../../../data/equipment_catalog_t1_t9_v33.json';
import type {EquipmentPieceV33,EquipmentSetV33,EquipmentSlotV33,EquipmentTierIdV33} from './equipment-types-v33';
const slot=(v:unknown)=>String(v) as EquipmentSlotV33;
export const EQUIPMENT_SETS_V33:readonly EquipmentSetV33[]=raw.sets.map((r:any)=>({
 id:r['Set ID'],tier:r.Tier as EquipmentTierIdV33,tierName:r['Tier Name'],region:r.Region,levelMin:Number(r['Level Min']),levelMax:Number(r['Level Max']),unlockLevel:Number(r['Set Unlock Level']),className:r.Class,role:r.Role,path:r.Path,name:r['Set Name'],focus:r['Build Focus'],primaryStat:r['Primary Stat'],secondaryStat:r['Secondary Stat'],tertiaryStat:r['Tertiary Stat'],collectibleBonus:r['Collectible Bonus'],thresholds:[
  {pieces:2,description:r['2pc Bonus v33']},{pieces:4,description:r['4pc Bonus v33']},{pieces:6,description:r['6pc Bonus v33']},{pieces:8,description:r['8pc Bonus v33']},{pieces:10,description:r['10pc Bonus v33']},
 ]
}));
export const EQUIPMENT_PIECES_V33:readonly EquipmentPieceV33[]=raw.pieces.map((r:any)=>({
 id:r['Piece ID'],setId:r['Set ID'],tier:r.Tier as EquipmentTierIdV33,className:r.Class,role:r.Role,path:r.Path,setName:r['Set Name'],slot:slot(r.Slot),name:r['Item Name'],requiredLevel:Number(r['Req Level']),countsForSetBonus:true,requiredForSkin:true,primaryStat:r['Primary Stat Emphasis'],secondaryStat:r['Secondary Stat Emphasis']
}));
export function validateCatalogV33():string[]{
 const e:string[]=[]; const ids=new Set<string>(); const setIds=new Set(EQUIPMENT_SETS_V33.map(s=>s.id));
 for(const p of EQUIPMENT_PIECES_V33){if(ids.has(p.id))e.push(`duplicate_piece:${p.id}`);ids.add(p.id);if(!setIds.has(p.setId))e.push(`unknown_set:${p.id}`);}
 for(const s of EQUIPMENT_SETS_V33){const ps=EQUIPMENT_PIECES_V33.filter(p=>p.setId===s.id);const slots=new Set(ps.map(p=>p.slot));if(ps.length!==10)e.push(`piece_count:${s.id}:${ps.length}`);for(const req of raw.slotOrder)if(!slots.has(req as EquipmentSlotV33))e.push(`missing_slot:${s.id}:${req}`);}
 return e;
}
