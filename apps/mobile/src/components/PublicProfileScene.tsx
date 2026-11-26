import {candidateAppearanceIds,candidateShowcase,candidateVerifiedTitle,LEGACY_CANDIDATE_WARDROBE} from '../core/ultra-luxe-owned-wardrobe';
import {newLuxeBackground,newLuxeBorder,newLuxePet} from '../theme/ultra-luxe-candidate-art';
import {VerifiedCandidateShowcase,VerifiedCandidateBorderEffects} from './profile/VerifiedCandidateShowcase';
import {UltraLuxeTitleText} from './profile/UltraLuxeIdentityMotion';
import {ultraLuxeVisualTier,resolveTesterUltraLuxeVisuals,ultraLuxeSceneEffectCompatible} from '../core/ultra-luxe-set-visuals';
import {playerBadgeIds,profileBadgeIds} from '../core/player-badges';
import {verifiedUltraLuxeTitleColor} from '../core/ultra-luxe-titles';
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
import {profileBorderSourceById,resolveProfileBorderArtworkId} from '../theme/profile-border-assets';
import {petArtSource} from '../theme/pet-art';
import {BASE_PROFILE_BACKGROUNDS} from '../core/profile-cosmetics';
import {CLASSES} from '../content/classes';
import type {ClassId} from '../core/types';
import {radii,type ThemeColors} from '../theme/theme';
import {profileShowcaseStyles} from '../theme/profile-showcase-styles';
import {useGameTheme} from '../theme/ThemeContext';
import {ProfileFrameOverlay} from './ProfileFrameOverlay';
import {ProfileBorderBackdrop} from './ProfileBorderBackdrop';
import {AnimatedProfileBorderGlows,ProceduralProfileBorderGlows,ProceduralProfileSceneEffect,ProfileCosmeticExteriorMatte,ProfileSceneEffect} from './ProfileCosmeticMotion';
import {cosmeticArtByBorder,cosmeticArtByEffect,type CosmeticRenderArt} from '../theme/profile-cosmetic-render-art';
import {PROFILE_ANIMATED_COSMETICS_RELEASED} from '../core/release-flags';
import {wave2SetFor,wave2PublicRenderable} from '../core/profile-cosmetic-wave2';
import {profileCosmeticRuntimeByBorder,profileCosmeticRuntimeByEffect,type ProfileCosmeticRuntime} from '../theme/profile-cosmetic-runtime-v1';
import {profileSceneContentAnchors} from '../core/profile-frame-layout';
import {CardBackground} from './CardBackground';
import {personalBackgroundVariants} from '../theme/card-background-assets';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';
import {PlayerBadgeShowcase,useBadgeClock} from './PlayerBadges';
import {ProfileGuildAffiliation} from './ProfileGuildAffiliation';
import {CelestialSovereignPreview} from './profile/CelestialSovereignPreview';
import {CELESTIAL_IDS,getEnabledCelestialAssets} from '../theme/celestial-integration-assets';
import {CelestialStandardBackgroundEffects,CelestialStandardBorderEffects} from './profile/CelestialStandardEffects';

/** Local-only QA overrides. Never derive effects from a border or grant ownership. */
export type ProfileCosmeticReviewSelection={borderArt?:CosmeticRenderArt;effectArt?:CosmeticRenderArt;borderRuntime?:ProfileCosmeticRuntime;effectRuntime?:ProfileCosmeticRuntime;active:boolean;surroundColor:string};
export function PublicProfileScene({profile,height=205,reduceMotion=false,showGuild=true,reviewCosmetics,allowUnreleasedCosmetics=false,cosmeticsActive=true,active:stageActive}:{profile:PublicPlayerProfileV43;height?:number;reduceMotion?:boolean;showGuild?:boolean;reviewCosmetics?:ProfileCosmeticReviewSelection;allowUnreleasedCosmetics?:boolean;cosmeticsActive?:boolean;active?:boolean}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const badgeNow=useBadgeClock(profile.playerBadges);
 const displayedBadges=[...playerBadgeIds(profile.playerBadges,badgeNow),...profileBadgeIds(profile.playerBadges,badgeNow)];
 // The older boolean marker certifies only the legacy pair. New public IDs need
 // a six-set server appearance projection before they can render for other players.
 const allowed=profile.ultraLuxeAppearanceVerified===true?LEGACY_CANDIDATE_WARDROBE.map(c=>c.id):[];
 const safe=candidateAppearanceIds({background:profile.backgroundId,border:profile.borderId,pet:profile.petId,displayedBadges},allowed);
 const candidateTitle=candidateVerifiedTitle(profile.title,profile.ultraLuxeTitleId,allowed);
 const verifiedTitleId=candidateTitle?.titleId??(verifiedUltraLuxeTitleColor(profile.title,profile.ultraLuxeTitleId)?profile.ultraLuxeTitleId:undefined);
 const testerPreview=profile.cosmeticsPreview===true;
 const visualSelection=resolveTesterUltraLuxeVisuals({...safe,verifiedTitleId,displayedBadges},{
  background:testerPreview,border:testerPreview,pet:testerPreview,
 });
 const renderBackgroundId=visualSelection.background??safe.background??'asterfall-night';
 const renderBorderId=visualSelection.border??'';
 const renderPetId=visualSelection.pet??'';
 const newBackground=newLuxeBackground(renderBackgroundId);
 const background=newBackground??profileBackgroundPreviewById.get(renderBackgroundId),base=BASE_PROFILE_BACKGROUNDS.find(row=>row.id===renderBackgroundId);
 const review=__DEV__?reviewCosmetics:undefined;
 const active=cosmeticsActive&&(stageActive??true)&&(review?.active??true);
 const animated=PROFILE_ANIMATED_COSMETICS_RELEASED||allowUnreleasedCosmetics||profile.cosmeticsPreview===true;
 const borderAnimated=wave2SetFor('border',renderBorderId)?wave2PublicRenderable('border',renderBorderId):animated;
 const effectAnimated=wave2SetFor('effect',profile.effectId??'')?wave2PublicRenderable('effect',profile.effectId??''):animated;
 const equippedBorderArt=!review&&borderAnimated&&renderBorderId?cosmeticArtByBorder.get(renderBorderId):undefined;
 const borderArt=review?.borderArt??equippedBorderArt,effectArt=review?.effectArt??(!review&&effectAnimated&&profile.effectId?cosmeticArtByEffect.get(profile.effectId):undefined);
 const borderRuntime=review?.borderRuntime??(!review&&borderAnimated&&renderBorderId?profileCosmeticRuntimeByBorder.get(renderBorderId):undefined),effectRuntime=review?.effectRuntime??(!review&&effectAnimated&&profile.effectId?profileCosmeticRuntimeByEffect.get(profile.effectId):undefined);
 const reviewBorderId=review?.borderRuntime?.borderId;
 const runtimeFallbackBorderId=review?.borderRuntime?.fallbackBorderId??borderRuntime?.fallbackBorderId;
 const directBorder=!review&&renderBorderId?(newLuxeBorder(renderBorderId)??profileBorderSourceById.get(renderBorderId)):undefined;
 const reviewArtworkId=review?resolveProfileBorderArtworkId(reviewBorderId,runtimeFallbackBorderId):undefined;
 const border=review?(borderArt?.border??(reviewArtworkId?profileBorderSourceById.get(reviewArtworkId):undefined)):borderArt?.border??directBorder??(borderRuntime?profileBorderSourceById.get(borderRuntime.fallbackBorderId):undefined),pet=renderPetId?(newLuxePet(renderPetId)??petArtSource(renderPetId)):undefined;
 const anchors=profileSceneContentAnchors(border?8:0);
 const classId=(CLASSES.some(row=>row.id===profile.character.classId)?profile.character.classId:'IRONWARDEN') as ClassId;
 const className=CLASSES.find(row=>row.id===classId)!.name;
 const guild=profile.guild===undefined?(profile.guildTag?{tag:profile.guildTag,tagColorId:profile.guildTagColorId}:null):profile.guild;
 const celestialAssets=getEnabledCelestialAssets();
 const celestialBackground=!review&&!!celestialAssets&&renderBackgroundId===CELESTIAL_IDS.background;
 const celestialBorder=!review&&!!celestialAssets&&renderBorderId===CELESTIAL_IDS.border;
 const draconic=getDraconicAssets();
 const draconicBackground=!review&&!!draconic&&renderBackgroundId===DRACONIC_IDS.background;
 const draconicBorder=!review&&!!draconic&&renderBorderId===DRACONIC_IDS.border;
 const standard=<View accessibilityLabel={profileT(language,'{name} profile scene',{name:profile.character.name})} style={s.card}>
  <View style={[s.surface,!!border&&s.framedSurface]}>
  <View style={[s.scene,{height}]}>
   <ProfileBorderBackdrop borderId={borderArt||directBorder?(review?reviewBorderId:renderBorderId):(reviewArtworkId??runtimeFallbackBorderId??(review?reviewBorderId:renderBorderId))} source={border} existingInset={8}>
   {background?<CardBackground sources={newBackground?.variants??personalBackgroundVariants.get(renderBackgroundId)??{wide:background.source,square:background.source}}/>:base?<RegionArtwork regionId={base.region}/>:null}
   <View style={s.shade}/>
   {active&&draconicBackground&&draconic?<DraconicStandardEffects ember={draconic.scene.ember} kind="background" active={active} reduceMotion={reduceMotion}/>:null}
   {active&&celestialBackground?<CelestialStandardBackgroundEffects active={active} reduceMotion={reduceMotion}/>:null}
   {effectArt?<ProfileSceneEffect art={effectArt} active={active} reduceMotion={reduceMotion}/>:effectRuntime?<ProceduralProfileSceneEffect runtime={effectRuntime} active={active} reduceMotion={reduceMotion}/>:null}
   </ProfileBorderBackdrop>
   {borderArt?.matte?<View pointerEvents="none" style={{position:'absolute',top:-8,left:-8,right:-8,bottom:-8}}><ProfileCosmeticExteriorMatte source={borderArt.matte} color={review?.surroundColor??C.bg}/></View>:null}
  <View style={[s.identityPlate,s.identityStack]}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={!active||reduceMotion} style={s.name}/>
   <Text numberOfLines={1} style={[s.title,{color:verifiedUltraLuxeTitleColor(profile.title,profile.ultraLuxeTitleId,C.dark)??(C.dark?C.accentSoft:C.text)}]}>{profile.title}</Text>
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
  {borderArt?<AnimatedProfileBorderGlows art={borderArt} active={active} reduceMotion={reduceMotion}/>:borderRuntime?<ProceduralProfileBorderGlows runtime={borderRuntime} active={active} reduceMotion={reduceMotion}/>:null}
  {active&&draconicBorder&&draconic?<DraconicStandardEffects ember={draconic.scene.ember} kind="border" active={active} reduceMotion={reduceMotion}/>:null}
  {active&&celestialBorder?<CelestialStandardBorderEffects active={active} reduceMotion={reduceMotion}/>:null}
  {!review&&newLuxeBorder(renderBorderId)?<VerifiedCandidateBorderEffects id={renderBorderId} active={active} reduceMotion={reduceMotion}/>:null}
 </View>;
 const candidate=!review&&height>=205?candidateShowcase({...visualSelection,effect:profile.effectId},allowed):undefined;
 if(candidate)return <VerifiedCandidateShowcase collectionId={candidate.id} fullSet={candidate.fullSet} equippedPetId={visualSelection.pet} alternatePetSource={pet} active={active} reduceMotion={reduceMotion} fallback={standard}
  portrait={<CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.draconicIdentity}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={!active||reduceMotion} style={s.draconicName} badgeSize={11}/>
   <UltraLuxeTitleText title={profile.title} verified={!!candidateTitle} color={candidateTitle?.accent??'#EDEBFF'} style={s.draconicTitle}/>
   <Text numberOfLines={1} style={s.draconicMeta}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>{profile.combatPower!==undefined?<Text numberOfLines={1} style={s.draconicMeta}>{profile.combatPower.toLocaleString()} CP</Text>:null}
  </View>} badges={<PlayerBadgeShowcase identity={profile.playerBadges} size={12} variant="bare"/>} guild={showGuild&&guild?<ProfileGuildAffiliation guild={guild} showcase/>:undefined}/>;
 const celestial=!review&&height>=205&&ultraLuxeSceneEffectCompatible(profile.effectId,'premium:celestial-sovereign:celestial-alignment')&&visualSelection.background===CELESTIAL_IDS.background&&visualSelection.border===CELESTIAL_IDS.border?celestialAssets:undefined;
 if(!review&&draconic&&ultraLuxeSceneEffectCompatible(profile.effectId,'premium:draconic-dominion:awakening-of-the-dragon')&&visualSelection.background===DRACONIC_IDS.background&&visualSelection.border===DRACONIC_IDS.border&&height>=205){
 return <DraconicDominionPreview fullSet={ultraLuxeVisualTier({...DRACONIC_IDS,title:'ascendant-draconic-title'},visualSelection)==='ascendant'} assets={draconic.scene} equippedPetId={visualSelection.pet} alternatePetSource={pet} petAccessibilityLabel={visualSelection.pet===DRACONIC_IDS.pet?'Vharaxis, the Eternal Flame':profileT(language,'Pet preview')} active={active} reduceMotion={reduceMotion} fallback={standard}
  portrait={<CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.draconicIdentity}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={!active||reduceMotion} style={s.draconicName} badgeSize={11}/>
   <UltraLuxeTitleText title={profile.title} verified={!!verifiedTitleId} color={verifiedUltraLuxeTitleColor(profile.title,profile.ultraLuxeTitleId,true)??'#ffb76b'} style={s.draconicTitle}/>
   <Text numberOfLines={1} style={s.draconicMeta}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>{profile.combatPower!==undefined?<Text numberOfLines={1} style={s.draconicMeta}>{profile.combatPower.toLocaleString()} CP</Text>:null}
  </View>}
  badges={<PlayerBadgeShowcase identity={profile.playerBadges} size={12} variant="bare"/>}
  guild={showGuild&&guild?<ProfileGuildAffiliation guild={guild} showcase/>:undefined}/>;
 }
 if(!celestial)return standard;
 return <CelestialSovereignPreview fullSet={ultraLuxeVisualTier({...CELESTIAL_IDS,title:'ascendant-celestial-title'},visualSelection)==='ascendant'} assets={celestial.scene} equippedPetId={visualSelection.pet} matchingPetId={CELESTIAL_IDS.pet} alternatePetSource={pet} petAccessibilityLabel={profileT(language,'Pet preview')} active={active} reduceMotion={reduceMotion} fallback={standard}
  portrait={<CharacterPortraitSelection classId={classId} body={profile.character.bodyPresentation} profileIconId={profile.character.profileIconId} compact style={{width:'100%',height:'100%'}}/>}
  identity={<View style={s.celestialIdentity}>
   <GuildTaggedPlayerName accountId={profile.accountId} badges={profile.playerBadges} name={profile.character.name||profile.displayName} nameStyle={profile.nameStyle??undefined} reduceMotion={!active||reduceMotion} style={s.celestialName}/>
   <UltraLuxeTitleText title={profile.title} verified={!!verifiedTitleId} color={verifiedUltraLuxeTitleColor(profile.title,profile.ultraLuxeTitleId,true)??'#efd69b'} style={s.celestialTitle}/>
   <View style={s.celestialMetaRow}><Text numberOfLines={1} style={s.celestialMeta}>{profileT(language,'Lv. {level}',{level:profile.character.level})} · {className}</Text>{profile.combatPower!==undefined?<Text numberOfLines={1} style={s.celestialPower}>{profile.combatPower.toLocaleString()}</Text>:null}</View>
   <PlayerBadgeShowcase identity={profile.playerBadges} size={13} variant="bare"/>
  </View>}
  guild={showGuild&&guild?<ProfileGuildAffiliation guild={guild} showcase/>:undefined}/>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 ...profileShowcaseStyles(C),
 draconicIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 draconicName:{fontSize:11,lineHeight:12,includeFontPadding:false,color:'#fff0d6',fontWeight:'800',flexShrink:1,minWidth:0},
 draconicTitle:{fontSize:9,lineHeight:10,includeFontPadding:false,color:'#ffb76b'},
 draconicMeta:{fontSize:8,lineHeight:9,includeFontPadding:false,color:'#f6d4b9',flexShrink:1,minWidth:0},
 celestialIdentity:{flex:1,minWidth:0,overflow:'hidden'},
 celestialName:{fontSize:12,lineHeight:15,color:'#fff0c8',fontWeight:'800',flexShrink:1,minWidth:0,includeFontPadding:false},
 celestialTitle:{fontSize:10,lineHeight:12,color:'#efd69b',includeFontPadding:false},
 celestialMetaRow:{flexDirection:'row',gap:3,alignItems:'baseline'},
 celestialMeta:{flex:1,minWidth:0,fontSize:9,lineHeight:12,color:'#d6e0f4',includeFontPadding:false},
 celestialPower:{flexShrink:0,fontSize:9,lineHeight:12,color:'#d6e0f4',includeFontPadding:false},
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
