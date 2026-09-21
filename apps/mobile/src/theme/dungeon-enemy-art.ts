import type {ImageSourcePropType} from 'react-native';

const NORMALIZED_ENEMY_KEY:Readonly<Record<string,ImageSourcePropType>>=Object.freeze({
 'the hollow regent':require('../../assets/dungeon-enemies-v1/the_hollow_regent.webp'),
 'the coinbound captain':require('../../assets/dungeon-enemies-v1/the_coinbound_captain.webp'),
 'the rimebell colossus':require('../../assets/dungeon-enemies-v1/the_rimebell_colossus.webp'),
 'veilshade stalker':require('../../assets/dungeon-enemies-v1/veilshade_stalker.webp'),
 'ledger hexer':require('../../assets/dungeon-enemies-v1/ledger_hexer.webp'),
 'bellfrost spirit':require('../../assets/dungeon-enemies-v1/bellfrost_spirit.webp'),
});

export const DUNGEON_ENEMY_ART_NAMES=Object.freeze([
 'The Hollow Regent',
 'The Coinbound Captain',
 'The Rimebell Colossus',
 'Veilshade Stalker',
 'Ledger Hexer',
 'Bellfrost Spirit',
] as const);

export function dungeonEnemyPortraitSource(name:string|undefined):ImageSourcePropType|undefined{
 if(!name)return undefined;
 return NORMALIZED_ENEMY_KEY[name.trim().toLocaleLowerCase()];
}
