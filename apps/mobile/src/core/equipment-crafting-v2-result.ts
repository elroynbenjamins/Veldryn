import type {EquipmentV2Affix,EquipmentV2BaseStats} from './equipment-crafting-v2-foundation';
import {EQUIPMENT_V2_RARITIES,equipmentV2AffixCount,equipmentV2AffixBounds,
 equipmentV2QualityMultiplier} from './equipment-crafting-v2-foundation';
import {equipmentV2CraftablePiece} from '../content/equipment-v2-recipes';
import {equipmentV2Set} from '../content/equipment-v2-catalog';
import type {ItemRarity} from './item-rarity';

/** Read-only completion view derived from a trusted future server receipt.
 * Does NOT generate rarity, roll affixes, mint an item, or calculate combat.
 */
export interface V2AuthoritativeResultViewInput{
 receiptOrigin:'server';instanceId:string;pieceId:string;
 rarity:ItemRarity;quality:number;
 /** Effective, final values must come from the authoritative server receipt. */
 baseStats:EquipmentV2BaseStats;
 affixes:readonly {stat:EquipmentV2Affix;percent:number;grade:number}[];
}
export interface V2EquippedComparison{
 baseStats:EquipmentV2BaseStats;
 affixes?:readonly {stat:EquipmentV2Affix;percent:number}[];
}
const finite=(value:number)=>Number.isFinite(value)&&value>=0;
function validateStats(stats:EquipmentV2BaseStats){
 if(!stats||!finite(stats.attack)||!finite(stats.defense)||!finite(stats.hp))throw new Error('Invalid V2 display stats');
 const positive=Object.values(stats).filter(v=>v>0).length;
 if(positive<1||positive>2)throw new Error('V2 gear must have one or two base attributes');
}
export function equipmentV2ResultPresentation(
 result:V2AuthoritativeResultViewInput,
 equipped?:V2EquippedComparison,
){
 if(!result||result.receiptOrigin!=='server'||!result.instanceId)throw new Error('Missing trusted equipment result');
 const item=equipmentV2CraftablePiece(result.pieceId);
 if(!item)throw new Error('Unknown V2 result equipment');
 if(!Number.isInteger(result.quality)||result.quality<0||result.quality>100)throw new Error('Invalid quality');
 const rarity=EQUIPMENT_V2_RARITIES.find(r=>r.rarity===result.rarity);
 if(!rarity)throw new Error('Unknown V2 result rarity');
 validateStats(result.baseStats);
 if(result.affixes.length!==equipmentV2AffixCount(item.tier,result.rarity))
  throw new Error('Wrong V2 affix count for tier and rarity');
 const seen=new Set<EquipmentV2Affix>();
 const affixes=result.affixes.map(affix=>{
  if(seen.has(affix.stat))throw new Error('Duplicate V2 result affix');
  seen.add(affix.stat);
  if(!Number.isFinite(affix.percent)||!Number.isInteger(affix.grade)||affix.grade<0||affix.grade>100)
   throw new Error('Invalid V2 result affix');
  const bounds=equipmentV2AffixBounds(item.tier,result.rarity,affix.stat);
  if(affix.percent<bounds.minimum-.011||affix.percent>bounds.maximum+.011)throw new Error('Affix outside V2 rarity band');
  const expectedGrade=Math.max(0,Math.min(100,Math.round((affix.percent-bounds.fullMinimum)/(bounds.fullMaximum-bounds.fullMinimum)*100)));
  if(Math.abs(expectedGrade-affix.grade)>1)throw new Error('Affix grade does not match rolled strength');
  const previous=equipped?.affixes?.find(old=>old.stat===affix.stat)?.percent??0;
  return {...affix,minimum:bounds.minimum,maximum:bounds.maximum,
   fullMinimum:bounds.fullMinimum,fullMaximum:bounds.fullMaximum,
   deltaVsEquipped:affix.percent-previous,
  };
 });
 if(equipped)validateStats(equipped.baseStats);
 const lostAffixes=(equipped?.affixes??[]).filter(old=>!seen.has(old.stat));
 const compare=(stat:keyof EquipmentV2BaseStats)=>result.baseStats[stat]-(equipped?.baseStats[stat]??0);
 return {
  instanceId:result.instanceId,pieceId:item.id,itemName:item.name,
  tier:item.tier,slot:item.slot,role:item.role,material:item.material,
  rarity:result.rarity,quality:result.quality,qualityMultiplier:equipmentV2QualityMultiplier(result.quality),
  qualityVsQ50Percent:(equipmentV2QualityMultiplier(result.quality)-1)*100,
  baseStats:result.baseStats,statDifference:equipped?{
   attack:compare('attack'),defense:compare('defense'),hp:compare('hp'),
  }:undefined,
  affixes,lostAffixes,rarityChance:rarity.chance,
  setName:item.setId?equipmentV2Set(item.setId)?.name:undefined,
  classRestriction:'classRestriction' in item?item.classRestriction:undefined,
  /** An equipped item's actual utility depends on skills, resistances and set
   * breaks. Never convert these display deltas into a 'better' recommendation.
   */
  hasComparison:Boolean(equipped),
 };
}
