import catalog from '../../../data/equipment_catalog_t1_t9_v33.json';
import recipes from '../../../data/equipment_exact_recipes_v33.json';
import { EQUIPMENT_PIECES_V33, EQUIPMENT_SETS_V33 } from './equipment-catalog-v33';
import { resolveSetBonusesV33 } from './equipment-set-resolver-v33';
import type { EquippedPieceV33 } from './equipment-types-v33';

type V33Recipe = (typeof recipes.recipes)[number];

export function equipmentSetDetailPayloadV33(setId:string,craftedPieceIds:readonly string[]){
  const set=EQUIPMENT_SETS_V33.find(entry=>entry.id===setId);
  if(!set)throw new Error('unknown_set');
  const crafted=new Set(craftedPieceIds);
  const pieces=EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===setId).map(piece=>({...piece,crafted:crafted.has(piece.id)}));
  return {set,pieces,slotOrder:catalog.slotOrder,setThresholds:catalog.setThresholds,skinRule:'Craft all 10 distinct pieces once on this character.'};
}

export function craftingScreenPayloadV33(pieceId:string){
  const piece=EQUIPMENT_PIECES_V33.find(entry=>entry.id===pieceId);
  if(!piece)throw new Error('unknown_piece');
  const recipe=recipes.recipes.find(entry=>entry.pieceId===pieceId) as V33Recipe|undefined;
  if(!recipe)throw new Error('missing_recipe');
  return {piece,recipe,visualStatus:'Not Started',freshGeneratedArtOnly:true};
}

export function equipmentLoadoutPayloadV33(equipped:readonly EquippedPieceV33[]){
  const activeSets=resolveSetBonusesV33(equipped,EQUIPMENT_SETS_V33);
  return {slotOrder:catalog.slotOrder,equipped,activeSets,setThresholds:catalog.setThresholds};
}
