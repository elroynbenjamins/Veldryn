import type {ImageSourcePropType} from 'react-native';
import type {BodyPresentation,ClassId} from '../core/types';
import {acceptedFrontCharacterSkinArtwork} from './accepted-front-character-assets';
import {eventCharacterSkinArtwork} from './event-character-assets';

export {
  classEmblemArtwork as classArtwork,
  classEmblemIconArtwork as classIconArtwork,
} from './class-emblem-assets';

/** Shared neutral creation skin used by every class until a set skin is chosen. */
export const startingCharacterArtwork:Record<BodyPresentation,Record<'front'|'back',ImageSourcePropType>>={
  male:{
    front:require('../../assets/character-base-v1/male-front.png'),
    back:require('../../assets/character-base-v1/male-back.png'),
  },
  female:{
    front:require('../../assets/character-base-v1/female-front.png'),
    back:require('../../assets/character-base-v1/female-back.png'),
  },
};

export type CharacterSkinArtwork=Record<BodyPresentation,{front:ImageSourcePropType;back?:ImageSourcePropType}>;

export const approvedCharacterSkinArtwork:Record<string,CharacterSkinArtwork>={
  ...acceptedFrontCharacterSkinArtwork,
  ...eventCharacterSkinArtwork,
  'beginner-ironwarden-recruit':{
    male:{front:require('../../assets/character-runtime/beginner/ironwarden-recruit/male-front.png'),back:require('../../assets/character-runtime/beginner/ironwarden-recruit/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/ironwarden-recruit/female-front.png'),back:require('../../assets/character-runtime/beginner/ironwarden-recruit/female-back.png')},
  },
  'beginner-wallkeeper-initiate':{
    male:{front:require('../../assets/character-runtime/beginner/wallkeeper-initiate/male-front.png'),back:require('../../assets/character-runtime/beginner/wallkeeper-initiate/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/wallkeeper-initiate/female-front.png'),back:require('../../assets/character-runtime/beginner/wallkeeper-initiate/female-back.png')},
  },
  'beginner-chainwatch-novice':{
    male:{front:require('../../assets/character-runtime/beginner/chainwatch-novice/male-front.png'),back:require('../../assets/character-runtime/beginner/chainwatch-novice/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/chainwatch-novice/female-front.png'),back:require('../../assets/character-runtime/beginner/chainwatch-novice/female-back.png')},
  },
  'beginner-sunlamp-acolyte':{
    male:{front:require('../../assets/character-runtime/beginner/sunlamp-acolyte/male-front.png'),back:require('../../assets/character-runtime/beginner/sunlamp-acolyte/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/sunlamp-acolyte/female-front.png'),back:require('../../assets/character-runtime/beginner/sunlamp-acolyte/female-back.png')},
  },
  'beginner-trailbow-scout':{
    male:{front:require('../../assets/character-runtime/beginner/trailbow-scout/male-front.png'),back:require('../../assets/character-runtime/beginner/trailbow-scout/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/trailbow-scout/female-front.png'),back:require('../../assets/character-runtime/beginner/trailbow-scout/female-back.png')},
  },
  'beginner-breaksteel-marauder':{
    male:{front:require('../../assets/character-runtime/beginner/breaksteel-marauder/male-front.png'),back:require('../../assets/character-runtime/beginner/breaksteel-marauder/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/breaksteel-marauder/female-front.png'),back:require('../../assets/character-runtime/beginner/breaksteel-marauder/female-back.png')},
  },
  'beginner-runespark-adept':{
    male:{front:require('../../assets/character-runtime/beginner/runespark-adept/male-front.png'),back:require('../../assets/character-runtime/beginner/runespark-adept/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/runespark-adept/female-front.png'),back:require('../../assets/character-runtime/beginner/runespark-adept/female-back.png')},
  },
  'beginner-twinstep-initiate':{
    male:{front:require('../../assets/character-runtime/beginner/twinstep-initiate/male-front.png'),back:require('../../assets/character-runtime/beginner/twinstep-initiate/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/twinstep-initiate/female-front.png'),back:require('../../assets/character-runtime/beginner/twinstep-initiate/female-back.png')},
  },
  'beginner-earthseal-disciple':{
    male:{front:require('../../assets/character-runtime/beginner/earthseal-disciple/male-front.png'),back:require('../../assets/character-runtime/beginner/earthseal-disciple/male-back.png')},
    female:{front:require('../../assets/character-runtime/beginner/earthseal-disciple/female-front.png'),back:require('../../assets/character-runtime/beginner/earthseal-disciple/female-back.png')},
  },
};
