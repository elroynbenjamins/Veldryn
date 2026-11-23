import type {ItemRarity} from './item-rarity';
import {gatheringToolDef} from '../content/gathering-tools';
import {CRAFTED_MYTHIC_CHANCE,CRAFTED_LEGENDARY_CHANCE,CRAFTED_EPIC_CHANCE,CRAFTED_RARE_CHANCE,CRAFTED_UNCOMMON_CHANCE,deterministicCraftRarityRoll} from './crafted-gear-rarity';

/** One immutable roll per physical gathering tool. Legacy untracked tools keep
 * their original tier bonus (equivalent to Uncommon / Quality 50), without a
 * fabricated bonus roll. Existing speed and rarity ranges remain unchanged;
 * Skill XP ranges scale with the relevant tool tier. */
export type GatheringToolBonusStat='speed'|'rarity'|'xp';
export interface GatheringToolBonus {stat:GatheringToolBonusStat;basisPoints:number}
export interface CraftedGatheringTool {
 id:string;itemId:string;ownerCharacterId:string;rarity:ItemRarity;
 quality:number;bonus:GatheringToolBonus;sourceReceiptKey:string;createdAtMs:number;
}
export const GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION=.80;
export const GATHERING_TOOL_SPEED_RANGE_BPS=[200,800] as const;
export const GATHERING_TOOL_RARITY_RANGE_BPS=[200,500] as const;
/** Additive across distinct equipped tool tiers for one skill; future T5–T9
 * tool catalogs can expand the pool without unbounded XP multiplication. */
export const GATHERING_TOOL_MAX_XP_BONUS_BPS=6000;
/** Skill-specific XP affix ranges, in basis points. T5–T9 are reserved for
 * the 2.0 catalog expansion and must not be minted by today's T1–T4 tools. */
export const GATHERING_TOOL_XP_RANGE_BPS_BY_TIER:Readonly<Record<1|2|3|4,readonly [number,number]>>={
 1:[200,400],2:[300,500],3:[400,600],4:[500,800],
};
export function gatheringToolBonusRange(itemId:string,stat:GatheringToolBonusStat):readonly [number,number]|undefined{
 if(stat==='speed')return GATHERING_TOOL_SPEED_RANGE_BPS;
 if(stat==='rarity')return GATHERING_TOOL_RARITY_RANGE_BPS;
 const tier=gatheringToolDef(itemId)?.tier;
 return tier?GATHERING_TOOL_XP_RANGE_BPS_BY_TIER[tier]:undefined;
}
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
  ||!bonus||!['speed','rarity','xp'].includes(bonus.stat)||!Number.isInteger(bonus.basisPoints))return undefined;
 const range=gatheringToolBonusRange(itemId,bonus.stat);
 if(!range)return undefined;
 const [min,max]=range;
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
 const seed='gathering-tool:v2:'+characterId+':'+itemId+':'+receiptKey;
 const draw=(part:string)=>deterministicCraftRarityRoll(seed+':'+part);
 const statSample=draw('stat');
 const stat:GatheringToolBonusStat=statSample<1/3?'speed':statSample<2/3?'rarity':'xp';
 const range=gatheringToolBonusRange(itemId,stat);
 if(!range)throw new Error('Unknown gathering tool bonus range');
 const [min,max]=range;
 const rarity=rarityFromRoll(draw('rarity'));
 const quality=Math.min(100,Math.floor(draw('quality')*101));
 // Only XP rolls use a slight rarity/quality bias; speed and rare-find
 // rolls retain their established distribution and percentage ranges.
 const scarcityScore:Readonly<Record<ItemRarity,number>>={common:0,uncommon:.2,rare:.4,epic:.6,legendary:.8,mythic:1};
 const sample=stat==='xp'?Math.min(.999999,draw('bonus')*.8+quality/100*.15+scarcityScore[rarity]*.05):draw('bonus');
 const steps=(max-min)/10;
 return {
  id:'gtool:'+characterId+':'+receiptKey,itemId,ownerCharacterId:characterId,
  rarity,quality,
  bonus:{stat,basisPoints:min+10*Math.floor(sample*(steps+1))},
  sourceReceiptKey:receiptKey,createdAtMs,
 };
}
export function gatheringToolBonusLabel(copy:CraftedGatheringTool){
 const label=copy.bonus.stat==='speed'?'Gathering Speed':copy.bonus.stat==='rarity'?'Gathering Rarity Chance':
  (({mining:'Mining',woodcutting:'Woodcutting',fishing:'Fishing'} as const)[gatheringToolDef(copy.itemId)?.skillId as 'mining'|'woodcutting'|'fishing']??'Skill')+' XP';
 return '+'+(copy.bonus.basisPoints/100).toFixed(1)+'% '+label;
}
