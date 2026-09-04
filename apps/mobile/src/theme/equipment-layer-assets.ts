import {ImageSourcePropType} from 'react-native';
import {LayerRegistry} from '../core/equipment-layers';

// Register approved transparent 128×160 body/slot PNGs here with static require().
// Do not register complete outfit renders as body or equipment layers.
export const equipmentLayerSources:Record<string,ImageSourcePropType>={
  'shared-male-front':require('../../assets/shared-body-v1/male/front.png'),
  'shared-male-back':require('../../assets/shared-body-v1/male/back.png'),
  'shared-female-front':require('../../assets/shared-body-v1/female/front.png'),
  'shared-female-back':require('../../assets/shared-body-v1/female/back.png'),
};
// Only the neutral body is available so far. The resolver continues to report
// missing hair/equipment instead of displaying an inaccurately dressed character.
export const equipmentLayerRegistry:LayerRegistry={
  layers:(['male','female'] as const).map(body=>({
    id:`shared-${body}-body-v1`,classId:'shared',body,slot:'body',
    front:`shared-${body}-front`,back:`shared-${body}-back`,
    width:128,height:160,approved:true,
  })),
  availableSources:Object.keys(equipmentLayerSources),
};
