import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {currentRegionId} from './combat-region';
import type {GameState,GatheringSkillId} from './types';

export function regionalGatheringNodes(state:GameState,{skillId,preferredActionId}:{skillId?:GatheringSkillId;preferredActionId?:string}={}){
 const regionId=currentRegionId(state),level=(id:string)=>state.skills.find(row=>row.skillId===id)?.level??1;
 return [...GATHERING,...HERB_NODES].filter(row=>row.zoneId===regionId&&(!skillId||row.skillId===skillId))
  .sort((a,b)=>Number(b.id===state.activity?.targetId)-Number(a.id===state.activity?.targetId)
   ||Number(b.id===preferredActionId)-Number(a.id===preferredActionId)
   ||Number(level(b.skillId)>=b.unlockLevel)-Number(level(a.skillId)>=a.unlockLevel)
   ||a.unlockLevel-b.unlockLevel||a.name.localeCompare(b.name));
}
