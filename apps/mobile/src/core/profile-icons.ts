import {ownedUltraLuxeIcons} from './ultra-luxe-prestige';
import {CLASSES} from '../content/classes';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {DUNGEON_SHOP_PROFILE_ICONS_V1} from '../content/dungeon-shop-collectibles-v1';
import {DUNGEON_MARKS_SHOP_RELEASED,PROFILE_COSMETICS_STORE_RELEASED} from './release-flags';
import {PROFILE_COSMETIC_PORTRAITS} from './profile-cosmetic-icons';
import {profileCosmeticsTester} from './profile-cosmetic-access';
import type {GameState} from './types';

type ProfileIconCatalogRow={id:string;name:string;group:string;source:string;monsterId?:string;bossId?:string;artworkReady?:boolean};

/** Event portraits with a concrete source in the shared profile artwork registry. */
export const EVENT_PROFILE_ICON_ARTWORK_IDS=new Set([
 'event:veilbreak-2026-lantern-warden',
 'event:veilbreak-2026-pumpkin-moon',
 'event:frostfall-2026-snowbell',
 'event:frostfall-2026-maiden',
 'event:frostfall-2026-adventurer',
]);

export const PROFILE_ICON_CATALOG:readonly ProfileIconCatalogRow[] = [
 {id:'starter:hooded-ranger',name:'Hooded Ranger',group:'Starter',source:'Available from the start.'},
 {id:'starter:armored-sentinel',name:'Armored Sentinel',group:'Starter',source:'Available from the start.'},
 {id:'starter:masked-spellcaster',name:'Masked Spellcaster',group:'Starter',source:'Available from the start.'},
 {id:'starter:traveling-alchemist',name:'Traveling Alchemist',group:'Starter',source:'Available from the start.'},
 {id:'starter:dawn-priestess',name:'Dawn Priestess',group:'Starter',source:'Available from the start.'},
 {id:'starter:stonebound-explorer',name:'Stonebound Explorer',group:'Starter',source:'Available from the start.'},
 {id:'starter:gilded-duelist',name:'Gilded Duelist',group:'Starter',source:'Available from the start.'},
 {id:'starter:runic-scholar',name:'Runic Scholar',group:'Starter',source:'Available from the start.'},
 {id:'starter:dune-warden',name:'Dune Warden',group:'Starter',source:'Available from the start.'},
 {id:'creature:FALLEN_KNIGHT',name:'Fallen Knight',group:'Combat',source:'Defeat the Fallen Knight.',bossId:'FALLEN_KNIGHT'},
 {id:'guild:stormwatch-crest',name:'Stormwatch Crest',group:'Guild',source:'Guild Token Shop · Guild Level 4'},
 ...PROFILE_COSMETIC_PORTRAITS.map(row=>({id:row.id,name:row.name,group:'Cosmetics',source:'Cosmetics set · Tester access',artworkReady:row.artworkReady})),
 ...DUNGEON_SHOP_PROFILE_ICONS_V1.map(row=>({id:row.id,name:row.name,group:'Dungeon',source:'Dungeon Marks Shop · '+row.region})),
];
export interface ProfileIconEntry {id:string;name:string;group:string;source:string;unlocked:boolean;artworkReady:boolean;selected:boolean;}
/** Online legacy rosters require the trusted created_at backfill. Offline rosters use
 * their monotonically allocated LOCAL_CHAR ids, never active/featured order. */
function initialIconCharacter(state:GameState){
 const roster=[state.character,...(state.otherCharacters??[]).map(row=>row.character)].filter((row):row is NonNullable<GameState['character']>=>!!row);
 if(roster.length<=1)return roster[0];
 const sequence=(id:string)=>/^LOCAL_CHAR_(\d+)$/.exec(id);
 if(!roster.every(row=>sequence(row.id)))return undefined;
 return [...roster].sort((a,b)=>Number(sequence(a.id)![1])-Number(sequence(b.id)![1]))[0];
}
export function accountProfileIconId(state:GameState):string{
 const first=initialIconCharacter(state);
 return state.account.profileIconId??first?.profileIconId??(first?'class:'+first.classId:state.character?.profileIconId??'class:'+(state.character?.classId??'IRONWARDEN'));
}
/** Preserve the account choice across all character projections and legacy clients. */
function mirrorProfileIcon(state:GameState,id:string):GameState{
 const active=state.character,others=state.otherCharacters;
 if(state.account.profileIconId===id&&(!active||active.profileIconId===id)&&!others?.some(row=>row.character.profileIconId!==id))return state;
 return {...state,account:{...state.account,profileIconId:id},
  character:active?{...active,profileIconId:id}:null,
  ...(others?{otherCharacters:others.map(row=>row.character.profileIconId===id?row:{...row,character:{...row.character,profileIconId:id}})}:{})};
}
export function profileIconCollection(state:GameState):ProfileIconEntry[]{
 const selected=accountProfileIconId(state);
 const rosterClasses=new Set([state.character?.classId??'IRONWARDEN',...(state.otherCharacters??[]).map(row=>row.character.classId)]);
 const base=CLASSES.filter(row=>rosterClasses.has(row.id)||selected===`class:${row.id}`).map(row=>({id:`class:${row.id}`,name:row.name,group:'Class',source:'Your account character class.',unlocked:true,artworkReady:true,selected:selected===`class:${row.id}`}));
 const owned=new Set(state.account.unlockedProfileIconIds??[]);
 const characters=[state.character,...(state.otherCharacters??[]).map(row=>row.character)];
 const tester=profileCosmeticsTester(state);
 const portraits=PROFILE_ICON_CATALOG.filter(row=>(row.group!=='Dungeon'||DUNGEON_MARKS_SHOP_RELEASED||owned.has(row.id))&&(row.group!=='Cosmetics'||PROFILE_COSMETICS_STORE_RELEASED||tester||owned.has(row.id))).map(row=>{const artworkReady=row.group==='Cosmetics'&&tester?true:row.artworkReady??true;return {...row,artworkReady,selected:selected===row.id,unlocked:
  row.group==='Starter'||(artworkReady&&owned.has(row.id))
  ||(row.monsterId!==undefined&&characters.some(c=>(c?.monsterMasteryPoints?.[row.monsterId!]??0)>=10))
  ||(row.bossId!==undefined&&state.defeatedBossIds.includes(row.bossId))}});
 const known=new Set<string>(portraits.map(row=>row.id));
 const rewards=LIVE_EVENT_CATALOG.flatMap(event=>[...CLASSES.flatMap(c=>event.milestones(c.id).map(row=>row.reward)),...event.shop.map(row=>row.reward),...event.communityMilestones.flatMap(row=>row.reward?[row.reward]:[]),...event.discoveries.map(row=>row.reward)]);
 const events=[...new Map(rewards.filter(row=>row.kind==='profile_icon'&&!known.has(row.id)).map(row=>[row.id,row])).values()];
 const privateIcons=ownedUltraLuxeIcons(state).map(row=>({...row,group:'Ascendant',source:'Private account grant.',unlocked:true,artworkReady:true,selected:selected===row.id}));
 return [...base,...privateIcons,...portraits,...events.map(row=>({id:row.id,name:row.name,group:'Event',source:'Earned festival reward.',unlocked:owned.has(row.id),artworkReady:EVENT_PROFILE_ICON_ARTWORK_IDS.has(row.id),selected:selected===row.id}))];
}
export function canUseProfileIcon(state:GameState,id:string){return PROFILE_ICON_CATALOG.some(row=>row.id===id&&row.group==='Starter')||profileIconCollection(state).some(row=>row.id===id&&row.unlocked);}
export function selectProfileIcon(state:GameState,id:string):GameState{
 if(!state.character)throw new Error('Create a character before choosing a profile icon.');
 if(!canUseProfileIcon(state,id))throw new Error('This profile icon is not unlocked.');
 return mirrorProfileIcon(state,id);
}
export function normalizeProfileIcon(state:GameState):GameState{
 if(!state.character)return state;
 const first=initialIconCharacter(state);
 // Never silently seed an online multi-character account from its active hero.
 if(!state.account.profileIconId&&!first)return state;
 const id=accountProfileIconId(state);
 return mirrorProfileIcon(state,canUseProfileIcon(state,id)?id:`class:${first?.classId??state.character.classId}`);
}
/** Persisted account choices were validated at selection/backfill. Keep the hot
 * gameplay path free of repeated gallery/catalog construction. */
export function reconcileAccountProfileIcon(state:GameState):GameState{
 if(!state.character)return state;
 const id=state.account.profileIconId;
 // A private grant can be revoked between requests. Never restore a stripped portrait.
 if(id?.startsWith('ascendant-')&&!ownedUltraLuxeIcons(state).some(row=>row.id===id))return normalizeProfileIcon(state);
 return id?mirrorProfileIcon(state,id):normalizeProfileIcon(state);
}
export function newlyUnlockedProfileIcons(before:GameState|null,after:GameState){
 if(!before)return [];
 const owned=new Set(profileIconCollection(before).filter(row=>row.unlocked).map(row=>row.id));
 // Class portraits are available by default, never an earned-icon announcement.
 return profileIconCollection(after).filter(row=>row.unlocked&&row.group!=='Class'&&!owned.has(row.id));
}
