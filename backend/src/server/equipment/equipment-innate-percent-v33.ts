import type {EquipmentSlotV33} from './equipment-types-v33';

/** Backend V33 set-detail metadata mirror of the curated mobile combat pieces.
 * Changes to this table must also be reflected in the mobile catalog's
 * equipment-innate-percent.ts mapping and regression snapshots. */
export type InnatePercentStatV33='maxHp'|'armor'|'ward'|'critRate'|'haste'|'evasion';
export interface InnatePercentV33{readonly stat:InnatePercentStatV33;readonly basisPoints:number;}
const BY_SET:Readonly<Record<string,Readonly<Partial<Record<EquipmentSlotV33,InnatePercentV33>>>>>={
 T3_001:{Chest:{stat:'armor',basisPoints:80},Cape:{stat:'maxHp',basisPoints:50}},
 T3_007:{Chest:{stat:'ward',basisPoints:70},Gloves:{stat:'haste',basisPoints:40}},
 T3_013:{Gloves:{stat:'critRate',basisPoints:50},Boots:{stat:'evasion',basisPoints:40}},
 T4_001:{Chest:{stat:'armor',basisPoints:110},Cape:{stat:'maxHp',basisPoints:70}},
 T4_007:{Chest:{stat:'ward',basisPoints:100},Gloves:{stat:'haste',basisPoints:60}},
 T4_013:{Gloves:{stat:'critRate',basisPoints:70},Boots:{stat:'evasion',basisPoints:60}},
};
export function innatePercentForPieceV33(setId:string,slot:EquipmentSlotV33,tier:string):InnatePercentV33|undefined{
 if(tier!=='T3'&&tier!=='T4')return undefined;
 return BY_SET[setId]?.[slot];
}
