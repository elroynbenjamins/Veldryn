import type {GameState} from './types';
import {profileIconCollection} from './profile-icons';
import {BASE_PROFILE_BACKGROUNDS,canUseProfileCosmetic,profileCosmeticReleased} from './profile-cosmetics';
import {PROFILE_TITLES,profileTitleUnlocked} from './profile-unlocks';
import {profileRewardSource,type ProfileCustomizationDestination} from './profile-customization';
import {JOURNAL_TITLES_V42} from './adventurers-journal-v42';
import {collectibleJournal} from './collectibles';
import {LIVE_EVENT_CATALOG} from '../content/live-events';

/** One flat wardrobe model so the Look tab renders every cosmetic family the same way:
 * a chip with an owned/total count and a grid of tiles that carry their own unlock source. */
export type WardrobeKind='icon'|'scene'|'frame'|'pet'|'title';
export const WARDROBE_KINDS:readonly WardrobeKind[]=['icon','scene','frame','pet','title'];
export const WARDROBE_LABELS:Record<WardrobeKind,string>={icon:'Icons',scene:'Scenes',frame:'Frames',pet:'Pets',title:'Titles'};
/** Locked artwork prints this tag, so a tile explains itself before it is tapped. */
const DESTINATION_TAGS:Record<ProfileCustomizationDestination,string>={Events:'EVENT',Guild:'GUILD',Character:'LEVEL',Collections:'COLLECTION'};

export interface WardrobeRow{
 kind:WardrobeKind;id:string;name:string;group:string;
 unlocked:boolean;equipped:boolean;
 /** Present only on locked rows: the short tag plus the full unlock explanation. */
 lockTag?:string;sourceLabel?:string;sourceDetail?:string;destination?:ProfileCustomizationDestination;actionLabel?:string;
 /** True for the synthetic "none" choices, which never count towards collection progress. */
 clear?:boolean;
}
export interface WardrobeCategory{kind:WardrobeKind;label:string;owned:number;total:number;rows:WardrobeRow[]}
export interface WardrobeProgress{owned:number;total:number;percent:number}

export function wardrobeLockTag(destination:ProfileCustomizationDestination|undefined){return destination?DESTINATION_TAGS[destination]:'LOCKED'}

/** Scene and frame names/ids live in the art registry; core stays image-free and testable. */
export interface WardrobeAssets{scenes:readonly {id:string;name:string}[];frames:readonly string[]}

function lockFields(state:GameState,kind:'background'|'border'|'title',id:string):Partial<WardrobeRow>{
 const source=profileRewardSource(state,kind,id);
 return {lockTag:wardrobeLockTag(source.destination),sourceLabel:source.label,sourceDetail:source.detail,destination:source.destination,actionLabel:source.actionLabel};
}

function iconRows(state:GameState):WardrobeRow[]{
 return profileIconCollection(state).map(row=>({kind:'icon' as const,id:row.id,name:row.name,group:row.group,unlocked:row.unlocked,equipped:row.selected,
  ...(row.unlocked?{}:{lockTag:row.group==='Event'?'EVENT':row.group==='Guild'?'GUILD':'COMBAT',sourceLabel:row.group==='Event'?'Festival reward':row.group+' unlock',sourceDetail:row.source,
   destination:(row.group==='Event'?'Events':row.group==='Guild'?'Guild':'Collections') as ProfileCustomizationDestination,actionLabel:row.group==='Event'?'Open Event':row.group==='Guild'?'Open Guild':'Open Collections'})}));
}

function sceneRows(state:GameState,assets:WardrobeAssets):WardrobeRow[]{
 const equipped=state.character?.profileBackgroundId??'asterfall-night';
 const base=BASE_PROFILE_BACKGROUNDS.map(item=>({kind:'scene' as const,id:item.id,name:item.name,group:'Starter',unlocked:true,equipped:equipped===item.id}));
 const released=assets.scenes.filter(item=>!BASE_PROFILE_BACKGROUNDS.some(row=>row.id===item.id)&&profileCosmeticReleased(state,'background',item.id));
 return [...base,...released.map(item=>{const unlocked=canUseProfileCosmetic(state,'background',item.id);
  return {kind:'scene' as const,id:item.id,name:item.name,group:'Event',unlocked,equipped:equipped===item.id,...(unlocked?{}:lockFields(state,'background',item.id))};})];
}

function frameRows(state:GameState,assets:WardrobeAssets):WardrobeRow[]{
 const equipped=state.character?.profileBorderId??'';
 const released=assets.frames.filter(id=>profileCosmeticReleased(state,'border',id));
 return [{kind:'frame' as const,id:'',name:'No frame',group:'Starter',unlocked:true,equipped:!equipped,clear:true},
  ...released.map(id=>{const unlocked=canUseProfileCosmetic(state,'border',id),source=profileRewardSource(state,'border',id);
   return {kind:'frame' as const,id,name:source.name,group:source.destination==='Guild'?'Guild':'Event',unlocked,equipped:equipped===id,...(unlocked?{}:lockFields(state,'border',id))};})];
}

function petRows(state:GameState):WardrobeRow[]{
 const equipped=state.character?.selectedCosmeticPetId??'';
 const rows=collectibleJournal(state).filter(row=>row.kind==='pet'&&(row.owned||row.collectionGroup==='event'))
  .sort((a,b)=>Number(b.owned)-Number(a.owned)||a.name.localeCompare(b.name));
 return [{kind:'pet' as const,id:'',name:'No Pet',group:'Starter',unlocked:true,equipped:!equipped,clear:true},
  ...rows.map(row=>({kind:'pet' as const,id:row.id,name:row.name,group:row.collectionGroup==='event'?'Event':'Collection',unlocked:row.owned,equipped:equipped===row.id,
   ...(row.owned?{}:{lockTag:'COLLECTION',sourceLabel:'Collections',sourceDetail:'Unlock this Pet through its collection source.',destination:'Collections' as ProfileCustomizationDestination,actionLabel:'Open Collections'})}))];
}

function titleRows(state:GameState):WardrobeRow[]{
 const equipped=state.character?.profileTitle??'New Adventurer';
 const journal=JOURNAL_TITLES_V42.filter(def=>state.account.journalState?.unlockedTitles?.[def.id]!==undefined)
  .map(def=>({kind:'title' as const,id:'journal:'+def.id,name:def.name,group:"Journal",unlocked:true,equipped:equipped===def.name}));
 const base=PROFILE_TITLES.map(def=>{const unlocked=profileTitleUnlocked(state,def.id);
  return {kind:'title' as const,id:def.id,name:def.name,group:'Progression',unlocked,equipped:equipped===def.name,...(unlocked?{}:lockFields(state,'title',def.id))};});
 const owned=new Set(state.account.unlockedTitleIds??[]);
 const eventRewards=[...new Map(LIVE_EVENT_CATALOG.flatMap(event=>[...event.milestones(state.character?.classId??'IRONWARDEN').map(row=>row.reward),...event.shop.map(row=>row.reward)])
  .filter(reward=>reward.kind==='title').map(reward=>[reward.id,reward])).values()];
 const events=eventRewards.map(reward=>{const unlocked=owned.has(reward.id);
  return {kind:'title' as const,id:reward.id,name:reward.name,group:'Event',unlocked,equipped:equipped===reward.name,...(unlocked?{}:lockFields(state,'title',reward.id))};});
 return [...journal,...base,...events];
}

export function profileWardrobe(state:GameState,assets:WardrobeAssets):WardrobeCategory[]{
 const byKind:Record<WardrobeKind,WardrobeRow[]>={icon:iconRows(state),scene:sceneRows(state,assets),frame:frameRows(state,assets),pet:petRows(state),title:titleRows(state)};
 return WARDROBE_KINDS.map(kind=>{const rows=byKind[kind],counted=rows.filter(row=>!row.clear);
  return {kind,label:WARDROBE_LABELS[kind],rows,owned:counted.filter(row=>row.unlocked).length,total:counted.length};});
}

export function wardrobeProgress(categories:readonly WardrobeCategory[]):WardrobeProgress{
 const owned=categories.reduce((sum,row)=>sum+row.owned,0),total=categories.reduce((sum,row)=>sum+row.total,0);
 return {owned,total,percent:total?Math.round(owned/total*100):0};
}

/** The equipped cosmetic of each family, used by the stage and by undo. */
export interface WardrobeEquipped{icon:string;scene:string;frame:string;pet:string;title:string}
export function wardrobeEquipped(state:GameState):WardrobeEquipped{
 const character=state.character;
 return {icon:character?.profileIconId??`class:${character?.classId??'IRONWARDEN'}`,scene:character?.profileBackgroundId??'asterfall-night',
  frame:character?.profileBorderId??'',pet:character?.selectedCosmeticPetId??'',title:character?.profileTitle??'New Adventurer'};
}
export function applyWardrobeEquipped(state:GameState,equipped:WardrobeEquipped):GameState{
 if(!state.character)return state;
 return {...state,character:{...state.character,profileIconId:equipped.icon,profileBackgroundId:equipped.scene,
  profileBorderId:equipped.frame||undefined,selectedCosmeticPetId:equipped.pet||undefined,profileTitle:equipped.title}};
}
/** A wardrobe tap writes exactly one family, so the other four keep their saved value. */
export function wardrobeSelection(equipped:WardrobeEquipped,row:{kind:WardrobeKind;id:string;name:string}):WardrobeEquipped{
 return row.kind==='icon'?{...equipped,icon:row.id}
  :row.kind==='scene'?{...equipped,scene:row.id}
  :row.kind==='frame'?{...equipped,frame:row.id}
  :row.kind==='pet'?{...equipped,pet:row.id}
  :{...equipped,title:row.name};
}
