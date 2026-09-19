import type {EquipmentPieceV22,EquipmentTierId} from './equipment-types-v22';
import {finalCraftMinutesV24,RECIPE_SHARE_V24,SLOT_BUDGET_MULTIPLIER_V24,TIER_RECIPE_UNITS_V24} from './equipment-balance-v24';
import {canonicalResourceV25} from './equipment-resource-map-v25';
import {resolveRecipeSourcesV25} from './equipment-recipe-sources-v25';
export type RequirementRoleV25='regional'|'processedInput'|'monsterRare'|'dungeonBoss';
export interface RequirementV25{role:RequirementRoleV25;canonicalKey:string;resourceId?:string;regionalResourceId?:string;itemId?:string;quantity:number;registrationRequired:boolean;guaranteedSource:boolean;source:string;expectedYieldPerEligibleClear?:readonly[number,number];}
export interface EquipmentRecipeV25{pieceId:string;tier:EquipmentTierId;requiredLevel:number;craftMinutes:number;requirements:readonly RequirementV25[];contentSource:string;blockedByMissingItemRegistration:boolean;}
export function recipeForPieceV25(piece:EquipmentPieceV22):EquipmentRecipeV25{
 const units=Math.max(1,Math.round(TIER_RECIPE_UNITS_V24[piece.tier]*SLOT_BUDGET_MULTIPLIER_V24[piece.slot]));
 const share=RECIPE_SHARE_V24[piece.tier];const src=resolveRecipeSourcesV25(piece.tier,piece.path,piece.requiredLevel,piece.id);
 const out:RequirementV25[]=[];
 const add=(role:RequirementRoleV25,key:string|undefined,fraction:number,boss=false)=>{if(!key||fraction<=0)return;const r=canonicalResourceV25(key);out.push({role,canonicalKey:key,resourceId:r.globalResourceId,regionalResourceId:r.regionalResourceId,itemId:r.itemId,quantity:Math.max(1,Math.round(units*fraction)),registrationRequired:!r.itemId,guaranteedSource:true,source:r.source,...(boss?{expectedYieldPerEligibleClear:(piece.tier==='T9'?[5,7]:[4,6]) as readonly[number,number]}:{})});};
 add('regional',src.regional,share.regionalCommon*.68);
 // V25 maps the processing share to the same authoritative raw-resource family until/if a canonical processed inventory item exists.
 add('processedInput',src.regional,share.processed+share.regionalCommon*.32);
 add('monsterRare',src.rare,share.monsterSpecific);
 add('dungeonBoss',src.boss,share.dungeonBoss,true);
 return {pieceId:piece.id,tier:piece.tier,requiredLevel:piece.requiredLevel,craftMinutes:finalCraftMinutesV24(piece.tier,piece.slot),requirements:out,contentSource:src.contentSource,blockedByMissingItemRegistration:out.some(v=>v.registrationRequired)};
}
