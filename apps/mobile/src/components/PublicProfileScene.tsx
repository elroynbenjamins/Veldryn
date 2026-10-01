import {profileT} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
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
import {radii,type ThemeColors} from '../theme/theme';
import {profileShowcaseStyles} from '../theme/profile-showcase-styles';
import {useGameTheme} from '../theme/ThemeContext';
import {ProfileFrameOverlay} from './ProfileFrameOverlay';
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {ProfileGuildAffiliation} from './ProfileGuildAffiliation';

export function PublicProfileScene({profile,height=205,reduceMotion=false,showGuild=true}:{profile:PublicPlayerProfileV43;height?:number;reduceMotion?:boolean;showGuild?:boolean}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const background=profileBackgroundPreviewById.get(profile.backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===profile.backgroundId);
 const border=profile.borderId?profileBorderSourceById.get(profile.borderId):undefined,pet=profile.petId?petArtSource(profile.petId):undefined;
 const classId=(CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 const className=CLASSES.find(row=>row.id===classId)!.name;
 const guild=profile.guild===undefined?(profile.guildTag?{tag:profile.guildTag,tagColorId:profile.guildTagColorId}:null):profile.guild;
 return <View accessibilityLabel={profileT(language,'{name} profile scene',{name:profile.character.name})} style={s.card}>
  <View style={[s.surface,!!border&&s.framedSurface]}>
  <View style={[s.scene,{height}]}>
   {background?<CardBackground sources={personalBackgroundVariants.get(profile.backgroundId)??{wide:background.source,square:background.source}}/>:base?<RegionArtwork regionId={base.region}/>:null}
   <View style={s.shade}/>
  <View style={s.identityPlate}>
   <Text style={s.eyebrow}>{profileT(language,"PLAYER SHOWCASE")}</Text>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={reduceMotion} style={s.name}/>
   <Text numberOfLines={1} style={s.title}>{profile.title}</Text>
   <Text style={s.meta}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>
  </View>
  {showGuild&&guild?<View style={s.guildAnchor}><ProfileGuildAffiliation guild={guild}/></View>:null}
  <CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={s.character}/>
  {pet?<Image source={pet} resizeMode="contain" style={s.pet}/>:null}
  </View>
  </View>
  {border?<ProfileFrameOverlay source={border}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 card:{width:'100%',maxWidth:480,alignSelf:'center',position:'relative'},
 scene:{position:'relative',alignItems:'center',justifyContent:'flex-end',overflow:'hidden'},
 surface:{borderRadius:radii.lg,overflow:'hidden',backgroundColor:C.stage},
 framedSurface:{margin:8,borderRadius:4},
 shade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'},
 guildAnchor:{position:'absolute',left:22,bottom:20,maxWidth:'58%',zIndex:4},
 character:{position:'absolute',left:20,top:24,width:96,height:96,zIndex:2},
 pet:{position:'absolute',right:22,bottom:20,width:58,height:58,zIndex:3},
});}
