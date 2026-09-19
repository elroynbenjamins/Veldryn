import exactCatalog from '../../../data/equipment_exact_recipes_v27.json';
import componentCatalog from '../../../data/equipment_components_v27.json';
import { processingDefinitionV26 } from './equipment-processing-v26';

export type EquipmentCraftSkillIdV27 = 'SKL_012'|'SKL_015';
export type SupportingSkillIdV27 = 'SKL_008'|'SKL_012'|'SKL_014'|'SKL_015'|'SKL_016';
export type SkillLevelsV27 = Readonly<Record<string, number>>;
export type InventoryV27 = Readonly<Record<string, number>>;

export interface ExactRecipeComponentV27 {
  componentId?: string;
  name?: string;
  qty: number;
  skillId?: string;
  skillLevel?: number;
  canonicalResource?: string;
  processedOutput?: string;
  resourceName?: string;
  monsterComponent?: boolean;
  dungeonBossComponent?: boolean;
  contentSource?: string;
}
export interface ExactPieceRecipeV27 {
  pieceId:string; setId:string; tier:string; className:string; path:string; slot:string; itemName:string;
  requiredLevel:number;
  finalAssembly:{skill:string;skillId:EquipmentCraftSkillIdV27;level:number;craftMinutes:number};
  components:readonly ExactRecipeComponentV27[];
  unlockSource:string; craftedRarityRoll:boolean; upgradeRankSupported:boolean; statGemSupported:boolean; effectGemSupported:boolean;
}
export interface CompositeComponentInputV27 {
  canonicalResource:string; processedOutput:string; qty:number; inputProcessingSkillId:string; inputProcessingSkillLevel:number; rawQtyPerProcessed:number;
}
export interface CompositeComponentV27 {
  componentId:string;tier:string;name:string;craftSkill:string;craftSkillId:SupportingSkillIdV27;skillLevel:number;
  inputs:readonly CompositeComponentInputV27[];outputQty:number;baseTimeSec:number;purpose:string;
}

const recipes = (exactCatalog.recipes as readonly ExactPieceRecipeV27[]);
const components = (componentCatalog.components as readonly CompositeComponentV27[]);
const byPiece = new Map(recipes.map(r=>[r.pieceId,r] as const));
const byComponent = new Map(components.map(c=>[c.componentId,c] as const));

export const EXACT_PIECE_RECIPES_V27 = recipes;
export const COMPOSITE_COMPONENTS_V27 = components;
export function exactRecipeV27(pieceId:string){return byPiece.get(pieceId);}
export function compositeComponentV27(componentId:string){return byComponent.get(componentId);}

function addQty(target:Record<string,number>, key:string, qty:number){target[key]=(target[key]??0)+qty;}

/** Inventory keys used by final assembly. Component IDs are stored as their componentId.
 * Processed inputs use PROCESSING_DEFINITIONS_V26.processedKey. Required boss resources use the canonical resource key. */
export function finalInventoryRequirementsV27(pieceId:string):Readonly<Record<string,number>>{
  const recipe=byPiece.get(pieceId); if(!recipe) throw new Error(`unknown_piece:${pieceId}`);
  const req:Record<string,number>={};
  for(const c of recipe.components){
    if(c.componentId){addQty(req,c.componentId,c.qty);continue;}
    if(c.canonicalResource){
      if(c.dungeonBossComponent){addQty(req,c.canonicalResource,c.qty);continue;}
      const def=processingDefinitionV26(c.canonicalResource);
      if(!def) throw new Error(`missing_processing_definition:${c.canonicalResource}`);
      addQty(req,def.processedKey,c.qty);
    }
  }
  return req;
}

export function componentInventoryRequirementsV27(componentId:string):Readonly<Record<string,number>>{
  const component=byComponent.get(componentId); if(!component) throw new Error(`unknown_component:${componentId}`);
  const req:Record<string,number>={};
  for(const input of component.inputs){
    const def=processingDefinitionV26(input.canonicalResource);
    if(!def) throw new Error(`missing_processing_definition:${input.canonicalResource}`);
    addQty(req,def.processedKey,input.qty);
  }
  return req;
}

export interface CraftGateResultV27 {ok:boolean;errors:readonly string[];requirements:Readonly<Record<string,number>>;}
function inventoryErrors(req:Readonly<Record<string,number>>, inv:InventoryV27){
  const errors:string[]=[];
  for(const [key,qty] of Object.entries(req)) if((inv[key]??0)<qty) errors.push(`missing:${key}:${qty-(inv[key]??0)}`);
  return errors;
}

/** Final assembly checks only the primary assembly skill plus already-crafted inputs.
 * Supporting profession levels are enforced when each intermediate component is crafted. */
export function canStartExactPieceCraftV27(pieceId:string,skillLevels:SkillLevelsV27,inventory:InventoryV27):CraftGateResultV27{
  const recipe=byPiece.get(pieceId); if(!recipe) return {ok:false,errors:[`unknown_piece:${pieceId}`],requirements:{}};
  const requirements=finalInventoryRequirementsV27(pieceId);
  const errors:string[]=[];
  const level=skillLevels[recipe.finalAssembly.skillId]??0;
  if(level<recipe.finalAssembly.level) errors.push(`skill:${recipe.finalAssembly.skillId}:${recipe.finalAssembly.level}`);
  errors.push(...inventoryErrors(requirements,inventory));
  return {ok:errors.length===0,errors,requirements};
}

export function canCraftCompositeComponentV27(componentId:string,skillLevels:SkillLevelsV27,inventory:InventoryV27):CraftGateResultV27{
  const component=byComponent.get(componentId); if(!component) return {ok:false,errors:[`unknown_component:${componentId}`],requirements:{}};
  const requirements=componentInventoryRequirementsV27(componentId);
  const errors:string[]=[];
  const level=skillLevels[component.craftSkillId]??0;
  if(level<component.skillLevel) errors.push(`skill:${component.craftSkillId}:${component.skillLevel}`);
  errors.push(...inventoryErrors(requirements,inventory));
  return {ok:errors.length===0,errors,requirements};
}

export function validateExactRecipeCatalogV27(){
  if(recipes.length!==1701) throw new Error(`recipe_count:${recipes.length}`);
  if(components.length!==33) throw new Error(`component_count:${components.length}`);
  const ids=new Set<string>();
  for(const r of recipes){
    if(ids.has(r.pieceId)) throw new Error(`duplicate_recipe:${r.pieceId}`); ids.add(r.pieceId);
    if(r.finalAssembly.level!==r.requiredLevel) throw new Error(`final_skill_mismatch:${r.pieceId}`);
    if(r.tier==='T1'&&r.effectGemSupported) throw new Error(`t1_effect_gem:${r.pieceId}`);
    if(r.tier==='T2'&&(!r.statGemSupported||r.effectGemSupported)) throw new Error(`t2_socket_rule:${r.pieceId}`);
    if(Number(r.tier.slice(1))>=3&&(!r.statGemSupported||!r.effectGemSupported)) throw new Error(`t3plus_socket_rule:${r.pieceId}`);
    for(const c of r.components){
      if(c.componentId&&!byComponent.has(c.componentId)) throw new Error(`unknown_component_ref:${r.pieceId}:${c.componentId}`);
      if(c.componentId==='COMP_T9_HEART'&&r.requiredLevel<70) throw new Error(`frozen_heart_too_early:${r.pieceId}`);
    }
  }
  return true;
}
