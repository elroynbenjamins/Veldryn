import type {SeasonalQuest} from './seasonal-quests';
import type {QuestDestination} from './quest-journal';

/** Activity-specific entry points for Class Challenges; never start or settle an action on navigation. */
export function seasonalChallengeDestination(quest:Pick<SeasonalQuest,'tag'>):QuestDestination{
  switch(quest.tag){
    case 'faith':return {tab:'Skills',skillId:'faith',mode:'faith',label:'Go to Faith',hint:'Open Faith practices to work towards this challenge.'};
    case 'exploration':return {tab:'Skills',skillId:'exploration',mode:'gathering',label:'Go to Exploration',hint:'Open Exploration routes to progress this challenge.'};
    case 'gathering':return {tab:'Skills',mode:'gathering',label:'Go to Gathering',hint:'Choose a gathering skill to work on this challenge.'};
    case 'crafting':return {tab:'Skills',mode:'crafting',label:'Go to Crafting',hint:'Choose a crafting profession to work on this challenge.'};
    case 'cooking':
    case 'alchemy':
    case 'smithing':
    case 'tailoring':
    case 'enchanting':
      return {tab:'Skills',skillId:quest.tag,mode:'crafting',label:'Go to '+quest.tag.charAt(0).toUpperCase()+quest.tag.slice(1),hint:'Open this crafting profession to work on the challenge.'};
    case 'combat':return {tab:'Combat',label:'Go to Combat',hint:'Defeat monsters and collect their rewards to make progress.'};
    case 'boss':return {tab:'Combat',label:'Go to Combat',hint:'Find a boss encounter to make progress.'};
    case 'event':return {tab:'Events',label:'Open Events',hint:'Complete an event objective to make progress.'};
    case 'equipment':return {tab:'Inventory',label:'Open Inventory',hint:'Manage equipment in Inventory.'};
  }
}
