import type {ImageSourcePropType} from 'react-native';

export const ARCANE_MATERIAL_CELL=64;
export const ARCANE_MATERIAL_SHEET_WIDTH=128;
export const ARCANE_MATERIAL_SHEET_HEIGHT=64;
export const arcaneMaterialSheet:ImageSourcePropType=require('../../assets/arcane-materials-v1.png');

export interface ArcaneMaterialCell{column:number;row:number;}
export const arcaneMaterialCellById:Readonly<Record<string,ArcaneMaterialCell>>={
  ASTRAL_SCRIPT:{column:0,row:0},
  RUNEBOUND_CORE:{column:1,row:0},
};
export function arcaneMaterialCell(itemId:string){return arcaneMaterialCellById[itemId];}
export function hasArcaneMaterialArtwork(itemId:string){return !!arcaneMaterialCell(itemId);}
