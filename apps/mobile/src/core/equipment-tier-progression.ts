import {V33_EQUIPMENT_RECIPES} from '../content/equipment-recipes-v33';
import {equipmentTierNumber,isReleasedEquipmentTier} from '../content/equipment-release';
import {totalXpAtLevel} from './progression';

export type EquipmentCraftProfession='smithing'|'tailoring';

interface TierMilestone{tier:string;requiredLevel:number;}
export interface NextEquipmentTierGoal extends TierMilestone{remainingXp:number;}

/** Read milestones from the same generated recipes the forge validates.
 * Do not duplicate tier level gates in the UI. Unreleased tiers stay hidden. */
function releasedMilestones(skillId:EquipmentCraftProfession):TierMilestone[]{
 const byTier=new Map<string,number>();
 for(const recipe of V33_EQUIPMENT_RECIPES){
  if(recipe.skillId!==skillId||!isReleasedEquipmentTier(recipe.v33EquipmentTier))continue;
  const previous=byTier.get(recipe.v33EquipmentTier);
  byTier.set(recipe.v33EquipmentTier,previous===undefined?recipe.level:Math.min(previous,recipe.level));
 }
 return [...byTier].map(([tier,requiredLevel])=>({tier,requiredLevel}))
  .sort((a,b)=>equipmentTierNumber(a.tier)-equipmentTierNumber(b.tier));
}
const milestones:Record<EquipmentCraftProfession,TierMilestone[]>={
 smithing:releasedMilestones('smithing'),
 tailoring:releasedMilestones('tailoring'),
};

/** Profession milestone only; a separate character level or materials may
 * still be required to forge or equip an item. Never promise craft readiness. */
export function nextEquipmentTierGoal(skillId:EquipmentCraftProfession,level:number,xp:number):NextEquipmentTierGoal|undefined{
 const next=milestones[skillId].find(row=>level<row.requiredLevel);
 if(!next)return undefined;
 return {...next,remainingXp:Math.max(0,totalXpAtLevel(next.requiredLevel)-Math.max(0,xp))};
}
