import type {ItemRarity} from './item-rarity';
import {CRAFTED_MYTHIC_CHANCE,CRAFTED_LEGENDARY_CHANCE,CRAFTED_EPIC_CHANCE,CRAFTED_RARE_CHANCE,CRAFTED_UNCOMMON_CHANCE,deterministicCraftRarityRoll} from './crafted-gear-rarity';

/** One immutable roll per physical gathering tool. Legacy untracked tools keep
 * their original tier bonus (equivalent to Uncommon / Quality 50), without a
 * fabricated bonus roll. Bonus ranges never depend on tier, rarity or quality. */
export type GatheringToolBonusStat='speed'|'rarity';
export interface GatheringToolBonus {stat:GatheringToolBonusStat;basisPoints:number}
export interface CraftedGatheringTool {
 id:string;itemId:string;ownerCharacterId:string;rarity:ItemRarity;
 quality:number;bonus:GatheringToolBonus;sourceReceiptKey:string;createdAtMs:number;
}
export const GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION=.80;
export const GATHERING_TOOL_SPEED_RANGE_BPS=[200,800] as const;
export const GATHERING_TOOL_RARITY_RANGE_BPS=[200,500] as const;
/** Modest rarity multiplier on the BASE tier benefit only (never the affix). */
export const GATHERING_TOOL_BASE_RARITY:Readonly<Record<ItemRarity,number>>={
 common:.95,uncommon:1,rare:1.02,epic:1.04,legendary:1.06,mythic:1.08,
};
export function gatheringToolQualityMultiplier(quality:number){
 const q=Number.isFinite(quality)?Math.max(0,Math.min(100,quality)):50;
 return 1+(q-50)*.002; // Q0=90%, Q50=100%, Q100=110%.
}
export function gatheringToolBaseMultiplier(roll?:CraftedGatheringTool){
 if(!roll)return 1;
 return (GATHERING_TOOL_BASE_RARITY[roll.rarity]??1)*gatheringToolQualityMultiplier(roll.quality);
}
export function validateGatheringToolRoll(raw:unknown,itemId:string):CraftedGatheringTool|undefined{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
 const row=raw as Partial<CraftedGatheringTool>,bonus=row.bonus;
 if(typeof row.id!=='string'||!row.id||row.itemId!==itemId||typeof row.ownerCharacterId!=='string'||!row.ownerCharacterId
  ||typeof row.quality!=='number'||!Number.isInteger(row.quality)||row.quality<0||row.quality>100
  ||!row.rarity||!(row.rarity in GATHERING_TOOL_BASE_RARITY)
  ||typeof row.sourceReceiptKey!=='string'||!Number.isFinite(row.createdAtMs)
  ||!bonus||!['speed','rarity'].includes(bonus.stat)||!Number.isInteger(bonus.basisPoints))return undefined;
 const [min,max]=bonus.stat==='speed'?GATHERING_TOOL_SPEED_RANGE_BPS:GATHERING_TOOL_RARITY_RANGE_BPS;
 if(bonus.basisPoints<min||bonus.basisPoints>max||bonus.basisPoints%10!==0)return undefined;
 return row as CraftedGatheringTool;
}
function rarityFromRoll(sample:number):ItemRarity{
 const bands:ReadonlyArray<[ItemRarity,number]>=[
  ['mythic',CRAFTED_MYTHIC_CHANCE],['legendary',CRAFTED_LEGENDARY_CHANCE],
  ['epic',CRAFTED_EPIC_CHANCE],['rare',CRAFTED_RARE_CHANCE],
  ['uncommon',CRAFTED_UNCOMMON_CHANCE],
 ];
 let limit=0;
 for(const [rarity,chance] of bands){limit+=chance;if(sample<limit)return rarity}
 return 'common';
}
export function mintGatheringTool(itemId:string,characterId:string,receiptKey:string,createdAtMs:number):CraftedGatheringTool{
 const seed='gathering-tool:v1:'+characterId+':'+itemId+':'+receiptKey;
 const draw=(part:string)=>deterministicCraftRarityRoll(seed+':'+part);
 const stat:GatheringToolBonusStat=draw('stat')<.5?'speed':'rarity';
 const [min,max]=stat==='speed'?GATHERING_TOOL_SPEED_RANGE_BPS:GATHERING_TOOL_RARITY_RANGE_BPS;
 const steps=(max-min)/10;
 return {
  id:'gtool:'+characterId+':'+receiptKey,itemId,ownerCharacterId:characterId,
  rarity:rarityFromRoll(draw('rarity')),quality:Math.min(100,Math.floor(draw('quality')*101)),
  bonus:{stat,basisPoints:min+10*Math.floor(draw('bonus')*(steps+1))},
  sourceReceiptKey:receiptKey,createdAtMs,
 };
}
export function gatheringToolBonusLabel(copy:CraftedGatheringTool){
 return '+'+(copy.bonus.basisPoints/100).toFixed(1)+'% '+(copy.bonus.stat==='speed'?'Gathering Speed':'Gathering Rarity Chance');
}
