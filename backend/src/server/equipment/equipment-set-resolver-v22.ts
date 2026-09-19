import {ARMOR_SET_SLOTS,type ActiveSetBonusV22,type EquippedPieceV22,type EquipmentSetV22} from './equipment-types-v22';
export function resolveSetBonusesV22(equipped:readonly EquippedPieceV22[],defs:readonly EquipmentSetV22[]):ActiveSetBonusV22[]{
  const map=new Map<string,Set<string>>();
  for(const p of equipped){if(!ARMOR_SET_SLOTS.includes(p.slot))continue;const slots=map.get(p.setId)??new Set<string>();slots.add(p.slot);map.set(p.setId,slots);}
  const byId=new Map(defs.map(d=>[d.id,d] as const));
  const out:ActiveSetBonusV22[]=[];
  for(const [setId,slots] of map){const d=byId.get(setId);if(!d)continue;const thresholds=d.thresholds.filter(t=>slots.size>=t.pieces);if(thresholds.length)out.push({setId,pieceCount:slots.size,thresholds});}
  return out.sort((a,b)=>a.setId.localeCompare(b.setId));
}
