export type ProfileVisibility='public'|'friends'|'private';
export interface ProfileSelectionInput{requestId:string;displayName:string;activeCharacterId:string;titleId:string;backgroundId:string;borderId?:string;petId?:string;visibility:ProfileVisibility;}
export interface PublicProfileProjection{displayName:string;visibility:ProfileVisibility;revision:number;character:{name:string;classId:string;level:number;bodyPresentation:'male'|'female'};title:{id:string;name:string};backgroundId:string;borderId?:string;petId?:string;arena?:{rating:number;division:string};guild?:{name:string;level:number};characterCount:number;achievementScore?:number;achievementShowcase?:Array<{id:string;name:string;points:number}>;}
export type ProfileSelfProjection=PublicProfileProjection&{ownedTitleIds:string[]};
export interface ProfileUpdateResult{profile:PublicProfileProjection;idempotentReplay:boolean;}
