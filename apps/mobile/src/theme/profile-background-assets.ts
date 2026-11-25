import {DRACONIC_IDS,DRACONIC_COLLECTION} from '../core/draconic-showcase-layout';
import {getDraconicAssets} from './draconic-integration-assets';
const draconic=getDraconicAssets();
import {ImageSourcePropType} from 'react-native';
import {CELESTIAL_IDS,getEnabledCelestialAssets} from './celestial-integration-assets';
const celestial=getEnabledCelestialAssets();

export interface ProfileBackgroundPreview{
  id:string;
  name:string;
  source:ImageSourcePropType;
  status:'export_prepared';
  unlockBinding:null;
}

/** Profile preview assets. Dungeon rewards remain gated by account ownership and release settings. */
export const PROFILE_BACKGROUND_PREVIEWS:readonly ProfileBackgroundPreview[]=[
  {id:'bg_veilbreak',name:'Veilbreak Gothic Moonruins',source:require('../../assets/profile-backgrounds/bg_veilbreak.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_frostfall',name:'Aurora Winter Sky',source:require('../../assets/profile-backgrounds/bg_frostfall.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_harvestwake',name:'Harvestwake Autumn Market',source:require('../../assets/profile-backgrounds/bg_harvestwake.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_grand_storehouse',name:'Grand Storehouse',source:require('../../assets/profile-backgrounds/bg_harvestwake.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_kingdom_approach',name:'Kingdom Approach',source:require('../../assets/profile-backgrounds/bg_kingdom_approach.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_forest_sanctum',name:'Forest Sanctum',source:require('../../assets/profile-backgrounds/bg_forest_sanctum.webp'),status:'export_prepared',unlockBinding:null},
  {id:'dungeon:asterfall:rootbound-sanctuary',name:'Rootbound Sanctuary',source:require('../../assets/profile-backgrounds/dungeon-asterfall-rootbound-sanctuary.webp'),status:'export_prepared',unlockBinding:null},
  {id:'dungeon:sunscar:buried-observatory',name:'Buried Observatory',source:require('../../assets/profile-backgrounds/dungeon-sunscar-buried-observatory.webp'),status:'export_prepared',unlockBinding:null},
  {id:'dungeon:frostmarch:shiverlake-reflections',name:'Shiverlake Reflections',source:require('../../assets/profile-backgrounds/dungeon-frostmarch-shiverlake-reflections.webp'),status:'export_prepared',unlockBinding:null},
  ...(celestial?[{id:CELESTIAL_IDS.background,name:'Astral Sanctum',source:celestial.scene.background,status:'export_prepared' as const,unlockBinding:null}]:[]),
  ...(draconic?[{id:DRACONIC_IDS.background,name:DRACONIC_COLLECTION.backgroundName,source:draconic.scene.background,status:'export_prepared' as const,unlockBinding:null}]:[]),
  {id:'premium:celestial-sovereign:astral-sanctum',name:'Astral Sanctum · Test Fallback',source:require('../../assets/profile-backgrounds/bg_frostfall.webp'),status:'export_prepared',unlockBinding:null},
  {id:'premium:draconic-dominion:dominion-of-ash',name:'Dominion of Ash · Test Fallback',source:require('../../assets/profile-backgrounds/dungeon-sunscar-buried-observatory.webp'),status:'export_prepared',unlockBinding:null},
  {id:'premium:abyssal-majesty:forgotten-abyss',name:'The Forgotten Abyss · Test Fallback',source:require('../../assets/profile-backgrounds/bg_veilbreak.webp'),status:'export_prepared',unlockBinding:null},
  {id:'premium:paradox-eternal:beyond-the-veil',name:'Beyond the Veil · Test Fallback',source:require('../../assets/profile-backgrounds/dungeon-frostmarch-shiverlake-reflections.webp'),status:'export_prepared',unlockBinding:null},
] as const;

export const profileBackgroundPreviewById=new Map(PROFILE_BACKGROUND_PREVIEWS.map(background=>[background.id,background]));
