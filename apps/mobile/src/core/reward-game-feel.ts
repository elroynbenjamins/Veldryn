import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';
import {faithLevel} from './faith';
import {newlyUnlockedCrossSkillNames,skillMilestoneOverview,skillMilestonesBetween} from './skill-milestones';
import type {GameState,RewardBundle,SkillId} from './types';

export interface RewardProgressionUnlockGroup{category:string;items:string[]}
export interface RewardProgressionMoment{
  kind:'character_level'|'skill_level';
  id:string;
  label:string;
  beforeLevel:number;
  afterLevel:number;
  unlocks:string[];
  unlockGroups?:RewardProgressionUnlockGroup[];
  nextMilestone?:{level:number;items:string[]};
}
export interface RewardLootHighlight{
  itemId:string;
  name:string;
  quantity:number;
  rarity:ItemRarity;
  spotlight:boolean;
  type:string;
}

const SKILL_LABELS:Record<SkillId,string>={
 mining:'Mining',woodcutting:'Woodcutting',fishing:'Fishing',herbalism:'Herbalism',
 smithing:'Smithing',cooking:'Cooking',alchemy:'Alchemy',hunting:'Hunting',
 exploration:'Exploration',tailoring:'Tailoring',enchanting:'Enchanting',faith:'Faith',
};
const RARITY_ORDER:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
/** Derives celebration-worthy level transitions from committed state, never from predicted XP. */
export function rewardProgressionMoments(before:GameState|null|undefined,after:GameState|null|undefined):RewardProgressionMoment[]{
  if(!before||!after)return [];
  const moments:RewardProgressionMoment[]=[];
  if(before.character&&after.character&&before.character.id===after.character.id&&after.character.level>before.character.level){
    moments.push({kind:'character_level',id:'character',label:'Character Level',beforeLevel:before.character.level,afterLevel:after.character.level,unlocks:[]});
  }
  const beforeSkills=new Map(before.skills.map(skill=>[skill.skillId,skill]));
  for(const skill of after.skills){
    const previous=beforeSkills.get(skill.skillId),beforeLevel=skill.skillId==='faith'?faithLevel(before):(previous?.level??1),afterLevel=skill.skillId==='faith'?faithLevel(after):skill.level;
    if(afterLevel>beforeLevel){
      const crossed=skillMilestonesBetween(after,skill.skillId,beforeLevel,afterLevel).filter(row=>row.kind!=='cross_skill'),crossNames=newlyUnlockedCrossSkillNames(before,after,skill.skillId);
      const unlockGroups=[...new Set(crossed.map(row=>row.category))].map(category=>({category,items:crossed.filter(row=>row.category===category).map(row=>row.title)}));
      if(crossNames.length)unlockGroups.push({category:'CROSS-SKILL',items:crossNames});
      const unlocks=[...crossed.map(row=>row.title),...crossNames],overview=skillMilestoneOverview(after,skill.skillId);
      moments.push({kind:'skill_level',id:skill.skillId,label:SKILL_LABELS[skill.skillId],beforeLevel,afterLevel,unlocks,unlockGroups,nextMilestone:overview.nextLevel?{level:overview.nextLevel,items:overview.next.slice(0,3).map(row=>row.title)}:undefined});
    }
  }
  // Faith may be character-faith backed even in older saves where the generic skill row is absent.
  if(!after.skills.some(skill=>skill.skillId==='faith')){
    const beforeLevel=faithLevel(before),afterLevel=faithLevel(after);
    if(afterLevel>beforeLevel){
      const crossed=skillMilestonesBetween(after,'faith',beforeLevel,afterLevel).filter(row=>row.kind!=='cross_skill'),crossNames=newlyUnlockedCrossSkillNames(before,after,'faith');
      const unlockGroups=[...new Set(crossed.map(row=>row.category))].map(category=>({category,items:crossed.filter(row=>row.category===category).map(row=>row.title)}));
      if(crossNames.length)unlockGroups.push({category:'CROSS-SKILL',items:crossNames});
      const unlocks=[...crossed.map(row=>row.title),...crossNames],overview=skillMilestoneOverview(after,'faith');
      moments.push({kind:'skill_level',id:'faith',label:'Faith',beforeLevel,afterLevel,unlocks,unlockGroups,nextMilestone:overview.nextLevel?{level:overview.nextLevel,items:overview.next.slice(0,3).map(row=>row.title)}:undefined});
    }
  }
  return moments;
}

export function rewardLootHighlights(reward:RewardBundle):RewardLootHighlight[]{
  return reward.items.flatMap(stack=>{
    try{
      const item=itemDef(stack.itemId),rarity=itemRarity(item);
      return [{itemId:item.id,name:item.name,quantity:stack.quantity,rarity,spotlight:RARITY_ORDER.indexOf(rarity)>=RARITY_ORDER.indexOf('epic'),type:item.type}];
    }catch{return []}
  }).sort((a,b)=>RARITY_ORDER.indexOf(b.rarity)-RARITY_ORDER.indexOf(a.rarity)||b.quantity-a.quantity);
}

export interface RewardFollowUpCandidate{kind:'companion'|'pet'|'inventory'|'skill';label:string;skillId?:string}
/** Ordered by the most useful immediate follow-up after a reward settlement. */
export function rewardFollowUpCandidates(args:{progressionMoments:readonly RewardProgressionMoment[];lootHighlights:readonly RewardLootHighlight[];companionUnlockCount:number;petDropCount:number}):RewardFollowUpCandidate[]{
  const candidates:RewardFollowUpCandidate[]=[];
  if(args.companionUnlockCount>0)candidates.push({kind:'companion',label:args.companionUnlockCount===1?'View new companion':'View new companions'});
  if(args.petDropCount>0)candidates.push({kind:'pet',label:args.petDropCount===1?'View pet collection':'View new pets'});
  if(args.lootHighlights.some(row=>row.spotlight&&(row.type==='gear'||row.type==='gem')))candidates.push({kind:'inventory',label:'Review new loot'});
  const skill=args.progressionMoments.find(moment=>moment.kind==='skill_level'&&moment.unlocks.length>0);
  if(skill)candidates.push({kind:'skill',label:`View ${skill.label} unlocks`,skillId:skill.id});
  return candidates;
}
