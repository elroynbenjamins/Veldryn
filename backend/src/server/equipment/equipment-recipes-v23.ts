import type {EquipmentPieceV22,EquipmentTierId} from './equipment-types-v22';import {materialProfileV23} from './equipment-material-profiles-v23';
const TIER_UNITS:Record<EquipmentTierId,number>={T1:8,T2:13,T3:20,T4:29,T5:41,T6:55,T7:72,T8:92,T9:116};
const SLOT:Record<string,number>={Gloves:.70,Boots:.75,Helmet:.85,Legs:1,Chest:1.20,'Off-hand':1.15,Weapon:1.35};
export type MaterialRoleV23='regionalCommon'|'processed'|'monsterSpecific'|'dungeonBoss';
export interface RecipeRequirementV23{role:MaterialRoleV23;materialKey:string;quantity:number;guaranteedSource:boolean}
export interface EquipmentRecipeV23{pieceId:string;tier:EquipmentTierId;effortUnits:number;requirements:readonly RecipeRequirementV23[];bossGate:boolean}
export function recipeForPieceV23(piece:EquipmentPieceV22):EquipmentRecipeV23{
 const effort=Math.max(1,Math.round(TIER_UNITS[piece.tier]*(SLOT[piece.slot]??1)));const bossShare=piece.tier==='T1'||piece.tier==='T2'?0:piece.tier==='T3'?0.05:0.08;const monsterShare=piece.tier==='T1'?0.08:.12,processedShare=.20,commonShare=1-bossShare-monsterShare-processedShare;const q=(share:number)=>Math.max(1,Math.round(effort*share));const profile=materialProfileV23(piece.tier,piece.path);
 const req:RecipeRequirementV23[]=[{role:'regionalCommon',materialKey:profile.regionalCommon,quantity:q(commonShare),guaranteedSource:true},{role:'processed',materialKey:profile.processed,quantity:q(processedShare),guaranteedSource:true},{role:'monsterSpecific',materialKey:profile.monsterSpecific,quantity:q(monsterShare),guaranteedSource:true}];if(bossShare>0&&profile.dungeonBoss)req.push({role:'dungeonBoss',materialKey:profile.dungeonBoss,quantity:q(bossShare),guaranteedSource:true});return {pieceId:piece.id,tier:piece.tier,effortUnits:effort,requirements:req,bossGate:bossShare>0};
}
export function firstSetRecipeMultiplierV23(isFirstPrimarySet:boolean):number{return isFirstPrimarySet?.85:1;}
