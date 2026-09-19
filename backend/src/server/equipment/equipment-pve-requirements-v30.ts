import recipes from '../../../data/equipment_exact_recipes_v30.json';
import {COMBAT_SOURCES_V30,TOKEN_SOURCES_V30} from './equipment-pve-rewards-v30';

export interface PveRequirementV30 {
  sourceId:string;
  qty:number;
}
export interface DungeonRequirementV30 {
  tokenId:string;
  qty:number;
  expectedClears:number;
}
export interface ExactPveRecipeV30 {
  pieceId:string;
  requiredLevel:number;
  regionalCombatRequirement:PveRequirementV30|null;
  dungeonBossRequirement:DungeonRequirementV30|null;
  frozenHeartRequirement:number;
}

const rows=recipes.recipes as unknown as ExactPveRecipeV30[];
export const PVE_REQUIREMENTS_BY_PIECE_V30:Readonly<Record<string,ExactPveRecipeV30>>=
  Object.fromEntries(rows.map(r=>[r.pieceId,r]));

export function pveRequirementsForPieceV30(pieceId:string){
  const r=PVE_REQUIREMENTS_BY_PIECE_V30[pieceId];
  if(!r)throw new Error(`unknown_equipment_piece:${pieceId}`);
  if(r.regionalCombatRequirement && !COMBAT_SOURCES_V30[r.regionalCombatRequirement.sourceId])
    throw new Error(`unknown_combat_source_for_piece:${pieceId}`);
  if(r.dungeonBossRequirement && !TOKEN_SOURCES_V30[r.dungeonBossRequirement.tokenId])
    throw new Error(`unknown_token_source_for_piece:${pieceId}`);
  if(r.frozenHeartRequirement>0 && r.requiredLevel<70)
    throw new Error(`frozen_heart_before_70:${pieceId}`);
  return r;
}

export function validateExactPveCatalogV30(){
  if(rows.length!==1701)throw new Error(`expected_1701_pve_recipes_got_${rows.length}`);
  for(const r of rows)pveRequirementsForPieceV30(r.pieceId);
  return true;
}
