import type {ImageSourcePropType} from 'react-native';

/** Human portraits keyed by canonical encounter name, never the reusable unit slot. */
export const TRIAL_ENEMY_PORTRAITS:Readonly<Record<string,ImageSourcePropType>>={
 "Runebound Bulwark":require('../../assets/trial-enemies/humans-v2/runebound-bulwark.webp'),
 "Gloamblade Raider":require('../../assets/trial-enemies/humans-v2/gloamblade-raider.webp'),
 "Silverbrook Adept":require('../../assets/trial-enemies/humans-v2/silverbrook-adept.webp'),
 "Glasshide Warder":require('../../assets/trial-enemies/humans-v2/glasshide-warder.webp'),
 "Duneclaw Stalker":require('../../assets/trial-enemies/humans-v2/duneclaw-stalker.webp'),
 "Mirage Oracle":require('../../assets/trial-enemies/humans-v2/mirage-oracle.webp'),
 "Rimeplate Guard":require('../../assets/trial-enemies/humans-v2/rimeplate-guard.webp'),
 "Bellfang Hunter":require('../../assets/trial-enemies/humans-v2/bellfang-hunter.webp'),
 "Choir Acolyte":require('../../assets/trial-enemies/humans-v2/choir-acolyte.webp'),
 "Forgeplate Custodian":require('../../assets/trial-enemies/humans-v2/forgeplate-custodian.webp'),
 "Obsidian Prowler":require('../../assets/trial-enemies/humans-v2/obsidian-prowler.webp'),
 "Cinder Channeler":require('../../assets/trial-enemies/humans-v2/cinder-channeler.webp'),
 "Oathglass Sentinel":require('../../assets/trial-enemies/humans-v2/oathglass-sentinel.webp'),
 "Echo Predator":require('../../assets/trial-enemies/humans-v2/echo-predator.webp'),
 "Rift Weaver":require('../../assets/trial-enemies/humans-v2/rift-weaver.webp'),
 "Crown Bulwark":require('../../assets/trial-enemies/humans-v2/crown-bulwark.webp'),
 "Wyrm Hunter":require('../../assets/trial-enemies/humans-v2/wyrm-hunter.webp'),
 "Regent Adept":require('../../assets/trial-enemies/humans-v2/regent-adept.webp'),
 "Runebound Colossus":require('../../assets/trial-enemies/humans-v2/runebound-colossus.webp'),
 "Echo of the Buried Tyrant":require('../../assets/trial-enemies/humans-v2/buried-tyrant.webp'),
 "Frostbell Behemoth":require('../../assets/trial-enemies/humans-v2/frostbell-behemoth.webp'),
 "Ashforge Juggernaut":require('../../assets/trial-enemies/humans-v2/ashforge-juggernaut.webp'),
 "Rift Wyrm":require('../../assets/trial-enemies/humans-v2/rift-wyrm.webp'),
 "Regent of Echoes":require('../../assets/trial-enemies/humans-v2/regent-of-echoes.webp'),
 "BOSS COMPANION OATHGLASS":require('../../assets/trial-enemies/humans-v2/special-oathglass.webp'),
 "BOSS COMPANION TYRANT HEIR":require('../../assets/trial-enemies/humans-v2/special-tyrant-heir.webp'),
 "BOSS COMPANION WYRM ECHO":require('../../assets/trial-enemies/humans-v2/special-wyrm-echo.webp'),
 "BOSS COMPANION REGENT SHADE":require('../../assets/trial-enemies/humans-v2/special-regent-shade.webp'),
 "BOSS COMPANION ASHEN SUNWYRM":require('../../assets/trial-enemies/humans-v2/special-ashen-sunwyrm.webp'),
};
export function trialEnemyPortrait(name:string):ImageSourcePropType{return TRIAL_ENEMY_PORTRAITS[name]??TRIAL_ENEMY_PORTRAITS['Runebound Bulwark'];}
export const TRIAL_FORMATION_NAMES=Object.keys(TRIAL_ENEMY_PORTRAITS).slice(0,18);
