import {craftingDetailV31} from './equipment-crafting-view-v31';
import {buildCraftPlanV31,type CraftPlannerStateV31} from './equipment-crafting-plan-v31';
import {compareEquipV32,type EquipContextV32,loadoutSummaryV32} from './equipment-equip-v32';
import {setCraftProgressV24} from './equipment-set-progress-v24';
import {EQUIPMENT_PIECES_V23,EQUIPMENT_SETS_V23} from './equipment-catalog-v23';
import {deriveInstanceV26} from './equipment-item-instance-v26';

export function craftingScreenPayloadV32(pieceId:string,state:CraftPlannerStateV31){const detail=craftingDetailV31(pieceId,state),plan=buildCraftPlanV31(pieceId,state);return {detail,steps:plan.steps,blockers:plan.blockers,pve:plan.pveSummary};}
export function equipmentLoadoutPayloadV32(ctx:EquipContextV32){const summary=loadoutSummaryV32(ctx);return {loadout:ctx.loadout,stats:summary.stats,activeSets:summary.sets,equipped:Object.entries(ctx.loadout).flatMap(([slot,id])=>{if(!id)return [];const inst=ctx.instances.find(x=>x.id===id);if(!inst)return [];const d=deriveInstanceV26(inst);return [{slot,id,pieceId:inst.pieceId,name:d.pieceName,rarity:inst.rarity,upgradeRank:inst.upgradeRank,setId:d.setId,statGemId:inst.statGemId,effectGemId:inst.effectGemId}];})};}
export function equipmentComparePayloadV32(ctx:EquipContextV32,candidateItemId:string){return compareEquipV32(ctx,candidateItemId);}
export function setCollectionPayloadV32(className:string,craftedPieceIds:readonly string[]){const sets=setCraftProgressV24(className,craftedPieceIds,[]);return {sets,totalCompleted:sets.filter(row=>row.unlocked).length};}
export function setDetailPayloadV32(setId:string,craftedPieceIds:readonly string[]){const set=EQUIPMENT_SETS_V23.find(s=>s.id===setId);if(!set)throw new Error('unknown_set');const crafted=new Set(craftedPieceIds),pieces=EQUIPMENT_PIECES_V23.filter(p=>p.setId===setId).map(p=>({...p,crafted:crafted.has(p.id)}));return {set,pieces,armorThresholdRule:'Only Helmet/Chest/Gloves/Legs/Boots count for 2pc/3pc/5pc.'};}
