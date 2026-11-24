import {DraconicDominionPreview,DraconicStandardEffects} from './profile/DraconicDominionPreview';
import {DRACONIC_IDS} from '../core/draconic-showcase-layout';
import {getDraconicAssets} from '../theme/draconic-integration-assets';
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
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {PlayerBadgeShowcase} from './PlayerBadges';
import {ProfileGuildAffiliation} from './ProfileGuildAffiliation';
import {CelestialSovereignPreview} from './profile/CelestialSovereignPreview';
import {CELESTIAL_IDS,getEnabledCelestialAssets} from '../theme/celestial-integration-assets';
import {CelestialStandardBackgroundEffects,CelestialStandardBorderEffects} from './profile/CelestialStandardEffects';

export function PublicProfileScene({profile,height=205,reduceMotion=false,showGuild=true,active=false}:{profile:PublicPlayerProfileV43;height?:number;reduceMotion?:boolean;showGuild?:boolean;active?:boolean}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const background=profileBackgroundPreviewById.get(profile.backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===profile.backgroundId);
 const border=profile.borderId?profileBorderSourceById.get(profile.borderId):undefined,pet=profile.petId?petArtSource(profile.petId):undefined;
 const classId=(CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 const className=CLASSES.find(row=>row.id===classId)!.name;
 const guild=profile.guild===undefined?(profile.guildTag?{tag:profile.guildTag,tagColorId:profile.guildTagColorId}:null):profile.guild;
 const celestialAssets=getEnabledCelestialAssets();
 const celestialBackground=!!celestialAssets&&profile.backgroundId===CELESTIAL_IDS.background;
 const celestialBorder=!!celestialAssets&&profile.borderId===CELESTIAL_IDS.border;
 const draconic=getDraconicAssets();
 const draconicBackground=!!draconic&&profile.backgroundId===DRACONIC_IDS.background;
 const draconicBorder=!!draconic&&profile.borderId===DRACONIC_IDS.border;
 const standard=<View accessibilityLabel={profileT(language,'{name} profile scene',{name:profile.character.name})} style={s.card}>
  <View style={[s.surface,!!border&&s.framedSurface]}>
  <View style={[s.scene,{height}]}>
   {background?<CardBackground sources={personalBackgroundVariants.get(profile.backgroundId)??{wide:background.source,square:background.source}}/>:base?<RegionArtwork regionId={base.region}/>:null}
   <View style={s.shade}/>
   {draconicBackground&&draconic?<DraconicStandardEffects ember={draconic.scene.ember} kind="background" active={active} reduceMotion={reduceMotion}/>:null}
   {celestialBackground?<CelestialStandardBackgroundEffects active={active} reduceMotion={reduceMotion}/>:null}
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
  {showGuild&&guild?<View style={s.guildAnchor}><ProfileGuildAffiliation guild={guild}/></View>:null}
  <CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={s.character}/>
  {pet?<Image source={pet} resizeMode="contain" style={s.pet}/>:null}
  </View>
  </View>
  {border?<ProfileFrameOverlay source={border}/>:null}
  {draconicBorder&&draconic?<DraconicStandardEffects ember={draconic.scene.ember} kind="border" active={active} reduceMotion={reduceMotion}/>:null}
  {celestialBorder?<CelestialStandardBorderEffects active={active} reduceMotion={reduceMotion}/>:null}
 </View>;
 const celestial=height>=205&&celestialBackground&&celestialBorder?celestialAssets:undefined;
 if(draconic&&draconicBackground&&draconicBorder&&height>=205){
 return <DraconicDominionPreview assets={draconic.scene} equippedPetId={profile.petId} alternatePetSource={pet} petAccessibilityLabel={profile.petId===DRACONIC_IDS.pet?'Vharaxis, the Eternal Flame':profileT(language,'Pet preview')} active={active} reduceMotion={reduceMotion} fallback={standard}
  portrait={<CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.draconicIdentity}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={reduceMotion} style={s.draconicName} badgeSize={11}/>
   <Text numberOfLines={1} style={s.draconicTitle}>{profile.title}</Text>
   <Text numberOfLines={1} style={s.draconicMeta}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>{profile.combatPower!==undefined?<Text numberOfLines={1} style={s.draconicMeta}>{profile.combatPower.toLocaleString()} CP</Text>:null}
  </View>}
  badges={<PlayerBadgeShowcase identity={profile.playerBadges} size={12}/>}
  guild={showGuild&&guild?<ProfileGuildAffiliation guild={guild} compact/>:undefined}/>;
 }
 if(!celestial)return standard;
 return <CelestialSovereignPreview assets={celestial.scene} equippedPetId={profile.petId} matchingPetId={CELESTIAL_IDS.pet} alternatePetSource={pet} petAccessibilityLabel={profileT(language,'Pet preview')} active={active} reduceMotion={reduceMotion} fallback={standard}
  portrait={<CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.celestialIdentity}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={reduceMotion} style={s.celestialName}/>
   <Text numberOfLines={1} style={s.celestialTitle}>{profile.title}</Text>
   <View style={s.celestialMetaRow}><Text numberOfLines={1} style={s.celestialMeta}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>{profile.combatPower!==undefined?<Text numberOfLines={1} style={s.celestialPower}>{profile.combatPower.toLocaleString()}</Text>:null}</View>
   <PlayerBadgeShowcase identity={profile.playerBadges} size={13}/>
  </View>}
  guild={showGuild&&guild?<ProfileGuildAffiliation guild={guild}/>:undefined}/>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 draconicIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 draconicName:{fontSize:11,lineHeight:12,includeFontPadding:false,color:'#fff0d6',fontWeight:'800',flexShrink:1,minWidth:0},
 draconicTitle:{fontSize:9,lineHeight:10,includeFontPadding:false,color:'#ffb76b'},
 draconicMeta:{fontSize:8,lineHeight:9,includeFontPadding:false,color:'#f6d4b9',flexShrink:1,minWidth:0},
 celestialIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 celestialName:{fontSize:12,lineHeight:15,color:'#fff0c8',fontWeight:'800'},
 celestialTitle:{fontSize:10,lineHeight:12,color:'#efd69b'},
 celestialMetaRow:{flexDirection:'row',gap:3,alignItems:'baseline'},
 celestialMeta:{flex:1,minWidth:0,fontSize:9,lineHeight:12,color:'#d6e0f4'},
 celestialPower:{flexShrink:0,fontSize:9,lineHeight:12,color:'#d6e0f4'},
 card:{width:'100%',maxWidth:480,alignSelf:'center',position:'relative'},
 scene:{position:'relative',alignItems:'center',justifyContent:'flex-end',overflow:'hidden'},
 surface:{borderRadius:radii.lg,overflow:'hidden',backgroundColor:C.stage},
 framedSurface:{margin:8,borderRadius:4},
 shade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'},
 guildAnchor:{position:'absolute',left:22,bottom:20,maxWidth:'58%',zIndex:4},
 character:{position:'absolute',left:20,top:24,width:96,height:96,zIndex:2},
 pet:{position:'absolute',right:22,bottom:20,width:58,height:58,zIndex:3},
 /** Combat power rides on the level line rather than taking one of its own: a second line
  * pushed the badge shelf past the portrait edge it is meant to finish level with. The class
  * name gives way first, so the number a visitor came to read is never the part truncated. */
 metaRow:{flexDirection:'row',alignItems:'baseline',gap:6,marginTop:3},
 metaInRow:{flexShrink:1,minWidth:0,marginTop:0},
 power:{flexShrink:0,fontSize:8,lineHeight:14,color:C.good,fontWeight:'900',letterSpacing:.55},
});}
