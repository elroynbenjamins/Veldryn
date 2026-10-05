import type {ImageSourcePropType} from 'react-native';
import type {ClassId} from '../core/types';

/** Native 256×256 dp; Metro selects exact @2x/@3x density variants. */
export const classEmblemArtwork:Record<ClassId,ImageSourcePropType>={
  IRONWARDEN:require('../../assets/class-emblems-v2/hero/ironwarden.webp'),
  BASTION:require('../../assets/class-emblems-v3-recolor/hero/bastion.webp'),
  DREADGUARD:require('../../assets/class-emblems-v3-recolor/hero/dreadguard.webp'),
  DAWNKEEPER:require('../../assets/class-emblems-v3-recolor/hero/dawnkeeper.webp'),
  WAYFINDER:require('../../assets/class-emblems-v2/hero/wayfinder.webp'),
  RAVAGER:require('../../assets/class-emblems-v3-recolor/hero/ravager.webp'),
  HEXWEAVER:require('../../assets/class-emblems-v2/hero/hexweaver.webp'),
  KNIFE_DANCER:require('../../assets/class-emblems-v3-recolor/hero/knife_dancer.webp'),
  STONECALLER:require('../../assets/class-emblems-v3-recolor/hero/stonecaller.webp'),
};

/** Native 62×62 dp; Metro selects exact @2x/@3x density variants. */
export const classEmblemIconArtwork:Record<ClassId,ImageSourcePropType>={
  IRONWARDEN:require('../../assets/class-emblems-v2/icon/ironwarden.webp'),
  BASTION:require('../../assets/class-emblems-v3-recolor/icon/bastion.webp'),
  DREADGUARD:require('../../assets/class-emblems-v3-recolor/icon/dreadguard.webp'),
  DAWNKEEPER:require('../../assets/class-emblems-v3-recolor/icon/dawnkeeper.webp'),
  WAYFINDER:require('../../assets/class-emblems-v2/icon/wayfinder.webp'),
  RAVAGER:require('../../assets/class-emblems-v3-recolor/icon/ravager.webp'),
  HEXWEAVER:require('../../assets/class-emblems-v2/icon/hexweaver.webp'),
  KNIFE_DANCER:require('../../assets/class-emblems-v3-recolor/icon/knife_dancer.webp'),
  STONECALLER:require('../../assets/class-emblems-v3-recolor/icon/stonecaller.webp'),
};
