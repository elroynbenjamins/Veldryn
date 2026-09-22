import type {ProfileCollectionRefV43} from '../online/profile-extension-v43';
import {JOURNAL_ACHIEVEMENTS_V42,type JournalAchievementTier} from './adventurers-journal-v42';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {COLLECTIBLES} from '../content/collectibles';
import {LIVE_EVENT_CATALOG,type EventRewardRarity} from '../content/live-events';
import {CLASSES} from '../content/classes';

export type ProfilePrestigeTone='standard'|'notable'|'rare'|'elite'|'prestige'|'record';
export interface ProfilePrestigePresentation{tone:ProfilePrestigeTone;badge:string;}

const achievementTone:Record<JournalAchievementTier,ProfilePrestigeTone>={
 novice:'standard',adventurer:'notable',veteran:'rare',master:'elite',grandmaster:'prestige',
};
const rewardTone:Record<EventRewardRarity,ProfilePrestigeTone>={
 common:'standard',uncommon:'notable',rare:'rare',epic:'elite',mythic:'prestige',legendary:'prestige',
};
function label(value:string){return value.replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}

export function profileAchievementPrestige(id:string):ProfilePrestigePresentation{
 const def=JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id);
 if(!def)return {tone:'standard',badge:'ACHIEVEMENT'};
 return {tone:achievementTone[def.tier],badge:def.tier.toUpperCase()};
}

function eventRewardRarity(kind:ProfileCollectionRefV43['kind'],id:string):EventRewardRarity|undefined{
 for(const event of LIVE_EVENT_CATALOG){
  for(const classDef of CLASSES){
   const milestone=event.milestones(classDef.id).find(row=>row.reward.kind===kind&&row.reward.id===id);
   if(milestone)return milestone.reward.rarity;
  }
  const shop=event.shop.find(row=>row.reward.kind===kind&&row.reward.id===id);if(shop)return shop.reward.rarity;
  const community=event.communityMilestones.find(row=>row.reward?.kind===kind&&row.reward.id===id);if(community?.reward)return community.reward.rarity;
  const discovery=event.discoveries.find(row=>row.reward.kind===kind&&row.reward.id===id);if(discovery)return discovery.reward.rarity;
 }
 return undefined;
}

export function profileCollectionPrestige(ref:ProfileCollectionRefV43):ProfilePrestigePresentation{
 if(ref.kind==='companion'){
  const rarity=COMBAT_COMPANIONS.find(row=>row.id===ref.id)?.rarity??'standard';
  const tone:ProfilePrestigeTone=rarity==='prestige'?'prestige':rarity==='elite'?'elite':rarity==='rare'?'rare':'standard';
  return {tone,badge:rarity.toUpperCase()+' COMPANION'};
 }
 const collectible=COLLECTIBLES.find(row=>row.id===ref.id);
 const rawRarity=(collectible?.rarity?.toLowerCase() as EventRewardRarity|undefined)??eventRewardRarity(ref.kind,ref.id);
 if(rawRarity&&rewardTone[rawRarity])return {tone:rewardTone[rawRarity],badge:rawRarity.toUpperCase()+' '+ref.kind.toUpperCase()};
 if(collectible?.collectionGroup==='event')return {tone:'notable',badge:'EVENT '+ref.kind.toUpperCase()};
 return {tone:'standard',badge:label(ref.kind).toUpperCase()};
}

export const profileRecordPrestige=():ProfilePrestigePresentation=>({tone:'record',badge:'PERSONAL BEST'});
export const profileMasteryPrestige=():ProfilePrestigePresentation=>({tone:'prestige',badge:'R50 MASTERED'});
