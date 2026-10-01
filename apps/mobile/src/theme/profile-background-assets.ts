import {ImageSourcePropType} from 'react-native';

export interface ProfileBackgroundPreview{
  id:string;
  name:string;
  source:ImageSourcePropType;
  status:'export_prepared';
  unlockBinding:null;
}

/** Released profile backgrounds only. Future event backgrounds live in the source-only archive. */
export const PROFILE_BACKGROUND_PREVIEWS:readonly ProfileBackgroundPreview[]=[
  {id:'bg_harvestwake',name:'Harvestwake Autumn Market',source:require('../../assets/profile-backgrounds/bg_harvestwake.png'),status:'export_prepared',unlockBinding:null},
  {id:'bg_grand_storehouse',name:'Grand Storehouse',source:require('../../assets/profile-backgrounds/bg_harvestwake.png'),status:'export_prepared',unlockBinding:null},
  {id:'bg_kingdom_approach',name:'Kingdom Approach',source:require('../../assets/profile-backgrounds/bg_kingdom_approach.png'),status:'export_prepared',unlockBinding:null},
  {id:'bg_forest_sanctum',name:'Forest Sanctum',source:require('../../assets/profile-backgrounds/bg_forest_sanctum.png'),status:'export_prepared',unlockBinding:null},
] as const;

export const profileBackgroundPreviewById=new Map(PROFILE_BACKGROUND_PREVIEWS.map(background=>[background.id,background]));
