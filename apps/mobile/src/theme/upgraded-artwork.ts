import type {ImageSourcePropType} from 'react-native';

/** Approved portraits, resized for 144px heroes at high device pixel densities. */
export const companionPortraits=new Map<string,ImageSourcePropType>([
  ['UNIT_001',require('../../assets/companions-v2/ironwood-hound-v1.png')],
  ['UNIT_002',require('../../assets/companions-v2/runebound-sentry-v1.png')],
  ['UNIT_003',require('../../assets/companions-v2/silverbrook-sprite-v1.png')],
  ['UNIT_004',require('../../assets/companions-v2/briarhorn-cub-v1.png')],
  ['UNIT_005',require('../../assets/companions-v2/lantern-wisp-v1.png')],
  ['UNIT_006',require('../../assets/companions-v2/oathbound-page-v1.png')],
  ['UNIT_007',require('../../assets/companions-v2/gloamknife-shade-v1.png')],
  ['UNIT_008',require('../../assets/companions-v2/dawnwing-v2.png')],
  ['UNIT_009',require('../../assets/companions-v2/echo-stalker-v2.png')],
  ['UNIT_010',require('../../assets/companions-v2/forge-automaton-v1.png')],
  ['UNIT_011',require('../../assets/companions-v2/veyrens-memory-v1.png')],
  ['UNIT_012',require('../../assets/companions-v2/oathglass-knightling-v1.png')],
  ['UNIT_013',require('../../assets/companions-v2/dune-stalker-v1.png')],
  ['UNIT_014',require('../../assets/companions-v2/oasis-djinnling-v1.png')],
  ['UNIT_015',require('../../assets/companions-v2/solar-scarab-v1.png')],
  ['UNIT_016',require('../../assets/companions-v2/tyrants-heir-v1.png')],
  ['UNIT_017',require('../../assets/companions-v2/rime-wolf-pup-v1.png')],
  ['UNIT_018',require('../../assets/companions-v2/bell-sprite-v1.png')],
  ['UNIT_019',require('../../assets/companions-v2/choir-golem-v1.png')],
  ['UNIT_020',require('../../assets/companions-v2/wyrm-echo-v2.png')],
  ['UNIT_021',require('../../assets/companions-v2/obsidian-drakelet-v1.png')],
  ['UNIT_022',require('../../assets/companions-v2/forge-custodian-v1.png')],
  ['UNIT_023',require('../../assets/companions-v2/primal-spark-v1.png')],
  ['UNIT_024',require('../../assets/companions-v2/regent-shade-v1.png')],
]);

/** Veillands artwork is a preview; availability remains controlled by world content. */
export const regionScenes:Readonly<Record<string,ImageSourcePropType>>={
  GREENFIELDS:require('../../assets/world/regions-v2/greenfields-pixel-v2.jpg'),
  SILVERBROOK:require('../../assets/world/regions-v2/silverbrook-pixel-v1.jpg'),
  IRONWOOD:require('../../assets/world/regions-v2/ironwood-forest-pixel-v1.jpg'),
  OLD_MINES:require('../../assets/world/regions-v2/old-mines-pixel-v1.jpg'),
  KINGS_ROAD:require('../../assets/world/regions-v2/kings-road-pixel-v1.jpg'),
  SUNSCAR:require('../../assets/world/regions-v2/sunscar-pixel-v1.jpg'),
  FROSTMARCH:require('../../assets/world/regions-v2/frostmarch-pixel-v1.jpg'),
  ASHLANDS:require('../../assets/world/regions-v2/ashlands-pixel-v1.jpg'),
  VEILLANDS:require('../../assets/world/regions-v2/veillands-pixel-v1.jpg'),
};
