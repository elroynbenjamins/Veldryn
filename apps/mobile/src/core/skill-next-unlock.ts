import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {FAITH_BLESSINGS,FAITH_TIERS} from '../content/faith';
import type {SkillId} from './types';

export interface SkillNextUnlockPreview{
  level:number;
  levelsAway:number;
  names:string[];
  category:'activity'|'recipe'|'faith';
}

export function nextSkillUnlockPreview(skillId:string,currentLevel:number):SkillNextUnlockPreview|undefined{
  const level=Math.max(1,Math.floor(currentLevel));
  const candidates:Array<{level:number;name:string;category:SkillNextUnlockPreview['category']}>=[];
  if(skillId==='mining'||skillId==='woodcutting'||skillId==='fishing'){
    for(const row of GATHERING)if(row.skillId===skillId&&row.unlockLevel>level)candidates.push({level:row.unlockLevel,name:row.name,category:'activity'});
  }else if(skillId==='herbalism'){
    for(const row of HERB_NODES)if(row.unlockLevel>level)candidates.push({level:row.unlockLevel,name:row.name,category:'activity'});
  }else if(skillId==='smithing'||skillId==='cooking'||skillId==='alchemy'){
    for(const row of RECIPES)if(row.skillId===skillId&&!row.noviceSetId&&row.level>level)candidates.push({level:row.level,name:row.name,category:'recipe'});
  }else if(skillId==='faith'){
    for(const row of FAITH_TIERS)if(row.level>level)candidates.push({level:row.level,name:row.name,category:'faith'});
    for(const row of FAITH_BLESSINGS)if(row.level>level)candidates.push({level:row.level,name:row.name,category:'faith'});
  }
  if(!candidates.length)return undefined;
  candidates.sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
  const nextLevel=candidates[0].level,next=candidates.filter(row=>row.level===nextLevel);
  return {level:nextLevel,levelsAway:nextLevel-level,names:[...new Set(next.map(row=>row.name))].slice(0,4),category:next[0].category};
}

export function nextSkillUnlockLabel(preview:SkillNextUnlockPreview):string{
  const count=preview.names.length;
  if(preview.category==='recipe')return count===1?'NEXT RECIPE':'NEXT RECIPES';
  if(preview.category==='faith')return 'NEXT FAITH UNLOCK';
  return count===1?'NEXT ACTIVITY':'NEXT ACTIVITIES';
}
