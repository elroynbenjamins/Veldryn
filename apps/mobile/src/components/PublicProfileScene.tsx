import {accountText} from '../i18n/account';
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
import {ProfileBorderBackdrop} from './ProfileBorderBackdrop';
import {AnimatedProfileBorderGlows,ProfileCosmeticExteriorMatte,ProfileSceneEffect} from './ProfileCosmeticMotion';
import {cosmeticArtByBorder,cosmeticArtByEffect,type CosmeticArt} from '../theme/profile-cosmetic-art-v1';
import {PROFILE_ANIMATED_COSMETICS_RELEASED} from '../core/release-flags';
import {profileSceneContentAnchors} from '../core/profile-frame-layout';
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {PlayerBadgeShowcase} from './PlayerBadges';
import {ProfileGuildAffiliation} from './ProfileGuildAffiliation';

/** Local-only QA overrides. Never derive effects from a border or grant ownership. */
export type ProfileCosmeticReviewSelection={borderArt?:CosmeticArt;effectArt?:CosmeticArt;active:boolean;surroundColor:string};
export function PublicProfileScene({profile,height=205,reduceMotion=false,showGuild=true,reviewCosmetics}:{profile:PublicPlayerProfileV43;height?:number;reduceMotion?:boolean;showGuild?:boolean;reviewCosmetics?:ProfileCosmeticReviewSelection}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const background=profileBackgroundPreviewById.get(profile.backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===profile.backgroundId);
 const review=__DEV__?reviewCosmetics:undefined;
 const equippedBorderArt=!review&&PROFILE_ANIMATED_COSMETICS_RELEASED&&profile.borderId?cosmeticArtByBorder.get(profile.borderId):undefined;
 const borderArt=review?.borderArt??equippedBorderArt,effectArt=review?.effectArt??(!review&&PROFILE_ANIMATED_COSMETICS_RELEASED&&profile.effectId?cosmeticArtByEffect.get(profile.effectId):undefined);
 const border=review?borderArt?.border:borderArt?.border??(profile.borderId?profileBorderSourceById.get(profile.borderId):undefined),pet=profile.petId?petArtSource(profile.petId):undefined;
 const anchors=profileSceneContentAnchors(border?8:0);
 const classId=(CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 const className=CLASSES.find(row=>row.id===classId)!.name;
 const guild=profile.guild===undefined?(profile.guildTag?{tag:profile.guildTag,tagColorId:profile.guildTagColorId}:null):profile.guild;
 return <View accessibilityLabel={profileT(language,'{name} profile scene',{name:profile.character.name})} style={s.card}>
  <View style={[s.surface,!!border&&s.framedSurface]}>
  <View style={[s.scene,{height}]}>
   <ProfileBorderBackdrop borderId={review?undefined:profile.borderId} source={border} existingInset={8}>
   {background?<CardBackground sources={personalBackgroundVariants.get(profile.backgroundId)??{wide:background.source,square:background.source}}/>:base?<RegionArtwork regionId={base.region}/>:null}
   <View style={s.shade}/>
   {effectArt?<ProfileSceneEffect art={effectArt} active={review?.active??true} reduceMotion={reduceMotion}/>:null}
   </ProfileBorderBackdrop>
   {borderArt?<View pointerEvents="none" style={{position:'absolute',top:-8,left:-8,right:-8,bottom:-8}}><ProfileCosmeticExteriorMatte source={borderArt.matte} color={review.surroundColor}/></View>:null}
  <View style={[s.identityPlate,s.identityStack]}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={reduceMotion} style={s.name}/>
   <Text numberOfLines={1} style={s.title}>{profile.title}</Text>
   <View style={s.metaRow}>
    <Text numberOfLines={1} style={[s.meta,s.metaInRow]}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>
    {profile.combatPower!==undefined?<Text numberOfLines={1} style={s.power}>{accountText(language,'COMBAT POWER')} {profile.combatPower.toLocaleString()}</Text>:null}
   </View>
   <View style={s.identityFill}/>
   <PlayerBadgeShowcase identity={profile.playerBadges}/>
  </View>
  {showGuild&&guild?<View style={[s.guildAnchor,{left:anchors.side,bottom:anchors.bottom,right:pet?anchors.guildRightWithPet:anchors.side}]}><ProfileGuildAffiliation guild={guild}/></View>:null}
  <CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={s.character}/>
  {pet?<Image source={pet} resizeMode="contain" style={[s.pet,{right:anchors.side,bottom:anchors.bottom}]}/>:null}
  </View>
  </View>
  {border?<ProfileFrameOverlay source={border} sceneSafe/>:null}
  {borderArt?<AnimatedProfileBorderGlows art={borderArt} active={review?.active??true} reduceMotion={reduceMotion}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 card:{width:'100%',maxWidth:480,alignSelf:'center',position:'relative'},
 scene:{position:'relative',alignItems:'center',justifyContent:'flex-end',overflow:'hidden'},
 surface:{borderRadius:radii.lg,overflow:'hidden',backgroundColor:C.stage},
 framedSurface:{margin:8,borderRadius:4},
 shade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'},
 guildAnchor:{position:'absolute',maxWidth:'58%',alignItems:'flex-start',zIndex:4},
 character:{position:'absolute',left:20,top:24,width:96,height:96,zIndex:2},
 pet:{position:'absolute',width:58,height:58,zIndex:3},
 /** Combat power rides on the level line rather than taking one of its own: a second line
  * pushed the badge shelf past the portrait edge it is meant to finish level with. The class
  * name gives way first, so the number a visitor came to read is never the part truncated. */
 metaRow:{flexDirection:'row',alignItems:'baseline',gap:6,marginTop:3},
 metaInRow:{flexShrink:1,minWidth:0,marginTop:0},
 power:{flexShrink:0,fontSize:8,lineHeight:14,color:C.good,fontWeight:'900',letterSpacing:.55},
});}
