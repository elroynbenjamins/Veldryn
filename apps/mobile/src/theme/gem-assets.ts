import type {ImageSourcePropType} from 'react-native';
import sprite0 from './generated/gem-sprite-v1-data-0';
import sprite1 from './generated/gem-sprite-v1-data-1';
import sprite2 from './generated/gem-sprite-v1-data-2';

export const GEM_SPRITE_V1_SIZE=768;
export const GEM_SPRITE_V1_COLUMNS=6;
export const GEM_SPRITE_V1_ROWS=6;
export const GEM_SPRITE_V1_CELL=128;

/**
 * Compact generated pixel-art atlas for canonical Stat/Effect Gems and gem
 * progression materials. The atlas is embedded as data so Expo/Metro can use
 * it without adding a native asset pipeline dependency.
 */
export const gemSpriteSourceV1:ImageSourcePropType={
  uri:'data:image/png;base64,'+sprite0+sprite1+sprite2,
};

export interface GemArtworkCellV1{column:number;row:number;}
export const GEM_ARTWORK_CELL_BY_KEY_V1:Readonly<Record<string,GemArtworkCellV1>>={
  stat_might:{column:0,row:0},
  stat_vitality:{column:1,row:0},
  stat_iron:{column:2,row:0},
  stat_ward:{column:3,row:0},
  stat_precision:{column:4,row:0},
  stat_keen:{column:5,row:0},

  stat_savage:{column:0,row:1},
  stat_piercing:{column:1,row:1},
  stat_swift:{column:2,row:1},
  stat_potent:{column:3,row:1},
  stat_elusive:{column:4,row:1},
  stat_resolute:{column:5,row:1},

  effect_momentum:{column:0,row:2},
  effect_execution:{column:1,row:2},
  effect_opening_strike:{column:2,row:2},
  effect_predator:{column:3,row:2},
  effect_critical_surge:{column:4,row:2},
  effect_ruin:{column:5,row:2},

  effect_bulwark:{column:0,row:3},
  effect_aegis:{column:1,row:3},
  effect_last_stand:{column:2,row:3},
  effect_retaliation:{column:3,row:3},
  effect_unyielding:{column:4,row:3},
  effect_mercy:{column:5,row:3},

  effect_benediction:{column:0,row:4},
  effect_guardians_gift:{column:1,row:4},
  effect_renewal:{column:2,row:4},
  effect_shared_resolve:{column:3,row:4},
  effect_sustenance:{column:4,row:4},
  effect_battle_rhythm:{column:5,row:4},

  effect_flow:{column:0,row:5},
  effect_opportunist:{column:1,row:5},
  GEM_DUST:{column:2,row:5},
  REGIONAL_CATALYST:{column:3,row:5},
  RADIANT_CATALYST:{column:4,row:5},
};

export function gemArtworkKeyV1(itemId:string){
  if(itemId==='GEM_DUST'||itemId==='REGIONAL_CATALYST'||itemId==='RADIANT_CATALYST')return itemId;
  const match=/^gem:(stat_[a-z_]+|effect_[a-z_]+):g[1-5]$/.exec(itemId);
  return match?.[1];
}
export function gemArtworkCellV1(itemId:string){
  const key=gemArtworkKeyV1(itemId);
  return key?GEM_ARTWORK_CELL_BY_KEY_V1[key]:undefined;
}
export function hasGemArtworkV1(itemId:string){return !!gemArtworkCellV1(itemId);}
