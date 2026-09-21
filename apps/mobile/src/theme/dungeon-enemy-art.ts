import type {ImageSourcePropType} from 'react-native';

const DUNGEON_ENEMY_ART:Readonly<Record<string,ImageSourcePropType>>=Object.freeze({
  'the hollow regent':require('../../assets/dungeon-enemies-v1/hollow-regent.png'),
  'hollow regent':require('../../assets/dungeon-enemies-v1/hollow-regent.png'),
  'the coinbound captain':require('../../assets/dungeon-enemies-v1/coinbound-captain.png'),
  'coinbound captain':require('../../assets/dungeon-enemies-v1/coinbound-captain.png'),
  'the rimebell colossus':require('../../assets/dungeon-enemies-v1/rimebell-colossus.png'),
  'rimebell colossus':require('../../assets/dungeon-enemies-v1/rimebell-colossus.png'),
  'veilshade stalker':require('../../assets/dungeon-enemies-v1/veilshade-stalker.png'),
  'ledger hexer':require('../../assets/dungeon-enemies-v1/ledger-hexer.png'),
  'bellfrost spirit':require('../../assets/dungeon-enemies-v1/bellfrost-spirit.png'),
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
