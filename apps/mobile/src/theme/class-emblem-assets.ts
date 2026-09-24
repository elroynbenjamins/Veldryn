import type {ImageSourcePropType} from 'react-native';
import type {ClassId} from '../core/types';

/** Native 256×256 dp; Metro selects exact @2x/@3x density variants. */
export const classEmblemArtwork:Record<ClassId,ImageSourcePropType>={
  IRONWARDEN:require('../../assets/class-emblems-v2/hero/ironwarden.png'),
  BASTION:require('../../assets/class-emblems-v3-recolor/hero/bastion.png'),
  DREADGUARD:require('../../assets/class-emblems-v3-recolor/hero/dreadguard.png'),
  DAWNKEEPER:require('../../assets/class-emblems-v3-recolor/hero/dawnkeeper.png'),
  WAYFINDER:require('../../assets/class-emblems-v2/hero/wayfinder.png'),
  RAVAGER:require('../../assets/class-emblems-v3-recolor/hero/ravager.png'),
  HEXWEAVER:require('../../assets/class-emblems-v2/hero/hexweaver.png'),
  KNIFE_DANCER:require('../../assets/class-emblems-v3-recolor/hero/knife_dancer.png'),
  STONECALLER:require('../../assets/class-emblems-v3-recolor/hero/stonecaller.png'),
};

/** Native 62×62 dp; Metro selects exact @2x/@3x density variants. */
export const classEmblemIconArtwork:Record<ClassId,ImageSourcePropType>={
  IRONWARDEN:require('../../assets/class-emblems-v2/icon/ironwarden.png'),
  BASTION:require('../../assets/class-emblems-v3-recolor/icon/bastion.png'),
  DREADGUARD:require('../../assets/class-emblems-v3-recolor/icon/dreadguard.png'),
  DAWNKEEPER:require('../../assets/class-emblems-v3-recolor/icon/dawnkeeper.png'),
  WAYFINDER:require('../../assets/class-emblems-v2/icon/wayfinder.png'),
  RAVAGER:require('../../assets/class-emblems-v3-recolor/icon/ravager.png'),
  HEXWEAVER:require('../../assets/class-emblems-v2/icon/hexweaver.png'),
  KNIFE_DANCER:require('../../assets/class-emblems-v3-recolor/icon/knife_dancer.png'),
  STONECALLER:require('../../assets/class-emblems-v3-recolor/icon/stonecaller.png'),
};
