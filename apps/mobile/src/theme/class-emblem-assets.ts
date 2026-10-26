import type {ImageSourcePropType} from 'react-native';
import type {ClassId} from '../core/types';

/** Native 256×256 dp; Metro selects exact @2x/@3x density variants. */
export const classEmblemArtwork:Record<ClassId,ImageSourcePropType>={
  IRONWARDEN:require('../../assets/class-emblems-v4/hero/ironwarden.webp'),
  BASTION:require('../../assets/class-emblems-v4/hero/bastion.webp'),
  DREADGUARD:require('../../assets/class-emblems-v4/hero/dreadguard.webp'),
  DAWNKEEPER:require('../../assets/class-emblems-v4/hero/dawnkeeper.webp'),
  WAYFINDER:require('../../assets/class-emblems-v4/hero/wayfinder.webp'),
  RAVAGER:require('../../assets/class-emblems-v4/hero/ravager.webp'),
  HEXWEAVER:require('../../assets/class-emblems-v4/hero/hexweaver.webp'),
  KNIFE_DANCER:require('../../assets/class-emblems-v4/hero/knife_dancer.webp'),
  STONECALLER:require('../../assets/class-emblems-v4/hero/stonecaller.webp'),
};

/** Native 62×62 dp; Metro selects exact @2x/@3x density variants. */
export const classEmblemIconArtwork:Record<ClassId,ImageSourcePropType>={
  IRONWARDEN:require('../../assets/class-emblems-v4/icon/ironwarden.webp'),
  BASTION:require('../../assets/class-emblems-v4/icon/bastion.webp'),
  DREADGUARD:require('../../assets/class-emblems-v4/icon/dreadguard.webp'),
  DAWNKEEPER:require('../../assets/class-emblems-v4/icon/dawnkeeper.webp'),
  WAYFINDER:require('../../assets/class-emblems-v4/icon/wayfinder.webp'),
  RAVAGER:require('../../assets/class-emblems-v4/icon/ravager.webp'),
  HEXWEAVER:require('../../assets/class-emblems-v4/icon/hexweaver.webp'),
  KNIFE_DANCER:require('../../assets/class-emblems-v4/icon/knife_dancer.webp'),
  STONECALLER:require('../../assets/class-emblems-v4/icon/stonecaller.webp'),
};
