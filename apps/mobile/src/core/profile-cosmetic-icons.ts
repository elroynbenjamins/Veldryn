export type ProfileCosmeticPortraitPresentation='female'|'male';
export interface ProfileCosmeticPortraitDefinition{
 id:string;name:string;collectionId:'gloamward'|'frostbound'|'amberglass'|'briarbound';presentation:ProfileCosmeticPortraitPresentation;artworkReady:boolean;
}
export const PROFILE_COSMETIC_PORTRAITS:readonly ProfileCosmeticPortraitDefinition[]=[
 {id:'cosmetic:gloamward:portrait-seer',name:'Gloamward Seer',collectionId:'gloamward',presentation:'female',artworkReady:false},
 {id:'cosmetic:gloamward:portrait-magus',name:'Gloamward Magus',collectionId:'gloamward',presentation:'male',artworkReady:false},
 {id:'cosmetic:frostbound:portrait-oracle',name:'Frostbound Oracle',collectionId:'frostbound',presentation:'female',artworkReady:false},
 {id:'cosmetic:frostbound:portrait-warden',name:'Frostbound Warden',collectionId:'frostbound',presentation:'male',artworkReady:false},
 {id:'cosmetic:amberglass:portrait-duelist',name:'Amberglass Duelist',collectionId:'amberglass',presentation:'female',artworkReady:false},
 {id:'cosmetic:amberglass:portrait-vanguard',name:'Amberglass Vanguard',collectionId:'amberglass',presentation:'male',artworkReady:false},
 {id:'cosmetic:briarbound:portrait-ranger',name:'Briarbound Ranger',collectionId:'briarbound',presentation:'female',artworkReady:false},
 {id:'cosmetic:briarbound:portrait-warden',name:'Briarbound Warden',collectionId:'briarbound',presentation:'male',artworkReady:false},
] as const;
export function profileCosmeticPortraits(collectionId:string){return PROFILE_COSMETIC_PORTRAITS.filter(row=>row.collectionId===collectionId)}
