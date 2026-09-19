export type EquipmentTierId='T1'|'T2'|'T3'|'T4'|'T5'|'T6'|'T7'|'T8'|'T9';
export type EquipmentSlot='Helmet'|'Chest'|'Gloves'|'Legs'|'Boots'|'Weapon'|'Off-hand';
export const ARMOR_SET_SLOTS:readonly EquipmentSlot[]=['Helmet','Chest','Gloves','Legs','Boots'];
export const SKIN_REQUIRED_SLOTS:readonly EquipmentSlot[]=[...ARMOR_SET_SLOTS,'Weapon','Off-hand'];
export type GearStatKey='maxHp'|'power'|'armor'|'ward'|'accuracy'|'evasion'|'critRate'|'critDamage'|'haste'|'tenacity'|'penetration'|'potency';
export interface SetThresholdV22{pieces:2|3|4|5;description:string;}
export interface EquipmentSetV22{id:string;tier:EquipmentTierId;tierName:string;region:string;levelMin:number;levelMax:number;unlockLevel:number;className:string;role:'Tank'|'Damage'|'Support';path:'Foundation'|'Specialist'|'Alternate';name:string;focus:string;primaryStat:string;secondaryStat:string;tertiaryStat:string;thresholds:readonly SetThresholdV22[];collectibleBonus:string;}
export interface EquipmentPieceV22{id:string;setId:string;tier:EquipmentTierId;className:string;role:string;path:string;setName:string;slot:EquipmentSlot;name:string;requiredLevel:number;countsForSetBonus:boolean;requiredForSkin:boolean;weaponOffhandType?:string;primaryStat:string;secondaryStat:string;}
export interface EquippedPieceV22{pieceId:string;setId:string;slot:EquipmentSlot;}
export interface ActiveSetBonusV22{setId:string;pieceCount:number;thresholds:readonly SetThresholdV22[];}
export interface TierPacingV22{tier:EquipmentTierId;levelRange:string;effectiveHoursPerPiece:string;fullSetHours:string;craftTimer:string;realWorldCompletion:string;firstSetAcceleration:string;oldTierCatchup:string;}
export interface SlotPacingV22{slot:EquipmentSlot;costMultiplier:number;}
