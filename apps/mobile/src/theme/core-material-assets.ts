import type {ImageSourcePropType} from 'react-native';
import temperingDust from './generated/tempering-dust-v1-data';
import temperingCore from './generated/tempering-core-v1-data';
import holyWater from './generated/holy-water-v1-data';

export const coreMaterialIconSourceById:Readonly<Record<string,ImageSourcePropType>>={
  TEMPERING_DUST:{uri:'data:image/png;base64,'+temperingDust},
  TEMPERING_CORE:{uri:'data:image/png;base64,'+temperingCore},
  HOLY_WATER:{uri:'data:image/png;base64,'+holyWater},
};
