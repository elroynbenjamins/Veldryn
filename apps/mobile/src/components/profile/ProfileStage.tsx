import {profileT} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {CLASSES} from '../../content/classes';
import type {GameState} from '../../core/types';
import {effectivePlayerNameStyle} from '../../core/player-name-style';
import {BASE_PROFILE_BACKGROUNDS} from '../../core/profile-cosmetics';
import {profileBackgroundPreviewById} from '../../theme/profile-background-assets';
import {profileBorderSourceById} from '../../theme/profile-border-assets';
import {personalBackgroundVariants} from '../../theme/card-background-assets';
import {petArtSource} from '../../theme/pet-art';
import {radii,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {usePlayerBadges} from '../../online/PlayerBadgeProvider';
import {CardBackground} from '../CardBackground';
import {PlayerBadges,PlayerBadgeShowcase} from '../PlayerBadges';
import {PlayerStyledName} from '../PlayerStyledName';
import {ProfileFrameOverlay} from '../ProfileFrameOverlay';
import {ProfileIcon} from '../ProfileIcon';
import {RegionArtwork} from '../RegionArtwork';

/** The customization stage: always on screen while browsing, so a tap's effect is visible.
 * Collapses to a single strip once the wardrobe is scrolled, and expands again on demand. */
export function ProfileStage({state,collapsed,onToggle,onAudiencePreview,trailing}:{
 state:GameState;collapsed:boolean;onToggle:()=>void;onAudiencePreview?:()=>void;trailing?:string;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),badges=usePlayerBadges();
 const character=state.character;
 if(!character)return null;
 const backgroundId=character.profileBackgroundId??'asterfall-night';
 const scene=profileBackgroundPreviewById.get(backgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===backgroundId);
 const frame=profileBorderSourceById.get(character.profileBorderId??''),pet=petArtSource(character.selectedCosmeticPetId??'');
 const className=CLASSES.find(row=>row.id===character.classId)?.name??character.classId;
 const title=character.profileTitle??profileT(language,"New Adventurer");
 const art=scene?<CardBackground sources={personalBackgroundVariants.get(backgroundId)??{wide:scene.source,square:scene.source}}/>:base?<RegionArtwork regionId={base.region}/>:null;

 if(collapsed)return <Pressable accessibilityRole="button" accessibilityLabel={profileT(language,"Expand the profile stage")} onPress={onToggle} style={({pressed})=>[s.strip,pressed&&s.pressed]}>
  <View style={[s.stripArt,!!frame&&s.stripArtFramed]}>{art}<View style={s.stripScrim}/></View>
  <ProfileIcon id={character.profileIconId} classId={character.classId} size={38} style={[s.stripIcon,!!frame&&s.stripIconFramed]}/>
  <View style={s.stripCopy}>
   <PlayerStyledName name={character.name} nameStyle={effectivePlayerNameStyle(state)} reduceMotion={state.settings.reduceMotion} numberOfLines={1} style={s.stripName}/>
   <Text numberOfLines={1} style={s.stripMeta}>{title}</Text>
  </View>
  <View style={s.chip}><Text style={s.chipText}>{profileT(language,"Expand")} ▾</Text></View>
  {frame?<ProfileFrameOverlay source={frame}/>:null}
 </Pressable>;

 return <View style={s.root}>
  <View style={[s.surface,!!frame&&s.surfaceFramed]}>
   {art}
   <View style={s.scrim}/>
   {pet?<Image accessibilityLabel={profileT(language,"Pet preview")} source={pet} resizeMode="contain" style={[s.pet,!!frame&&s.petFramed]}/>:null}
   <View style={[s.identity,!!frame&&s.identityFramed]}>
    <ProfileIcon id={character.profileIconId} classId={character.classId} size={62} style={s.avatar}/>
    <View style={s.copy}>
     <View style={s.nameRow}>
      <PlayerStyledName name={character.name} nameStyle={effectivePlayerNameStyle(state)} reduceMotion={state.settings.reduceMotion} numberOfLines={1} style={s.name}/>
      <PlayerBadges identity={badges.identity}/>
     </View>
     <Text numberOfLines={1} style={s.title}>{title}</Text>
     <Text numberOfLines={1} style={s.meta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}{trailing?' · '+trailing:''}</Text>
     <PlayerBadgeShowcase identity={badges.identity} size={15} style={s.badgeShelf}/>
    </View>
   </View>
  </View>
  {frame?<ProfileFrameOverlay source={frame}/>:null}
  <View style={[s.tools,!!frame&&s.toolsFramed]}>
   {onAudiencePreview?<Pressable accessibilityRole="button" accessibilityLabel={profileT(language,"Preview as others see me")} onPress={onAudiencePreview} style={({pressed})=>[s.tool,pressed&&s.pressed]}><Text style={s.toolMark}>◎</Text></Pressable>:null}
   <Pressable accessibilityRole="button" accessibilityLabel={profileT(language,"Collapse the profile stage")} onPress={onToggle} style={({pressed})=>[s.tool,pressed&&s.pressed]}><Text style={s.toolMark}>▴</Text></Pressable>
  </View>
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{width:'100%',height:168,position:'relative'},
 surface:{...StyleSheet.absoluteFill,borderRadius:radii.lg,overflow:'hidden',borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.stage},
 surfaceFramed:{top:7,left:7,right:7,bottom:7,borderRadius:5,borderColor:C.line},
 scrim:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.54)':'rgba(255,255,255,.66)'},
 tools:{position:'absolute',top:8,right:8,flexDirection:'row',gap:6,zIndex:12},
 toolsFramed:{top:18,right:58},
 tool:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,borderWidth:1,borderColor:C.dark?'rgba(185,192,198,.44)':'rgba(40,46,52,.28)',backgroundColor:C.dark?'rgba(3,4,5,.62)':'rgba(255,255,255,.72)'},
 toolMark:{fontSize:15,lineHeight:18,color:C.text,fontWeight:'800'},
 pressed:{opacity:.72},
 pet:{position:'absolute',right:14,bottom:12,width:58,height:58,zIndex:3},
 petFramed:{right:26,bottom:24},
 identity:{position:'absolute',left:12,right:12,bottom:10,flexDirection:'row',alignItems:'flex-end',gap:10,zIndex:2},
 identityFramed:{left:24,right:24,bottom:22},
 avatar:{width:62,height:62,borderRadius:radii.lg,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.dark?'rgba(3,4,5,.42)':'rgba(255,255,255,.52)'},
 copy:{flex:1,minWidth:0},
 nameRow:{flexDirection:'row',alignItems:'center',gap:5},
 name:{...typography.title,color:C.text,flexShrink:1,minWidth:0},
 title:{...typography.caption,color:C.dark?C.accentSoft:C.text,fontWeight:'700',marginTop:1},
 meta:{fontSize:10,lineHeight:14,color:C.dark?C.muted:C.disabled,fontWeight:'700',marginTop:2},
 badgeShelf:{marginTop:5},
 strip:{height:58,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,borderRadius:radii.md,overflow:'hidden',borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.stage},
 stripArt:{...StyleSheet.absoluteFill},
 stripArtFramed:{top:4,left:4,right:4,bottom:4,borderRadius:4,overflow:'hidden'},
 stripScrim:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.76)':'rgba(255,255,255,.7)'},
 stripIcon:{width:38,height:38,borderRadius:radii.sm,borderWidth:1,borderColor:C.lineStrong},
 stripIconFramed:{marginLeft:10},
 stripCopy:{flex:1,minWidth:0},
 stripName:{...typography.bodyStrong,color:C.text},
 stripMeta:{fontSize:10,lineHeight:13,color:C.muted},
 chip:{paddingHorizontal:8,paddingVertical:4,borderRadius:99,borderWidth:1,borderColor:C.info,backgroundColor:C.infoSurface},
 chipText:{fontSize:9.5,color:C.info,fontWeight:'900',letterSpacing:.5},
});}
