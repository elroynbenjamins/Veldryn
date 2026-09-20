import {Image,StyleSheet,View} from 'react-native';
import type {PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {CharacterPortraitSelection} from './CharacterVisual';
import {RegionArtwork} from './RegionArtwork';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {CLASSES} from '../content/classes';
import type {ClassId} from '../core/types';
import {C,equipmentColors,radii} from '../theme/theme';

export function PublicProfileScene({profile,height=205}:{profile:PublicPlayerProfileV43;height?:number}){
 const background=profileBackgroundPreviewById.get(profile.backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===profile.backgroundId);
 const border=profile.borderId?profileBorderSourceById.get(profile.borderId):undefined,pet=profile.petId?petArtSource(profile.petId):undefined;
 const classId=(CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 return <View accessibilityLabel={profile.character.name+' profile scene'} style={[s.scene,{height},!!border&&s.sceneBorder]}>
  {background?<Image source={background.source} resizeMode="cover" style={StyleSheet.absoluteFill}/>:base?<RegionArtwork regionId={base.region}/>:<View style={[StyleSheet.absoluteFill,{backgroundColor:'#101d2b'}]}/>}
  <View style={s.shade}/>
  <CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} skinId={profile.character.selectedSkinId} compact style={s.character}/>
  {pet?<Image source={pet} resizeMode="contain" style={s.pet}/>:null}
  {border?<Image accessible={false} source={border} resizeMode="stretch" style={StyleSheet.absoluteFill}/>:null}
 </View>;
}
const s=StyleSheet.create({
 scene:{borderRadius:radii.lg,overflow:'hidden',alignItems:'center',justifyContent:'flex-end',backgroundColor:'#101d2b',borderWidth:1,borderColor:C.line},
 sceneBorder:{borderWidth:2,borderColor:equipmentColors.goldSoft},
 shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,20,.22)'},
 character:{width:130,height:'80%',zIndex:2},
 pet:{position:'absolute',right:14,bottom:12,width:58,height:58,zIndex:3},
});
