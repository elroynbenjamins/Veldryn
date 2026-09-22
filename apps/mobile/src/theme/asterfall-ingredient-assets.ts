import type {ImageSourcePropType} from 'react-native';
import chunk0 from './generated/asterfall-ingredients-v1-data-0';
import chunk1 from './generated/asterfall-ingredients-v1-data-1';
import chunk2 from './generated/asterfall-ingredients-v1-data-2';
import chunk3 from './generated/asterfall-ingredients-v1-data-3';

export const ASTERFALL_INGREDIENT_CELL=64;
export const ASTERFALL_INGREDIENT_SHEET_SIZE=256;
export const asterfallIngredientSheet:ImageSourcePropType={
  uri:'data:image/png;base64,'+chunk0+chunk1+chunk2+chunk3,
};

export interface AsterfallIngredientCell{column:number;row:number;}
export const asterfallIngredientCellById:Readonly<Record<string,AsterfallIngredientCell>>={
  BOAR_HIDE:{column:0,row:0},
  WOLF_PELT:{column:1,row:0},
  IRONWOOD_FANG:{column:2,row:0},
  MOSS_FIBER:{column:3,row:0},

  WISP_DUST:{column:0,row:1},
  THORN_SAP:{column:1,row:1},
  TROLL_HIDE:{column:2,row:1},
  ECHO_BAT_WING:{column:3,row:1},

  OATHGLASS_SHARD:{column:0,row:2},
  TORN_OATHCLOTH:{column:1,row:2},
  LANTERNSTEEL_SHARD:{column:2,row:2},
  FALLEN_RIVET:{column:3,row:2},

  ECHO_TOUCHED_PELT:{column:0,row:3},
  BANNER_ASH:{column:1,row:3},
  OATHGLASS_FRAGMENT:{column:2,row:3},
  GLOAM_DUST:{column:3,row:3},
};

export function asterfallIngredientCell(itemId:string){return asterfallIngredientCellById[itemId];}
export function hasAsterfallIngredientArtwork(itemId:string){return !!asterfallIngredientCell(itemId);}
