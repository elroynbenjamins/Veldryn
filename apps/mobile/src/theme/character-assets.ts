import type {ImageSourcePropType} from 'react-native';
import type {BodyPresentation} from '../core/types';

export {
  classEmblemArtwork as classArtwork,
  classEmblemIconArtwork as classIconArtwork,
} from './class-emblem-assets';

/** Shared neutral creation skin used by every class before a set skin is selected. */
export const startingCharacterArtwork:Record<BodyPresentation,Record<'front'|'back',ImageSourcePropType>>={
  male:{front:require('../../assets/character-base-v1/male-front.png'),back:require('../../assets/character-base-v1/male-back.png')},
  female:{front:require('../../assets/character-base-v1/female-front.png'),back:require('../../assets/character-base-v1/female-back.png')},
};

export type CharacterSkinArtwork=Record<BodyPresentation,{front:ImageSourcePropType;back?:ImageSourcePropType}>;
export const approvedCharacterSkinArtwork:Record<string,CharacterSkinArtwork>={
  'equipment-set:T1_001':{
    male:{front:require('../../assets/character-skins-t1-ironwarden/T1_001/male-front.png')},
    female:{front:require('../../assets/character-skins-t1-ironwarden/T1_001/female-front.png')},
  },
  'equipment-set:T1_002':{
    male:{front:require('../../assets/character-skins-t1-ironwarden/T1_002/male-front.png')},
    female:{front:require('../../assets/character-skins-t1-ironwarden/T1_002/female-front.png')},
  },
  'equipment-set:T1_003':{
    male:{front:require('../../assets/character-skins-t1-ironwarden/T1_003/male-front.png')},
    female:{front:require('../../assets/character-skins-t1-ironwarden/T1_003/female-front.png')},
  },
};
