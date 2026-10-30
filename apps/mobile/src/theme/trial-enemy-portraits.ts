import type {ImageSourcePropType} from 'react-native';

/** Human portraits keyed by canonical encounter name, never the reusable unit slot. */
export const TRIAL_ENEMY_PORTRAITS:Readonly<Record<string,ImageSourcePropType>>={
 "Runebound Bulwark":require('../../assets/trial-enemies/humans-v2/runebound-bulwark.png'),
 "Gloamblade Raider":require('../../assets/trial-enemies/humans-v2/gloamblade-raider.png'),
 "Silverbrook Adept":require('../../assets/trial-enemies/humans-v2/silverbrook-adept.png'),
 "Glasshide Warder":require('../../assets/trial-enemies/humans-v2/glasshide-warder.png'),
 "Duneclaw Stalker":require('../../assets/trial-enemies/humans-v2/duneclaw-stalker.png'),
 "Mirage Oracle":require('../../assets/trial-enemies/humans-v2/mirage-oracle.png'),
 "Rimeplate Guard":require('../../assets/trial-enemies/humans-v2/rimeplate-guard.png'),
 "Bellfang Hunter":require('../../assets/trial-enemies/humans-v2/bellfang-hunter.png'),
 "Choir Acolyte":require('../../assets/trial-enemies/humans-v2/choir-acolyte.png'),
 "Forgeplate Custodian":require('../../assets/trial-enemies/humans-v2/forgeplate-custodian.png'),
 "Obsidian Prowler":require('../../assets/trial-enemies/humans-v2/obsidian-prowler.png'),
 "Cinder Channeler":require('../../assets/trial-enemies/humans-v2/cinder-channeler.png'),
 "Oathglass Sentinel":require('../../assets/trial-enemies/humans-v2/oathglass-sentinel.png'),
 "Echo Predator":require('../../assets/trial-enemies/humans-v2/echo-predator.png'),
 "Rift Weaver":require('../../assets/trial-enemies/humans-v2/rift-weaver.png'),
 "Crown Bulwark":require('../../assets/trial-enemies/humans-v2/crown-bulwark.png'),
 "Wyrm Hunter":require('../../assets/trial-enemies/humans-v2/wyrm-hunter.png'),
 "Regent Adept":require('../../assets/trial-enemies/humans-v2/regent-adept.png'),
 "Runebound Colossus":require('../../assets/trial-enemies/humans-v2/runebound-colossus.png'),
 "Echo of the Buried Tyrant":require('../../assets/trial-enemies/humans-v2/buried-tyrant.png'),
 "Frostbell Behemoth":require('../../assets/trial-enemies/humans-v2/frostbell-behemoth.png'),
 "Ashforge Juggernaut":require('../../assets/trial-enemies/humans-v2/ashforge-juggernaut.png'),
 "Rift Wyrm":require('../../assets/trial-enemies/humans-v2/rift-wyrm.png'),
 "Regent of Echoes":require('../../assets/trial-enemies/humans-v2/regent-of-echoes.png'),
 "BOSS COMPANION OATHGLASS":require('../../assets/trial-enemies/humans-v2/special-oathglass.png'),
 "BOSS COMPANION TYRANT HEIR":require('../../assets/trial-enemies/humans-v2/special-tyrant-heir.png'),
 "BOSS COMPANION WYRM ECHO":require('../../assets/trial-enemies/humans-v2/special-wyrm-echo.png'),
 "BOSS COMPANION REGENT SHADE":require('../../assets/trial-enemies/humans-v2/special-regent-shade.png'),
 "BOSS COMPANION ASHEN SUNWYRM":require('../../assets/trial-enemies/humans-v2/special-ashen-sunwyrm.png'),
};
export function trialEnemyPortrait(name:string):ImageSourcePropType{return TRIAL_ENEMY_PORTRAITS[name]??TRIAL_ENEMY_PORTRAITS['Runebound Bulwark'];}
export const TRIAL_FORMATION_NAMES=Object.keys(TRIAL_ENEMY_PORTRAITS).slice(0,18);
