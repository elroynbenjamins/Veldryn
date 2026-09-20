import {CLASSES} from '../content/classes';
import type {ClassId} from './types';
/** The server may send a canonical id or a display name. Unknown classes stay generic. */
export function resolveIdentityClass(value?:string|null):ClassId|undefined{
 if(!value)return undefined;
 const normalized=value.trim().toLowerCase().replace(/[_ -]+/g,'');
 return CLASSES.find(item=>item.id.toLowerCase().replace(/[_ -]+/g,'')===normalized||item.name.toLowerCase().replace(/[_ -]+/g,'')===normalized)?.id;
}


export type SocialGuildRole='leader'|'officer'|'member';
export type SocialIdentityTone='gold'|'info'|'muted'|'podium_gold'|'podium_silver'|'podium_bronze';

export function socialGuildRolePresentation(role:SocialGuildRole){
 if(role==='leader')return {label:'Guild Leader',tone:'gold' as const};
 if(role==='officer')return {label:'Officer',tone:'info' as const};
 return {label:'Member',tone:'muted' as const};
}

export function rankingPositionPresentation(rank:number){
 const value=Math.max(1,Math.floor(rank));
 if(value===1)return {label:'#1',tone:'podium_gold' as const};
 if(value===2)return {label:'#2',tone:'podium_silver' as const};
 if(value===3)return {label:'#3',tone:'podium_bronze' as const};
 return {label:'#'+value,tone:'muted' as const};
}

export function compactCharacterSummary(characterName?:string|null,className?:string|null,level?:number|null){
 if(!characterName)return 'No synced character';
 const classLabel=className?className.replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Adventurer';
 const levelLabel=typeof level==='number'&&Number.isFinite(level)?' · Lv. '+Math.max(1,Math.floor(level)):'';
 return characterName+' · '+classLabel+levelLabel;
}
