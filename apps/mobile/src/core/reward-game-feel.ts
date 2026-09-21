import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {FAITH_BLESSINGS,FAITH_TIERS} from '../content/faith';
import {itemDef} from '../content/items';
import {itemRarity,type ItemRarity} from './item-rarity';
import {faithLevel} from './faith';
import type {GameState,RewardBundle,SkillId} from './types';

export interface RewardProgressionMoment{
  kind:'character_level'|'skill_level';
  id:string;
  label:string;
  beforeLevel:number;
  afterLevel:number;
  unlocks:string[];
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
const crossed=(level:number,before:number,after:number)=>level>before&&level<=after;

function skillUnlocks(skillId:SkillId,before:number,after:number):string[]{
  if(after<=before)return [];
  const unlocks:string[]=[];
  if(skillId==='mining'||skillId==='woodcutting'||skillId==='fishing'){
    for(const node of GATHERING)if(node.skillId===skillId&&crossed(node.unlockLevel,before,after))unlocks.push(node.name);
  }
  if(skillId==='herbalism'){
    for(const node of HERB_NODES)if(crossed(node.unlockLevel,before,after))unlocks.push(node.name);
  }
  if(skillId==='smithing'||skillId==='cooking'||skillId==='alchemy'){
    for(const recipe of RECIPES)if(recipe.skillId===skillId&&crossed(recipe.level,before,after))unlocks.push(recipe.name);
  }
  if(skillId==='faith'){
    for(const tier of FAITH_TIERS)if(crossed(tier.level,before,after))unlocks.push(tier.name);
    for(const blessing of FAITH_BLESSINGS)if(crossed(blessing.level,before,after))unlocks.push(blessing.name);
  }
  return [...new Set(unlocks)].slice(0,12);
}

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
    if(afterLevel>beforeLevel)moments.push({kind:'skill_level',id:skill.skillId,label:SKILL_LABELS[skill.skillId],beforeLevel,afterLevel,unlocks:skillUnlocks(skill.skillId,beforeLevel,afterLevel)});
  }
  // Faith may be character-faith backed even in older saves where the generic skill row is absent.
  if(!after.skills.some(skill=>skill.skillId==='faith')){
    const beforeLevel=faithLevel(before),afterLevel=faithLevel(after);
    if(afterLevel>beforeLevel)moments.push({kind:'skill_level',id:'faith',label:'Faith',beforeLevel,afterLevel,unlocks:skillUnlocks('faith',beforeLevel,afterLevel)});
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
