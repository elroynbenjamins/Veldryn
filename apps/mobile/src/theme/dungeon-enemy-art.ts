import type {ImageSourcePropType} from 'react-native';
import {TRIAL_ENEMY_PORTRAITS} from './trial-enemy-portraits';
import {monsterPortraitSource,regionalMonsterPortraitCell} from './monster-assets';

type RegionalMonsterCell={column:number;row:number};

/**
 * Reuse files already bundled for overworld combat and the 3x3 regional atlas.
 * Values are canonical MONSTERS ids, not new art files or separate copies.
 * Only align a name with a creature whose silhouette/theme is recognizably related.
 * Keep the old encounter names so existing combat replays still resolve.
 */
export const DUNGEON_MONSTER_PORTRAIT_ALIASES:Readonly<Record<string,string>>=Object.freeze({
 // Asterfall roots and lanterns
 'sporeling':'GLOAM_MITE',
 'strangling vine':'THORNLING',
 'sap husk':'BRIAR_HUSK',
 'briar hound':'IRONWOOD_WOLF',
 'rootbound husk':'ANCIENT_TREANT',
 'rootbound heart':'ANCIENT_TREANT',
 // Sunscar constructs, vermin and sorcery
 'orrery scarab':'SUNSCAR_SCORPION',
 'heliolith drone':'FIELD_WISP',
 'the buried heliarch':'GLASSBOUND_SENTINEL',
 'mirage jackal':'IRONWOOD_WOLF',
 'dune phantom':'DUNE_ORACLE',
 'amberglass asp':'SUNSCAR_SCORPION',
 'wellbound colossus':'GLASSBOUND_SENTINEL',
 // Mirage Well: the existing Sunscar Dune Oracle atlas cell serves both
 // encounters. Keep old server/replay names as aliases; no duplicate art.
 'dune sphinx':'DUNE_ORACLE',
 'the veiled sphinx':'DUNE_ORACLE',
 'the veiled oracle':'DUNE_ORACLE',
 // Frostmarch beast and spectral variants
 'rimewolf':'FROSTWOLF',
 'shiverling':'BELLWRAITH',
 'icefang hound':'FROSTWOLF',
 'rimehorn alpha':'FROSTWOLF',
 'the bellbeast of shiverlake':'FROSTWOLF',
 'choir wisp':'BELLWRAITH',
 'bellbound shade':'BELLWRAITH',
 'the frozen cantor':'BELLWRAITH',
 // Ashlands creatures
 'cinder mireling':'BLACKGLASS_MIRELING',
 'blackglass beetle':'GLOAM_MITE',
 'ember wraith':'ASHEN_REVENANT',
 'glassbone hound':'IRONWOOD_WOLF',
 'blackglass devourer':'BLACKGLASS_MIRELING',
 'the blackglass fen prime':'BLACKGLASS_MIRELING',
 'crucible imp':'GLOAM_MITE',
 'prime scoria':'ASHEN_REVENANT',
 'ashen colossus':'CINDER_TITAN',
 'the crucible prime':'CINDER_TITAN',
 // Event dungeon encounters: use existing monsters rather than another icon set.
 'solar reef warden':'GLASSBOUND_SENTINEL',
 'meteoric sentinel':'GLASSBOUND_SENTINEL',
 'hourglass golem':'GLASSBOUND_SENTINEL',
 'thorned effigy':'ANCIENT_TREANT',
 'sorrowbound shade':'BANNER_SHADE',
 'briarling swarm':'THORNLING',
 'pollenmaw':'VENOM_WEAVER',
 'lantern-eater':'GLOAM_MITE',
 'hollow warden':'FALLEN_SENTINEL',
 'the thornheart ancient':'ANCIENT_TREANT',
});
export const DUNGEON_EVENT_TRIAL_PORTRAIT_ALIASES:Readonly<Record<string,string>>=Object.freeze({
 'suncrest corsair':'Gloamblade Raider',
 'astral marauder':'Gloamblade Raider',
 'riftbound herald':'Rift Weaver',
 'yearshade archivist':'Silverbrook Adept',
 'dawnless warden':'Oathglass Sentinel',
 'vowbreaker brigand':'Gloamblade Raider',
 'road reaver':'Gloamblade Raider',
 'iron tollkeeper':'Runebound Bulwark',
 'rimefang marauder':'Bellfang Hunter',
 'aureon, first champion':'Runebound Colossus',
 'the constellation eater':'Rift Wyrm',
 'the last hour':'Regent of Echoes',
 'the severed vow':'Regent of Echoes',
});

function monsterKeyId(key:string){
 return DUNGEON_MONSTER_PORTRAIT_ALIASES[key]??key.toUpperCase().replace(/ /g,'_');
}
function monsterImageForKey(key:string){return monsterPortraitSource(monsterKeyId(key));}
function monsterAtlasCellForKey(key:string):RegionalMonsterCell|undefined{return regionalMonsterPortraitCell(monsterKeyId(key));}
function baseKey(key:string){return key.endsWith(' echo')?key.slice(0,-5):key;}


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

/** Display-only monster renames; server combatant IDs, mechanics, and
 * historical replay data remain untouched. */
const DUNGEON_ENEMY_DISPLAY_NAMES:Readonly<Record<string,string>>=Object.freeze({
 'dune sphinx':'Dune Oracle',
 'the veiled sphinx':'The Veiled Oracle',
});
export function dungeonEnemyDisplayName(name:string):string{
 return DUNGEON_ENEMY_DISPLAY_NAMES[enemyKey(name)]??name;
}

/** Rename creature-specific attack labels in the UI, without changing
 * the server ability IDs, cast timings or effect coefficients. */
export function dungeonEnemyAbilityDisplayName(name:string):string{
 return name.replace(/^Sphinx (?=Riddleburst|Pursuit$)/,'Oracle ');
}
const TRIAL_ART_BY_KEY:Readonly<Record<string,ImageSourcePropType>>=Object.freeze(
 Object.fromEntries(Object.entries(TRIAL_ENEMY_PORTRAITS).map(([name,art])=>[enemyKey(name),art])),
);

/** Return existing bespoke/overworld/Trial images. Regional atlas cells are
 * returned by dungeonEnemyRegionalPortraitCell and cropped at render time,
 * rather than emitting nine new files or presenting the whole spritesheet. */
export function dungeonEnemyPortraitSource(name:string|undefined):ImageSourcePropType|undefined{
 if(!name?.trim())return undefined;
 const key=enemyKey(name),base=baseKey(key);
 const trialAlias=DUNGEON_TRIAL_PORTRAIT_ALIASES[base]??DUNGEON_EVENT_TRIAL_PORTRAIT_ALIASES[base];
 // Order: bespoke dungeon art, existing same-species overworld art, Trial NPC.
 // Echo variants deliberately share their original enemy portrait at no new cost.
 return DUNGEON_ENEMY_ART[key]??DUNGEON_ENEMY_ART[base]
  ??monsterImageForKey(key)??monsterImageForKey(base)
  ??TRIAL_ART_BY_KEY[key]??TRIAL_ART_BY_KEY[base]
  ??(trialAlias?TRIAL_ART_BY_KEY[enemyKey(trialAlias)]:undefined);
}

/** A single existing 3x3 atlas backs all nine regional monsters.
 * Never return the full sheet as a single monster portrait. */
export function dungeonEnemyRegionalPortraitCell(name:string|undefined):RegionalMonsterCell|undefined{
 if(!name?.trim())return undefined;
 const key=enemyKey(name);
 return monsterAtlasCellForKey(key)??monsterAtlasCellForKey(baseKey(key));
}

export const DUNGEON_ENEMY_ART_NAMES=Object.freeze([
  'The Hollow Regent',
  'The Coinbound Captain',
  'The Rimebell Colossus',
  'Veilshade Stalker',
  'Ledger Hexer',
  'Bellfrost Spirit',
] as const);
