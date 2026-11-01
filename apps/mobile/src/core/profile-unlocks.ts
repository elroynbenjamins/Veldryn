import {GameState} from './types';
export const PROFILE_BACKGROUNDS=[{id:'asterfall-night',name:'Asterfall Night',requiredLevel:1},{id:'ironwood-dawn',name:'Ironwood Dawn',requiredLevel:10},{id:'silverbrook-mist',name:'Silverbrook Mist',requiredLevel:20},{id:'oathglass-hall',name:'Oathglass Hall',requiredLevel:25}];
export const PROFILE_TITLES=[{id:'new-adventurer',name:'New Adventurer',requiredLevel:1},{id:'pathfinder',name:'Pathfinder',requiredLevel:10},{id:'oathbound',name:'Oathbound',requiredLevel:25},{id:'bloomwarden',name:'Bloomwarden',requiredGuild:true}];
function highestAccountCharacterLevel(state:GameState){
 return Math.max(0,state.character?.level??0,...(state.otherCharacters??[]).map(entry=>entry.character.level??0));
}
export function profileBackgroundUnlocked(state:GameState,id:string){
 const bg=PROFILE_BACKGROUNDS.find(x=>x.id===id);
 return !!bg&&(state.account.unlockedProfileBackgroundIds?.includes(id)===true||highestAccountCharacterLevel(state)>=bg.requiredLevel);
}
export function setProfileBackground(state:GameState,id:string):GameState{if(!profileBackgroundUnlocked(state,id))throw new Error('Profile background is locked');return state.character?{...state,character:{...state.character,profileBackgroundId:id}}:state}
export function profileTitleUnlocked(state:GameState,id:string){
 const title=PROFILE_TITLES.find(x=>x.id===id);
 if(!title)return false;
 if(state.account.unlockedTitleIds?.includes(id))return true;
 return highestAccountCharacterLevel(state)>=(title.requiredLevel??1)&&(!title.requiredGuild||state.account.guildMember);
}
export function setProfileTitle(state:GameState,id:string):GameState{if(!profileTitleUnlocked(state,id))throw new Error('Profile title is locked');const title=PROFILE_TITLES.find(x=>x.id===id)!;return state.character?{...state,character:{...state.character,profileTitle:title.name}}:state}
