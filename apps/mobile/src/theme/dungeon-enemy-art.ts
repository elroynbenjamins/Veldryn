import type {ImageSourcePropType} from 'react-native';

const DUNGEON_ENEMY_ART:Readonly<Record<string,ImageSourcePropType>>=Object.freeze({
  'the hollow regent':require('../../assets/dungeon-enemies-v1/hollow-regent.webp'),
  'hollow regent':require('../../assets/dungeon-enemies-v1/hollow-regent.webp'),
  'the coinbound captain':require('../../assets/dungeon-enemies-v1/coinbound-captain.webp'),
  'coinbound captain':require('../../assets/dungeon-enemies-v1/coinbound-captain.webp'),
  'the rimebell colossus':require('../../assets/dungeon-enemies-v1/rimebell-colossus.webp'),
  'rimebell colossus':require('../../assets/dungeon-enemies-v1/rimebell-colossus.webp'),
  'veilshade stalker':require('../../assets/dungeon-enemies-v1/veilshade-stalker.webp'),
  'ledger hexer':require('../../assets/dungeon-enemies-v1/ledger-hexer.webp'),
  'bellfrost spirit':require('../../assets/dungeon-enemies-v1/bellfrost-spirit.webp'),
});

function enemyKey(name:string){return name.trim().toLocaleLowerCase().replace(/\s+/g,' ');}

export function dungeonEnemyPortraitSource(name:string|undefined):ImageSourcePropType|undefined{
  if(!name?.trim())return undefined;
  return DUNGEON_ENEMY_ART[enemyKey(name)];
}

export const DUNGEON_ENEMY_ART_NAMES=Object.freeze([
  'The Hollow Regent',
  'The Coinbound Captain',
  'The Rimebell Colossus',
  'Veilshade Stalker',
  'Ledger Hexer',
  'Bellfrost Spirit',
] as const);
