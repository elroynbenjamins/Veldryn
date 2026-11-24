import {profileT} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo,useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {CLASSES} from '../content/classes';
import type {GameState} from '../core/types';
import {CharacterPortrait} from './CharacterVisual';
import {profileBackgroundPreviewById} from '../theme/profile-background-assets';
import {profileBorderSourceById} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {RegionArtwork} from './RegionArtwork';
import {type ThemeColors} from '../theme/theme';
import {profileShowcaseStyles} from '../theme/profile-showcase-styles';
import {useGameTheme} from '../theme/ThemeContext';
import {LIVE_EVENT_CATALOG} from '../content/live-events';
import {COLLECTIBLES} from '../content/collectibles';
import {effectivePlayerNameStyle} from '../core/player-name-style';
import {PlayerStyledName} from './PlayerStyledName';
import {ProfileFrameOverlay} from './ProfileFrameOverlay';
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {PlayerBadges,PlayerBadgeShowcase} from './PlayerBadges';
import {usePlayerBadges} from '../online/PlayerBadgeProvider';
import {CelestialSovereignPreview} from './profile/CelestialSovereignPreview';
import {CELESTIAL_IDS,getEnabledCelestialAssets} from '../theme/celestial-integration-assets';
import {CelestialStandardBackgroundEffects,CelestialStandardBorderEffects} from './profile/CelestialStandardEffects';

export function ProfileScenePreview({state,backgroundId,active=false}:{state:GameState;backgroundId:string;active?:boolean}){
 const language=useGameLanguage();
 const [previewWidth,setPreviewWidth]=useState(320),compact=previewWidth<300;
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),badges=usePlayerBadges();
 const character=state.character!,background=profileBackgroundPreviewById.get(backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(item=>item.id===backgroundId);
 if(!background&&!base)return null;
 const className=CLASSES.find(item=>item.id===character.classId)?.name??character.classId;
 const rewards=LIVE_EVENT_CATALOG.flatMap(event=>[...event.milestones(character.classId).map(m=>m.reward),...event.shop.map(o=>o.reward)]);
 const pet=rewards.find(reward=>reward.id===character.selectedCosmeticPetId),petCollectible=COLLECTIBLES.find(row=>row.id===character.selectedCosmeticPetId&&row.kind==='pet'),petSource=petArtSource(character.selectedCosmeticPetId??''),borderSource=profileBorderSourceById.get(character.profileBorderId??'');
 const celestialAssets=getEnabledCelestialAssets();
 const celestialBackground=!!celestialAssets&&backgroundId===CELESTIAL_IDS.background;
 const celestialBorder=!!celestialAssets&&character.profileBorderId===CELESTIAL_IDS.border;
 const standard=<View onLayout={event=>setPreviewWidth(event.nativeEvent.layout.width)} accessibilityLabel={profileT(language,"{name}'s profile preview with {background}",{name:character.name,background:background?.name??base?.name??''})} style={s.frame}>
  <View style={[s.surface,!!borderSource&&s.framedSurface]}>
  <View style={s.scene}>
   {background?<CardBackground sources={personalBackgroundVariants.get(backgroundId)??{wide:background.source,square:background.source}}/>:<RegionArtwork regionId={base!.region}/>}
   <View style={{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'}}/>
   {celestialBackground?<CelestialStandardBackgroundEffects active={active} reduceMotion={state.settings.reduceMotion}/>:null}<View style={[s.identityPlate,compact?s.identityStackCompact:s.identityStack,compact&&s.compactIdentity]}>
    <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={effectivePlayerNameStyle(state)} reduceMotion={state.settings.reduceMotion} numberOfLines={1} style={[s.name,compact&&s.compactName]}/><PlayerBadges identity={badges.identity}/></View>
    <Text numberOfLines={1} style={s.title}>{character.profileTitle??profileT(language,"New Adventurer")}</Text>
    <Text numberOfLines={1} style={s.meta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
    <View style={s.identityFill}/>
    {compact?null:<PlayerBadgeShowcase identity={badges.identity} size={15}/>}
   </View>
   <CharacterPortrait state={state} style={[s.character,compact&&s.compactCharacter]}/>
   {petSource&&<View style={s.petBadge}><Image source={petSource} accessibilityLabel={pet?.name??petCollectible?.name??profileT(language,"Pet preview")} resizeMode="contain" style={s.petImage}/></View>}
  </View>
  </View>
  {borderSource?<ProfileFrameOverlay source={borderSource}/>:null}
  {celestialBorder?<CelestialStandardBorderEffects active={active} reduceMotion={state.settings.reduceMotion}/>:null}
 </View>;
 const celestial=celestialBackground&&celestialBorder?celestialAssets:undefined;
 if(!celestial)return standard;
 return <CelestialSovereignPreview assets={celestial.scene} equippedPetId={character.selectedCosmeticPetId} matchingPetId={CELESTIAL_IDS.pet} alternatePetSource={petSource} petAccessibilityLabel={pet?.name??petCollectible?.name??profileT(language,'Pet preview')} active={active} reduceMotion={state.settings.reduceMotion} fallback={standard}
  portrait={<CharacterPortrait state={state} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.celestialIdentity}>
   <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={effectivePlayerNameStyle(state)} reduceMotion={state.settings.reduceMotion} numberOfLines={1} style={s.celestialName}/><PlayerBadges identity={badges.identity} size={12}/></View>
   <Text numberOfLines={1} style={s.celestialTitle}>{character.profileTitle??profileT(language,'New Adventurer')}</Text>
   <Text numberOfLines={1} style={s.celestialMeta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
   <PlayerBadgeShowcase identity={badges.identity} size={13}/>
  </View>}/>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 celestialIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 celestialName:{fontSize:12,lineHeight:15,color:'#fff0c8',fontWeight:'800',flexShrink:1,minWidth:0},
 celestialTitle:{fontSize:10,lineHeight:12,color:'#efd69b'},
 celestialMeta:{fontSize:9,lineHeight:12,color:'#d6e0f4'},
 frame:{width:'100%',maxWidth:480,alignSelf:'center',position:'relative'},
 surface:{borderRadius:14,overflow:'hidden',backgroundColor:C.panel},
 framedSurface:{margin:8,borderRadius:4},
 scene:{width:'100%',minHeight:190,alignItems:'center',overflow:'hidden',backgroundColor:C.stage},
 character:{position:'absolute',left:20,top:24,width:96,height:96,zIndex:2},
 compactCharacter:{left:12,top:24,width:64,height:64},compactIdentity:{left:88,right:12},compactName:{fontSize:16,lineHeight:22},
 petBadge:{position:'absolute',right:22,bottom:20,zIndex:3},petImage:{width:56,height:56},
 nameRow:{flexDirection:'row',alignItems:'center',gap:5},
});}
