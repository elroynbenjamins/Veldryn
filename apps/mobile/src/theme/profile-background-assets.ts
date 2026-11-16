import {ImageSourcePropType} from 'react-native';

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
  {id:'bg_harvestwake',name:'Harvestwake Autumn Market',source:require('../../assets/profile-backgrounds/bg_harvestwake.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_grand_storehouse',name:'Grand Storehouse',source:require('../../assets/profile-backgrounds/bg_harvestwake.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_kingdom_approach',name:'Kingdom Approach',source:require('../../assets/profile-backgrounds/bg_kingdom_approach.webp'),status:'export_prepared',unlockBinding:null},
  {id:'bg_forest_sanctum',name:'Forest Sanctum',source:require('../../assets/profile-backgrounds/bg_forest_sanctum.webp'),status:'export_prepared',unlockBinding:null},
  {id:'dungeon:asterfall:rootbound-sanctuary',name:'Rootbound Sanctuary',source:require('../../assets/profile-backgrounds/dungeon-asterfall-rootbound-sanctuary.webp'),status:'export_prepared',unlockBinding:null},
  {id:'dungeon:sunscar:buried-observatory',name:'Buried Observatory',source:require('../../assets/profile-backgrounds/dungeon-sunscar-buried-observatory.webp'),status:'export_prepared',unlockBinding:null},
  {id:'dungeon:frostmarch:shiverlake-reflections',name:'Shiverlake Reflections',source:require('../../assets/profile-backgrounds/dungeon-frostmarch-shiverlake-reflections.webp'),status:'export_prepared',unlockBinding:null},
] as const;

export const profileBackgroundPreviewById=new Map(PROFILE_BACKGROUND_PREVIEWS.map(background=>[background.id,background]));
