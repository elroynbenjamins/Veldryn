export interface StatDeltaRowV24{key:string;label:string;delta:number;isPercent:boolean;}
export interface EquipmentCompareCardV24{slot:string;currentName?:string;candidateName:string;requiredLevel:number;upgradeRank:number;statDeltas:readonly StatDeltaRowV24[];setChanges:readonly {setName:string;before:number;after:number;unlockedBonuses:readonly string[];lostBonuses:readonly string[]}[];}
export interface SkinCollectionCardV24{setId:string;setName:string;tier:string;crafted:number;required:number;unlocked:boolean;missingSlots:readonly string[];collectibleBonus:string;visualStatus?:string;}
export const EQUIPMENT_V24_UI_RULES={tabs:['Equipped','Compare','Upgrade','Sets','Skins'] as const,showFiveArmorSetThresholds:true,showSevenPieceSkinProgress:true,eventSkinsLiveOnlyInSkinsTab:true,neverShowEventSkinAsEquipment:true,showWeaponAndOffhandNamesOnSetCard:true} as const;
export function formatStatDeltaV24(v:number,isPercent:boolean){const sign=v>0?'+':'';return isPercent?`${sign}${(v*100).toFixed(1)}%`:`${sign}${Math.round(v)}`;}
export function skinProgressLabelV24(v:SkinCollectionCardV24){return v.unlocked?'Skin Unlocked':`${v.crafted}/${v.required} crafted`;}
