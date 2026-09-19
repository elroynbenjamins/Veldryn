export type EquipmentTierIdV33='T1'|'T2'|'T3'|'T4'|'T5'|'T6'|'T7'|'T8'|'T9';
export type EquipmentSlotV33='Helmet'|'Chest'|'Gloves'|'Legs'|'Boots'|'Weapon'|'Off-hand'|'Cape'|'Amulet'|'Ring';
export const EQUIPMENT_SLOT_ORDER_V33:readonly EquipmentSlotV33[]=['Helmet','Chest','Gloves','Legs','Boots','Weapon','Off-hand','Cape','Amulet','Ring'];
export const SET_BONUS_SLOTS_V33:readonly EquipmentSlotV33[]=[...EQUIPMENT_SLOT_ORDER_V33];
export const SKIN_REQUIRED_SLOTS_V33:readonly EquipmentSlotV33[]=[...EQUIPMENT_SLOT_ORDER_V33];
export const SET_THRESHOLDS_V33=[2,4,6,8,10] as const;
export type SetThresholdPiecesV33=(typeof SET_THRESHOLDS_V33)[number];
export interface SetThresholdV33{pieces:SetThresholdPiecesV33;description:string;}
export interface EquipmentSetV33{id:string;tier:EquipmentTierIdV33;tierName:string;region:string;levelMin:number;levelMax:number;unlockLevel:number;className:string;role:'Tank'|'Damage'|'Support';path:'Foundation'|'Specialist'|'Alternate';name:string;focus:string;primaryStat:string;secondaryStat:string;tertiaryStat:string;thresholds:readonly SetThresholdV33[];collectibleBonus:string;}
export interface EquipmentPieceV33{id:string;setId:string;tier:EquipmentTierIdV33;className:string;role:string;path:string;setName:string;slot:EquipmentSlotV33;name:string;requiredLevel:number;countsForSetBonus:true;requiredForSkin:true;primaryStat:string;secondaryStat:string;}
export interface EquippedPieceV33{pieceId:string;setId:string;slot:EquipmentSlotV33;}
export interface ActiveSetBonusV33{setId:string;pieceCount:number;thresholds:readonly SetThresholdV33[];}
