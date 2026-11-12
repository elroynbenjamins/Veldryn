/** Six transparent pixel icons on a single 3x2 atlas (one 40px cell each). */
export const CROSS_PROFESSION_ICON_CELL=40;
export const CROSS_PROFESSION_ICON_WIDTH=120;
export const CROSS_PROFESSION_ICON_HEIGHT=80;
export const CROSS_PROFESSION_ICON_SOURCE=require('../../assets/crafting-components/cross-profession-components-v1.webp');
export const CROSS_PROFESSION_ICON_CELLS:Readonly<Record<string,{column:number;row:number}>>={
  METAL_CLASPS:{column:0,row:0},
  REINFORCED_BUCKLES:{column:1,row:0},
  ARMOR_RIVETS:{column:2,row:0},
  CLOTH_BINDINGS:{column:0,row:1},
  PADDED_LININGS:{column:1,row:1},
  REINFORCED_STRAPS:{column:2,row:1},
};
export function crossProfessionIconCell(itemId:string){return CROSS_PROFESSION_ICON_CELLS[itemId];}
