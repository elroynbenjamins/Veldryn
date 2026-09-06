import {ImageSourcePropType} from 'react-native';
import {LayerAsset,LayerRegistry} from '../core/equipment-layers';

// Register approved transparent 128×160 body/slot PNGs here with static require().
// Do not register complete outfit renders as body or equipment layers.
export const equipmentLayerSources:Record<string,ImageSourcePropType>={
  'shared-male-front':require('../../assets/shared-body-v1/male/front.png'),
  'shared-male-back':require('../../assets/shared-body-v1/male/back.png'),
  'shared-female-front':require('../../assets/shared-body-v1/female/front.png'),
  'shared-female-back':require('../../assets/shared-body-v1/female/back.png'),
  'aster-iron-chest-male-front':require('../../assets/equipment-layers/aster-iron-chest-v1/male/front.png'),
  'aster-iron-chest-male-back':require('../../assets/equipment-layers/aster-iron-chest-v1/male/back.png'),
  'aster-iron-chest-female-front':require('../../assets/equipment-layers/aster-iron-chest-v1/female/front.png'),
  'aster-iron-chest-female-back':require('../../assets/equipment-layers/aster-iron-chest-v1/female/back.png'),
  'aster-iron-helmet-male-front':require('../../assets/equipment-layers/aster-iron-helmet-v1/male/front.png'),
  'aster-iron-helmet-male-back':require('../../assets/equipment-layers/aster-iron-helmet-v1/male/back.png'),
  'aster-iron-helmet-female-front':require('../../assets/equipment-layers/aster-iron-helmet-v1/female/front.png'),
  'aster-iron-helmet-female-back':require('../../assets/equipment-layers/aster-iron-helmet-v1/female/back.png'),
  'aster-iron-legs-male-front':require('../../assets/equipment-layers/aster-iron-legs-v1/male/front.png'),
  'aster-iron-legs-male-back':require('../../assets/equipment-layers/aster-iron-legs-v1/male/back.png'),
  'aster-iron-legs-female-front':require('../../assets/equipment-layers/aster-iron-legs-v2/female/front.png'),
  'aster-iron-legs-female-back':require('../../assets/equipment-layers/aster-iron-legs-v2/female/back.png'),
  'aster-iron-boots-male-front':require('../../assets/equipment-layers/aster-iron-boots-v1/male/front.png'),
  'aster-iron-boots-male-back':require('../../assets/equipment-layers/aster-iron-boots-v1/male/back.png'),
};
// Only the neutral body is available so far. The resolver continues to report
// missing hair/equipment instead of displaying an inaccurately dressed character.
const bodies:LayerAsset[]=(['male','female'] as const).map(body=>({
    id:`shared-${body}-body-v1`,classId:'shared',body,slot:'body',
    front:`shared-${body}-front`,back:`shared-${body}-back`,
    width:128,height:160,approved:true,
  }));
const cuirasses:LayerAsset[]=(['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'] as const).flatMap(classId=>(['male','female'] as const).map(body=>({
  id:`aster-iron-chest-${classId.toLowerCase()}-${body}`,classId,body,slot:'chest' as const,itemId:'ASTER_IRON_CHEST',
  front:`aster-iron-chest-${body}-front`,back:`aster-iron-chest-${body}-back`,width:128,height:160,approved:true,
})));
const helmets:LayerAsset[]=(['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'] as const).flatMap(classId=>(['male','female'] as const).map(body=>({
  id:`aster-iron-helmet-${classId.toLowerCase()}-${body}`,classId,body,slot:'helmet' as const,itemId:'ASTER_IRON_HELM',
  front:`aster-iron-helmet-${body}-front`,back:`aster-iron-helmet-${body}-back`,width:128,height:160,approved:true,hidesHair:true,
})));
const maleLegs:LayerAsset[]=(['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'] as const).map(classId=>({
  id:`aster-iron-legs-${classId.toLowerCase()}-male`,classId,body:'male' as const,slot:'legs' as const,itemId:'ASTER_IRON_LEGS',
  front:'aster-iron-legs-male-front',back:'aster-iron-legs-male-back',width:128,height:160,approved:true,
}));
const femaleLegs:LayerAsset[]=(['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'] as const).map(classId=>({
  id:`aster-iron-legs-${classId.toLowerCase()}-female`,classId,body:'female' as const,slot:'legs' as const,itemId:'ASTER_IRON_LEGS',
  front:'aster-iron-legs-female-front',back:'aster-iron-legs-female-back',width:128,height:160,approved:true,
}));
const maleBoots:LayerAsset[]=(['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'] as const).map(classId=>({
  id:`aster-iron-boots-${classId.toLowerCase()}-male`,classId,body:'male' as const,slot:'boots' as const,itemId:'ASTER_IRON_BOOTS',front:'aster-iron-boots-male-front',back:'aster-iron-boots-male-back',width:128,height:160,approved:true,
}));
export const equipmentLayerRegistry:LayerRegistry={
  layers:[...bodies,...cuirasses,...helmets,...maleLegs,...femaleLegs,...maleBoots],
  availableSources:Object.keys(equipmentLayerSources),
};
