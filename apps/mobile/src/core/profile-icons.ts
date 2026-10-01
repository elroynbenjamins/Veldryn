import {CLASSES} from '../content/classes';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import type {GameState} from './types';

export const PROFILE_ICON_CATALOG = [
 {id:'starter:hooded-ranger',name:'Hooded Ranger',group:'Starter',source:'Available from the start.'},
 {id:'starter:armored-sentinel',name:'Armored Sentinel',group:'Starter',source:'Available from the start.'},
 {id:'starter:masked-spellcaster',name:'Masked Spellcaster',group:'Starter',source:'Available from the start.'},
 {id:'starter:traveling-alchemist',name:'Traveling Alchemist',group:'Starter',source:'Available from the start.'},
 {id:'starter:dawn-priestess',name:'Dawn Priestess',group:'Starter',source:'Available from the start.'},
 {id:'starter:stonebound-explorer',name:'Stonebound Explorer',group:'Starter',source:'Available from the start.'},
 {id:'companion:UNIT_001',name:'Ironwood Hound',group:'Companion',source:'Unlock the Ironwood Hound companion.',companionId:'UNIT_001'},
 {id:'companion:UNIT_002',name:'Runebound Sentry',group:'Companion',source:'Unlock the Runebound Sentry companion.',companionId:'UNIT_002'},
 {id:'companion:UNIT_008',name:'Dawnwing',group:'Companion',source:'Unlock the Dawnwing companion.',companionId:'UNIT_008'},
 {id:'creature:MOSS_RAT',name:'Moss Rat',group:'Combat',source:'Reach 10 Moss Rat mastery points.',monsterId:'MOSS_RAT'},
 {id:'creature:IRONWOOD_WOLF',name:'Ironwood Wolf',group:'Combat',source:'Reach 10 Ironwood Wolf mastery points.',monsterId:'IRONWOOD_WOLF'},
 {id:'creature:FALLEN_KNIGHT',name:'Fallen Knight',group:'Combat',source:'Defeat the Fallen Knight.',bossId:'FALLEN_KNIGHT'},
 {id:'event:pumpkin-piglet',name:'Pumpkin Piglet',group:'Harvestwake',source:'Earn the Pumpkin Piglet pet during Harvestwake.',petId:'EVT_PET_011'},
 {id:'event:harvest-guardian',name:'Harvest Guardian',group:'Harvestwake',source:'Earn the Harvest Guardian companion during Harvestwake.',companionId:'EVT_UNIT_006'},
 {id:'event:spirit-lantern',name:'Spirit Lantern',group:'Harvestwake',source:'Claim the 8,000 reputation reward during Harvestwake.'},
] as const;
export interface ProfileIconEntry {id:string;name:string;group:string;source:string;unlocked:boolean;artworkReady:boolean;selected:boolean;}
export function profileIconCollection(state:GameState):ProfileIconEntry[]{
 const selected=state.character?.profileIconId??`class:${state.character?.classId??'IRONWARDEN'}`;
 const base=CLASSES.map(row=>({id:`class:${row.id}`,name:row.name,group:'Class',source:'Available from the start.',unlocked:true,artworkReady:true,selected:selected===`class:${row.id}`}));
 const owned=new Set(state.account.unlockedProfileIconIds??[]);
 const characters=[state.character,...(state.otherCharacters??[]).map(row=>row.character)];
 const portraits=PROFILE_ICON_CATALOG.map(row=>({...row,artworkReady:true,selected:selected===row.id,unlocked:
  row.group==='Starter'||owned.has(row.id)
  ||('companionId' in row&&(state.account.unlockedCombatCompanionIds??[]).includes(row.companionId))
  ||('petId' in row&&((state.account.unlockedCosmeticPetIds??[]).includes(row.petId)||characters.some(c=>c?.ownedPetIds?.includes(row.petId))))
  ||('monsterId' in row&&characters.some(c=>(c?.monsterMasteryPoints?.[row.monsterId]??0)>=10))
  ||('bossId' in row&&state.defeatedBossIds.includes(row.bossId))}));
 const known=new Set<string>(portraits.map(row=>row.id));
 const rewards=LIVE_EVENT_CATALOG.flatMap(event=>[...CLASSES.flatMap(c=>event.milestones(c.id).map(row=>row.reward)),...event.shop.map(row=>row.reward),...event.communityMilestones.flatMap(row=>row.reward?[row.reward]:[]),...event.discoveries.map(row=>row.reward)]);
 const events=[...new Map(rewards.filter(row=>row.kind==='profile_icon'&&owned.has(row.id)&&!known.has(row.id)).map(row=>[row.id,row])).values()];
 return [...base,...portraits,...events.map(row=>({id:row.id,name:row.name,group:'Event',source:'Earned festival reward.',unlocked:true,artworkReady:false,selected:selected===row.id}))];
}
export function canUseProfileIcon(state:GameState,id:string){return profileIconCollection(state).some(row=>row.id===id&&row.unlocked);}
export function selectProfileIcon(state:GameState,id:string):GameState{
 if(!state.character)throw new Error('Create a character before choosing a profile icon.');
 if(!canUseProfileIcon(state,id))throw new Error('This profile icon is not unlocked.');
 return {...state,character:{...state.character,profileIconId:id}};
}
export function normalizeProfileIcon(state:GameState):GameState{
 if(!state.character||canUseProfileIcon(state,state.character.profileIconId??''))return state;
 return {...state,character:{...state.character,profileIconId:`class:${state.character.classId}`}};
}
export function newlyUnlockedProfileIcons(before:GameState|null,after:GameState){
 if(!before)return [];
 const owned=new Set(profileIconCollection(before).filter(row=>row.unlocked).map(row=>row.id));
 return profileIconCollection(after).filter(row=>row.unlocked&&!owned.has(row.id));
}
