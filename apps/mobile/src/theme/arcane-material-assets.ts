import type {ImageSourcePropType} from 'react-native';

export const ARCANE_MATERIAL_CELL=256;
export const ARCANE_MATERIAL_SHEET_WIDTH=512;
export const ARCANE_MATERIAL_SHEET_HEIGHT=256;
export const arcaneMaterialSheet:ImageSourcePropType=require('../../assets/arcane-materials-v2.png');

export interface ArcaneMaterialCell{column:number;row:number;}
export const arcaneMaterialCellById:Readonly<Record<string,ArcaneMaterialCell>>={
  ASTRAL_SCRIPT:{column:0,row:0},
  RUNEBOUND_CORE:{column:1,row:0},
};
export function arcaneMaterialCell(itemId:string){return arcaneMaterialCellById[itemId];}
export function hasArcaneMaterialArtwork(itemId:string){return !!arcaneMaterialCell(itemId);}
