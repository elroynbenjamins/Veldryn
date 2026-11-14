import type {Language} from './languages';
import {localizedItemName} from './starter-item-names';

/**
 * German display names for server-authored Sanctuary Expeditions.
 * Guard each translation with the immutable mission ID AND exact English name.
 * Unknown missions and renamed source copy must be shown unchanged.
 */
export const germanCompanionMissionNames:Readonly<Record<string,readonly [string,string]>>={
 MISSION_SCOUT_2H:['Asterfall Perimeter Patrol','Grenzpatrouille von Asterfall'],
 MISSION_APPRENTICE_3H:['Apprentice Field Survey','Felderkundung der Lehrlinge'],
 MISSION_SILVERBROOK_4H:['Silverbrook Relief Run','Hilfslieferung nach Silverbrook'],
 MISSION_SUNSCAR_4H:['Sunscar Caravan Guard','Karawanenwache von Sunscar'],
 MISSION_FROST_SCOUT_4H:['Frostmarch Whiteout Scout','Schneesturmerkundung in Frostmarch'],
 MISSION_ASTERFALL_SHRINE_8H:['Forgotten Asterfall Shrine','Vergessener Schrein von Asterfall'],
 MISSION_SUNSCAR_RUINS_8H:['Sunscar Ruin Survey','Ruinenerkundung in Sunscar'],
 MISSION_FROST_8H:['Frostmarch Bell Route','Glockenpfad von Frostmarch'],
 MISSION_ASH_RESCUE_8H:['Ashlands Furnace Rescue','Rettung am Schmelzofen der Ashlands'],
 MISSION_ASH_12H:['Ashlands Crucible Watch','Schmelztiegelwache der Ashlands'],
 MISSION_GREENFIELDS_FORAGE_2H:['Greenfields Forage Run','Sammelstreifzug in Greenfields'],
 MISSION_IRONWOOD_TRACK_4H:['Ironwood Tracking Detail','Spurensuche im Eisenwald'],
 MISSION_SUNSCAR_RELIC_6H:['Sunscar Relic Survey','Reliktsuche in Sunscar'],
 MISSION_FROST_RESONANCE_6H:['Frostmarch Resonance Survey','Resonanzerkundung in Frostmarch'],
 MISSION_ASHLANDS_SALVAGE_8H:['Blackglass Salvage Run','Bergungstour zum Schwarzglas'],
 MISSION_OLD_FRIENDS_8H:['Old Friends Patrol','Patrouille alter Gefährten'],
 MISSION_PRESTIGE_VIGIL_12H:['Sanctuary Prestige Vigil','Prestigewache der Zuflucht'],
};

export function companionMissionDisplayName(language:Language,missionId:string,source:string):string{
 const entry=germanCompanionMissionNames[missionId];
 return language==='de'&&entry?.[0]===source?entry[1]:source;
}

/** Two mission-only backend resource IDs are not part of the item-name registry. */
const germanMissionOnlyMaterials:Readonly<Record<string,string>>={
 SUPPLIES:'Vorräte',
 TRIAL_SANCTUARY_MATERIAL:'Material der Begleiterzuflucht',
};

export function companionMissionMaterialName(language:Language,itemId:string):string{
 if(language==='de'&&Object.prototype.hasOwnProperty.call(germanMissionOnlyMaterials,itemId))
  return germanMissionOnlyMaterials[itemId];
 return localizedItemName(language,itemId);
}
