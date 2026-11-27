import {sixLuxeNamesEnabled} from '../online/ultra-luxe-name-readback';
import {useAuthSession} from '../online/AuthSessionProvider';
import {useUltraLuxeCollectionProjection} from '../online/useUltraLuxeCollectionProjection';
import {candidateAppearanceIds,candidateAppearanceHint,candidateShowcase,ownedNewUltraLuxeCollections} from '../core/ultra-luxe-owned-wardrobe';
import {newLuxeBackground,newLuxeBorder,newLuxePet} from '../theme/ultra-luxe-candidate-art';
import {VerifiedCandidateShowcase,VerifiedCandidateBorderEffects} from './profile/VerifiedCandidateShowcase';
import {useUltraLuxeNameSelection} from '../online/useUltraLuxeNameSelection';
import {UltraLuxeTitleText} from './profile/UltraLuxeIdentityMotion';
import {ultraLuxeVisualTier,resolveTesterUltraLuxeVisuals,ultraLuxeSceneEffectCompatible} from '../core/ultra-luxe-set-visuals';
import {playerBadgeIds,profileBadgeIds} from '../core/player-badges';
import {ownedUltraLuxeTitleColor,ownedUltraLuxeTitles} from '../core/ultra-luxe-titles';
import {DraconicDominionPreview,DraconicStandardEffects} from './profile/DraconicDominionPreview';
import {DRACONIC_IDS} from '../core/draconic-showcase-layout';
import {getDraconicAssets} from '../theme/draconic-integration-assets';
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
import {AnimatedProfileBorderGlows,ProceduralProfileBorderGlows,ProceduralProfileSceneEffect,ProfileSceneEffect} from './ProfileCosmeticMotion';
import {cosmeticArtByBorder,cosmeticArtByEffect} from '../theme/profile-cosmetic-render-art';
import {profileCosmeticRuntimeByBorder,profileCosmeticRuntimeByEffect} from '../theme/profile-cosmetic-runtime-v1';
import {profileAnimatedPieceEnabled,profileCosmeticsTester} from '../core/profile-cosmetic-access';
import {ProfileBorderBackdrop} from './ProfileBorderBackdrop';
import {profileSceneContentAnchors} from '../core/profile-frame-layout';
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {PlayerBadges,PlayerBadgeShowcase,useBadgeClock} from './PlayerBadges';
import {usePlayerBadges} from '../online/PlayerBadgeProvider';
import {CelestialSovereignPreview} from './profile/CelestialSovereignPreview';
import {CELESTIAL_IDS,getEnabledCelestialAssets} from '../theme/celestial-integration-assets';
import {CelestialStandardBackgroundEffects,CelestialStandardBorderEffects} from './profile/CelestialStandardEffects';

export function ProfileScenePreview({state,backgroundId,active=false}:{state:GameState;backgroundId:string;active?:boolean}){
 const language=useGameLanguage();
 const privateName=useUltraLuxeNameSelection(active&&(ownedUltraLuxeTitles(state).length>0||sixLuxeNamesEnabled&&!!state.account.unlockedTitleIds?.some(id=>id.startsWith('ascendant-')))).style;
 const [previewWidth,setPreviewWidth]=useState(320),compact=previewWidth<300;
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),badges=usePlayerBadges();
 const character=state.character!;
 const accountId=useAuthSession().session?.user.id??'';
 const raw={background:backgroundId,border:character.profileBorderId,pet:character.selectedCosmeticPetId};
 const projection=useUltraLuxeCollectionProjection(candidateAppearanceHint(raw),sixLuxeNamesEnabled);
 const owned=ownedNewUltraLuxeCollections(state,{accountId,characterId:character.id},projection);
 const allowed=owned.map(c=>c.id);
 const safe=candidateAppearanceIds({...raw,displayedBadges:[]},allowed);
 const candidateTitle=owned.find(c=>c.titleName===character.profileTitle);
 const base=BASE_PROFILE_BACKGROUNDS.find(item=>item.id===safe.background);
 const badgeNow=useBadgeClock(badges.identity);
 const displayedBadges=[...playerBadgeIds(badges.identity,badgeNow),...profileBadgeIds(badges.identity,badgeNow)];
 const verifiedTitleId=candidateTitle?.titleId??ownedUltraLuxeTitles(state).find(t=>t.name===character.profileTitle)?.id;
 const tester=profileCosmeticsTester(state);
 const visualSelection=resolveTesterUltraLuxeVisuals({...safe,verifiedTitleId,displayedBadges},{
  background:tester&&(state.account.unlockedProfileBackgroundIds?.includes(backgroundId)??false),
  border:tester&&(state.account.unlockedProfileBorderIds?.includes(character.profileBorderId??'')??false),
  pet:tester&&(state.account.unlockedCosmeticPetIds?.includes(character.selectedCosmeticPetId??'')??false),
 });
 const renderBackgroundId=visualSelection.background??safe.background??'asterfall-night';
 const renderBorderId=visualSelection.border??'';
 const renderPetId=visualSelection.pet??'';
 const newBackground=newLuxeBackground(renderBackgroundId);
 const background=newBackground??profileBackgroundPreviewById.get(renderBackgroundId);
 if(!background&&!base)return null;
 const className=CLASSES.find(item=>item.id===character.classId)?.name??character.classId;
 const rewards=LIVE_EVENT_CATALOG.flatMap(event=>[...event.milestones(character.classId).map(m=>m.reward),...event.shop.map(o=>o.reward)]);
 const pet=rewards.find(reward=>reward.id===character.selectedCosmeticPetId),petCollectible=COLLECTIBLES.find(row=>row.id===character.selectedCosmeticPetId&&row.kind==='pet'),petSource=newLuxePet(renderPetId)??petArtSource(renderPetId),borderAnimated=profileAnimatedPieceEnabled(state,'border',character.profileBorderId??''),effectAnimated=profileAnimatedPieceEnabled(state,'effect',character.profileEffectId??''),borderArt=borderAnimated?cosmeticArtByBorder.get(renderBorderId):undefined,effectArt=effectAnimated?cosmeticArtByEffect.get(character.profileEffectId??''):undefined,borderRuntime=borderAnimated?profileCosmeticRuntimeByBorder.get(renderBorderId):undefined,effectRuntime=effectAnimated?profileCosmeticRuntimeByEffect.get(character.profileEffectId??''):undefined,directBorder=newLuxeBorder(renderBorderId)??profileBorderSourceById.get(renderBorderId),borderSource=borderArt?.border??directBorder??(borderRuntime?profileBorderSourceById.get(borderRuntime.fallbackBorderId):undefined);
 const anchors=profileSceneContentAnchors(borderSource?8:0);
 const celestialAssets=getEnabledCelestialAssets();
 const celestialBackground=!!celestialAssets&&renderBackgroundId===CELESTIAL_IDS.background;
 const celestialBorder=!!celestialAssets&&renderBorderId===CELESTIAL_IDS.border;
 const draconic=getDraconicAssets();
 const draconicBackground=!!draconic&&renderBackgroundId===DRACONIC_IDS.background;
 const draconicBorder=!!draconic&&renderBorderId===DRACONIC_IDS.border;
 const standard=<View onLayout={event=>setPreviewWidth(event.nativeEvent.layout.width)} accessibilityLabel={profileT(language,"{name}'s profile preview with {background}",{name:character.name,background:background?.name??base?.name??''})} style={s.frame}>
  <View style={[s.surface,!!borderSource&&s.framedSurface]}>
  <View style={s.scene}>
   <ProfileBorderBackdrop borderId={borderArt||directBorder?renderBorderId:(borderRuntime?.fallbackBorderId??renderBorderId)} source={borderSource} existingInset={8}>
   {background?<CardBackground sources={newBackground?.variants??personalBackgroundVariants.get(renderBackgroundId)??{wide:background.source,square:background.source}}/>:<RegionArtwork regionId={base!.region}/>}
   <View style={{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(3,4,5,.72)':'rgba(255,255,255,.68)'}}/>
   {active&&draconicBackground&&draconic?<DraconicStandardEffects ember={draconic.scene.ember} kind="background" active={active} reduceMotion={state.settings.reduceMotion}/>:null}
   {active&&celestialBackground?<CelestialStandardBackgroundEffects active={active} reduceMotion={state.settings.reduceMotion}/>:null}
   {effectArt?<ProfileSceneEffect art={effectArt} active={active} reduceMotion={state.settings.reduceMotion}/>:effectRuntime?<ProceduralProfileSceneEffect runtime={effectRuntime} active={active} reduceMotion={state.settings.reduceMotion}/>:null}
   </ProfileBorderBackdrop><View style={[s.identityPlate,compact?s.identityStackCompact:s.identityStack,compact&&s.compactIdentity]}>
    <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={privateName??effectivePlayerNameStyle(state)} reduceMotion={!active||state.settings.reduceMotion} numberOfLines={1} style={[s.name,compact&&s.compactName]}/><PlayerBadges identity={badges.identity}/></View>
    <Text numberOfLines={1} style={[s.title,{color:ownedUltraLuxeTitleColor(state,character.profileTitle,C.dark)??(C.dark?C.accentSoft:C.text)}]}>{character.profileTitle??profileT(language,"New Adventurer")}</Text>
    <Text numberOfLines={1} style={s.meta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
    <View style={s.identityFill}/>
    {compact?null:<PlayerBadgeShowcase identity={badges.identity} size={15}/>}
   </View>
   <CharacterPortrait state={state} style={[s.character,compact&&s.compactCharacter]}/>
   {petSource&&<View style={[s.petBadge,{right:anchors.side,bottom:anchors.bottom}]}><Image source={petSource} accessibilityLabel={pet?.name??petCollectible?.name??profileT(language,"Pet preview")} resizeMode="contain" style={s.petImage}/></View>}
  </View>
  </View>
  {borderSource?<ProfileFrameOverlay source={borderSource} sceneSafe/>:null}
  {borderArt?<AnimatedProfileBorderGlows art={borderArt} active={active} reduceMotion={state.settings.reduceMotion}/>:borderRuntime?<ProceduralProfileBorderGlows runtime={borderRuntime} active={active} reduceMotion={state.settings.reduceMotion}/>:null}
  {active&&draconicBorder&&draconic?<DraconicStandardEffects ember={draconic.scene.ember} kind="border" active={active} reduceMotion={state.settings.reduceMotion}/>:null}
  {active&&celestialBorder?<CelestialStandardBorderEffects active={active} reduceMotion={state.settings.reduceMotion}/>:null}
  {newLuxeBorder(renderBorderId)?<VerifiedCandidateBorderEffects id={renderBorderId} active={active} reduceMotion={state.settings.reduceMotion}/>:null}
 </View>;
 const candidate=candidateShowcase({...visualSelection,effect:character.profileEffectId},allowed);
 if(candidate)return <VerifiedCandidateShowcase collectionId={candidate.id} displayedBadges={displayedBadges} fullSet={candidate.fullSet} equippedPetId={visualSelection.pet} alternatePetSource={petSource} active={active} reduceMotion={state.settings.reduceMotion} fallback={standard}
  portrait={<CharacterPortrait state={state} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.draconicIdentity}>
   <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={privateName??effectivePlayerNameStyle(state)} reduceMotion={!active||state.settings.reduceMotion} numberOfLines={1} style={s.draconicName}/><PlayerBadges identity={badges.identity} size={12}/></View>
   <UltraLuxeTitleText title={character.profileTitle??profileT(language,'New Adventurer')} verified={!!candidateTitle} color={candidateTitle?.accent??'#EDEBFF'} style={s.draconicTitle}/>
   <Text numberOfLines={1} style={s.draconicMeta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
  </View>} badges={<PlayerBadgeShowcase identity={badges.identity} size={12} variant="bare"/>}/>;
 const celestial=ultraLuxeSceneEffectCompatible(character.profileEffectId,'premium:celestial-sovereign:celestial-alignment')&&visualSelection.background===CELESTIAL_IDS.background&&visualSelection.border===CELESTIAL_IDS.border?celestialAssets:undefined;
 if(draconic&&ultraLuxeSceneEffectCompatible(character.profileEffectId,'premium:draconic-dominion:awakening-of-the-dragon')&&visualSelection.background===DRACONIC_IDS.background&&visualSelection.border===DRACONIC_IDS.border){
 return <DraconicDominionPreview fullSet={ultraLuxeVisualTier({...DRACONIC_IDS,title:'ascendant-draconic-title'},visualSelection)==='ascendant'} assets={draconic.scene} equippedPetId={visualSelection.pet} alternatePetSource={petSource} petAccessibilityLabel={pet?.name??petCollectible?.name??profileT(language,'Pet preview')} active={active} reduceMotion={state.settings.reduceMotion} fallback={standard}
  portrait={<CharacterPortrait state={state} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.draconicIdentity}>
   <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={privateName??effectivePlayerNameStyle(state)} reduceMotion={!active||state.settings.reduceMotion} numberOfLines={1} style={s.draconicName}/><PlayerBadges identity={badges.identity} size={12}/></View>
   <UltraLuxeTitleText title={character.profileTitle??profileT(language,'New Adventurer')} verified={!!verifiedTitleId} color={ownedUltraLuxeTitleColor(state,character.profileTitle,true)??'#ffb76b'} style={s.draconicTitle}/>
   <Text numberOfLines={1} style={s.draconicMeta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
  </View>} badges={<PlayerBadgeShowcase identity={badges.identity} size={12} variant="bare"/>}/>;
 }
 if(!celestial)return standard;
 return <CelestialSovereignPreview fullSet={ultraLuxeVisualTier({...CELESTIAL_IDS,title:'ascendant-celestial-title'},visualSelection)==='ascendant'} assets={celestial.scene} equippedPetId={visualSelection.pet} matchingPetId={CELESTIAL_IDS.pet} alternatePetSource={petSource} petAccessibilityLabel={pet?.name??petCollectible?.name??profileT(language,'Pet preview')} active={active} reduceMotion={state.settings.reduceMotion} fallback={standard}
  portrait={<CharacterPortrait state={state} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.celestialIdentity}>
   <View style={s.nameRow}><PlayerStyledName name={character.name} nameStyle={privateName??effectivePlayerNameStyle(state)} reduceMotion={!active||state.settings.reduceMotion} numberOfLines={1} style={s.celestialName}/><PlayerBadges identity={badges.identity} size={12}/></View>
   <UltraLuxeTitleText title={character.profileTitle??profileT(language,'New Adventurer')} verified={!!verifiedTitleId} color={ownedUltraLuxeTitleColor(state,character.profileTitle,true)??'#efd69b'} style={s.celestialTitle}/>
   <Text numberOfLines={1} style={s.celestialMeta}>{profileT(language,'Lv. {level}',{level:character.level})} · {className}</Text>
   <PlayerBadgeShowcase identity={badges.identity} size={13} variant="bare"/>
  </View>}/>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 draconicIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 draconicName:{fontSize:11,lineHeight:12,includeFontPadding:false,color:'#fff0d6',fontWeight:'800',flexShrink:1,minWidth:0},
 draconicTitle:{fontSize:9,lineHeight:10,includeFontPadding:false,color:'#ffb76b'},
 draconicMeta:{fontSize:8,lineHeight:10,includeFontPadding:false,color:'#f6d4b9',flexShrink:1,minWidth:0},
 draconicMetaRow:{flexDirection:'row',gap:3,alignItems:'baseline'},
 celestialIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 celestialName:{fontSize:12,lineHeight:15,color:'#fff0c8',fontWeight:'800',flexShrink:1,minWidth:0,includeFontPadding:false},
 celestialTitle:{fontSize:10,lineHeight:12,color:'#efd69b',includeFontPadding:false},
 celestialMeta:{fontSize:9,lineHeight:12,color:'#d6e0f4',includeFontPadding:false},
 frame:{width:'100%',maxWidth:480,alignSelf:'center',position:'relative'},
 surface:{borderRadius:14,overflow:'hidden',backgroundColor:C.panel},
 framedSurface:{margin:8,borderRadius:4},
 scene:{width:'100%',minHeight:190,alignItems:'center',overflow:'hidden',backgroundColor:C.stage},
 character:{position:'absolute',left:20,top:24,width:96,height:96,zIndex:2},
 compactCharacter:{left:12,top:24,width:64,height:64},compactIdentity:{left:88,right:12},compactName:{fontSize:16,lineHeight:22},
 petBadge:{position:'absolute',zIndex:3},petImage:{width:56,height:56},
 nameRow:{flexDirection:'row',alignItems:'center',gap:5},
});}
