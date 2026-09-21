import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import type {PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {CharacterPortraitSelection} from './CharacterVisual';
import {RegionArtwork} from './RegionArtwork';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {CLASSES} from '../content/classes';
import type {ClassId} from '../core/types';
import {equipmentTheme,radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';

export function PublicProfileScene({profile,height=205}:{profile:PublicPlayerProfileV43;height?:number}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const background=profileBackgroundPreviewById.get(profile.backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===profile.backgroundId);
 const border=profile.borderId?profileBorderSourceById.get(profile.borderId):undefined,pet=profile.petId?petArtSource(profile.petId):undefined;
 const classId=(CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 return <View accessibilityLabel={profile.character.name+' profile scene'} style={[s.scene,{height},!!border&&s.sceneBorder]}>
  {background?<Image source={background.source} resizeMode="cover" style={StyleSheet.absoluteFill}/>:base?<RegionArtwork regionId={base.region}/>:<View style={[StyleSheet.absoluteFill,{backgroundColor:C.stage}]}/>}
  <View style={s.shade}/>
  <View style={s.identityPlate}>
   <Text style={s.eyebrow}>PLAYER SHOWCASE</Text>
   <GuildTaggedPlayerName name={profile.character.name||profile.displayName} guildTag={profile.guildTag} tagColorId={profile.guildTagColorId} style={s.name}/>
   <Text numberOfLines={1} style={s.title}>“{profile.title}”</Text>
   <Text style={s.meta}>Lv. {profile.character.level} · {classId.replace(/_/g,' ')}</Text>
  </View>
  <CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} skinId={profile.character.selectedSkinId} compact style={s.character}/>
  {pet?<Image source={pet} resizeMode="contain" style={s.pet}/>:null}
  {border?<Image accessible={false} source={border} resizeMode="stretch" style={StyleSheet.absoluteFill}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 scene:{borderRadius:radii.lg,overflow:'hidden',alignItems:'center',justifyContent:'flex-end',backgroundColor:C.stage,borderWidth:1,borderColor:C.line},
 sceneBorder:{borderWidth:2,borderColor:C.lineStrong},
 shade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(5,12,20,.24)':'rgba(20,28,36,.12)'},
 identityPlate:{position:'absolute',left:10,top:10,maxWidth:'58%',zIndex:4,paddingHorizontal:9,paddingVertical:7,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.dark?'rgba(8,15,24,.82)':'rgba(255,255,255,.88)'},
 eyebrow:{fontSize:7,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.7},
 name:{...typography.bodyStrong,color:C.text,fontSize:13,lineHeight:17},
 title:{fontSize:9,lineHeight:12,color:equipmentColors.goldSoft,fontStyle:'italic',marginTop:1},
 meta:{fontSize:8,lineHeight:11,color:C.muted,textTransform:'capitalize',marginTop:1},
 character:{width:130,height:'80%',zIndex:2},
 pet:{position:'absolute',right:14,bottom:12,width:58,height:58,zIndex:3},
});}
