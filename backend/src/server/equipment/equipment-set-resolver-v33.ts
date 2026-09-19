import {EQUIPMENT_SLOT_ORDER_V33,type ActiveSetBonusV33,type EquippedPieceV33,type EquipmentSetV33} from './equipment-types-v33';
export function resolveSetBonusesV33(equipped:readonly EquippedPieceV33[],defs:readonly EquipmentSetV33[]):ActiveSetBonusV33[]{
 const bySet=new Map<string,Set<string>>();
 for(const p of equipped){if(!EQUIPMENT_SLOT_ORDER_V33.includes(p.slot))continue;const slots=bySet.get(p.setId)??new Set<string>();slots.add(p.slot);bySet.set(p.setId,slots);}
 const byId=new Map(defs.map(d=>[d.id,d] as const)); const out:ActiveSetBonusV33[]=[];
 for(const [setId,slots] of bySet){const d=byId.get(setId);if(!d)continue;const thresholds=d.thresholds.filter(t=>slots.size>=t.pieces);if(thresholds.length)out.push({setId,pieceCount:slots.size,thresholds});}
 return out.sort((a,b)=>a.setId.localeCompare(b.setId));
}
