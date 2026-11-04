import type {ImageSourcePropType} from 'react-native';
import {TRIAL_ENEMY_PORTRAITS} from './trial-enemy-portraits';

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

/** Reuse only lore- and archetype-compatible humanoid NPC portraits.
 * Creature-only enemies keep their distinct appearance (or fallback) instead
 * of being silently illustrated as a human. Old names remain supported for
 * historical run snapshots after a presentation-only rename.
 */
export const DUNGEON_TRIAL_PORTRAIT_ALIASES:Readonly<Record<string,string>>=Object.freeze({
  'briar scout':'Gloamblade Raider',
  'root guardian':'Runebound Bulwark',
  'moss stalker':'Gloamblade Raider',
  'grove sentinel':'Runebound Bulwark',
  'root warden':'Runebound Bulwark',
  'lantern wretch':'Gloamblade Raider',
  'drowned pilgrim':'Silverbrook Adept',
  'bell sentinel':'Oathglass Sentinel',
  'bell-warden':'Oathglass Sentinel',
  'bell warden':'Oathglass Sentinel',
  'fallen lantern knight':'Oathglass Sentinel',
  'banner shade':'Regent Adept',
  'sunstone custodian':'Glasshide Warder',
  'amberglass scribe':'Mirage Oracle',
  'solar watcher':'Mirage Oracle',
  'dustbound scholar':'Mirage Oracle',
  'glassscale stalker':'Duneclaw Stalker',
  'sunscored prowler':'Duneclaw Stalker',
  'well guardian':'Glasshide Warder',
  'orrery warden':'Glasshide Warder',
  'solar archivist':'Mirage Oracle',
  'amberglass sentinel':'Glasshide Warder',
  'veiled huntmaster':'Duneclaw Stalker',
  'glacier stalker':'Bellfang Hunter',
  'frostbound scout':'Bellfang Hunter',
  'lake warden':'Rimeplate Guard',
  'rime cantor':'Choir Acolyte',
  'frozen pilgrim':'Choir Acolyte',
  'choir sentinel':'Rimeplate Guard',
  'glacial acolyte':'Choir Acolyte',
  'choirbreaker':'Choir Acolyte',
  'permafrost warden':'Rimeplate Guard',
  'ashen marauder':'Obsidian Prowler',
  'fen reaver':'Obsidian Prowler',
  'charred adept':'Cinder Channeler',
  'molten pilgrim':'Cinder Channeler',
  'cinderbound guard':'Forgeplate Custodian',
  'fen pyrecaller':'Cinder Channeler',
  'crucible warden':'Forgeplate Custodian',
});

function enemyKey(name:string){return name.trim().toLocaleLowerCase().replace(/\s+/g,' ');}
const TRIAL_ART_BY_KEY:Readonly<Record<string,ImageSourcePropType>>=Object.freeze(
 Object.fromEntries(Object.entries(TRIAL_ENEMY_PORTRAITS).map(([name,art])=>[enemyKey(name),art])),
);

export function dungeonEnemyPortraitSource(name:string|undefined):ImageSourcePropType|undefined{
 if(!name?.trim())return undefined;
 const key=enemyKey(name),alias=DUNGEON_TRIAL_PORTRAIT_ALIASES[key];
 // Existing bespoke dungeon boss/enemy artwork always takes priority.
 return DUNGEON_ENEMY_ART[key]??TRIAL_ART_BY_KEY[key]??(alias?TRIAL_ART_BY_KEY[enemyKey(alias)]:undefined);
}

export const DUNGEON_ENEMY_ART_NAMES=Object.freeze([
  'The Hollow Regent',
  'The Coinbound Captain',
  'The Rimebell Colossus',
  'Veilshade Stalker',
  'Ledger Hexer',
  'Bellfrost Spirit',
] as const);
