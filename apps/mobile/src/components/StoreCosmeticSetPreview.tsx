import {useMemo,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {ProfileCosmeticStoreCollection} from '../content/profile-cosmetic-store';
import type {PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {NEXT_PREMIUM_SETS} from '../core/next-premium-set-review';
import {ultraLuxeGradient} from '../core/ultra-luxe-name-gradients';
import {getNextPremiumReviewBackground} from '../theme/next-premium-background-review-assets';
import {getNextPremiumReviewFrame} from '../theme/next-premium-frame-review-assets';
import {getNextPremiumReviewPet} from '../theme/next-premium-pet-review-assets';
import {getNextPremiumReviewDecoration} from '../theme/next-premium-decoration-review-assets';
import {useGameTheme} from '../theme/ThemeContext';
import {type ThemeColors} from '../theme/theme';
import {PublicProfileScene} from './PublicProfileScene';
import {ProfileIcon} from './ProfileIcon';
import {PlayerStyledName} from './PlayerStyledName';
import {NextPremiumShowcaseStage} from './profile/VerifiedCandidateShowcase';

export type StorePreviewSelection={kind:'standard';collection:ProfileCosmeticStoreCollection}|{kind:'sakura'};
const SAKURA=NEXT_PREMIUM_SETS[0];
/** Local presentation only. Never copy a fixture into saved state, public RPC
 * verification fields, entitlement data, or checkout payloads. */
export function StoreCosmeticSetPreview({state,selection,onClose}:{state:GameState;selection:StorePreviewSelection;onClose:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [portraitIndex,setPortraitIndex]=useState<0|1>(0);
 const [paused,setPaused]=useState(false);
 const reduced=!!state.settings.reduceMotion||paused;
 const classId=state.character?.classId??'IRONWARDEN';
 const title=selection.kind==='standard'?selection.collection.name:SAKURA.name;
 const sampleName='Adventurer';
 const palette=ultraLuxeGradient(SAKURA.nameStyle);
 const standard=selection.kind==='standard'?selection.collection:undefined;
 const portrait=standard?.portraits[portraitIndex];
 // A fixed public-shaped render fixture, not a real account or public RPC response.
 const fixture:PublicPlayerProfileV43|undefined=standard&&portrait?{
  accountId:'',displayName:sampleName,visibility:'private',
  character:{id:'',name:sampleName,classId,level:state.character?.level??1,bodyPresentation:portrait.presentation,profileIconId:portrait.id},
  title:'New Adventurer',backgroundId:'asterfall-night',borderId:standard.border.itemId,effectId:standard.effect.itemId,
  bio:'',achievementShowcaseIds:[],collectionShowcase:[],recordShowcaseIds:[],masteryShowcaseActionIds:[],revision:0,
 }:undefined;
 const sakuraBackground=getNextPremiumReviewBackground(SAKURA.background,'wide');
 const sakuraBorder=getNextPremiumReviewFrame(SAKURA.border,'showcase');
 const sakuraPet=getNextPremiumReviewPet(SAKURA.pet);
 const sakuraDecoration=getNextPremiumReviewDecoration(SAKURA.id);
 const identity=<View style={{minWidth:0,gap:2}}>
  <PlayerStyledName name={sampleName} nameStyle={palette?{mode:'gradient',gradientColors:[...palette.colors],animation:'flow'}:undefined} reduceMotion={reduced} style={s.sampleName}/>
  <Text numberOfLines={1} style={s.sampleTitle}>{SAKURA.titleName}</Text>
  <Text numberOfLines={1} style={s.sampleMeta}>Lv. {state.character?.level??1}</Text>
 </View>;
 const staticSakura=<View style={s.fallback}>
  <Text style={s.copy}>Full animated showcase needs a wider view and supported text size. Original set artwork is shown below.</Text>
  {sakuraBackground&&sakuraBorder?<View style={s.staticScene}>
   <Image source={sakuraBackground} resizeMode="stretch" style={StyleSheet.absoluteFill}/>
   <Image source={sakuraBorder} resizeMode="stretch" style={StyleSheet.absoluteFill}/>
  </View>:null}
  <View style={s.staticPieces}>
   {sakuraPet?<Image source={sakuraPet.showcase} resizeMode="contain" style={s.staticPet}/>:null}
   {sakuraDecoration?<Image source={sakuraDecoration.badge} resizeMode="contain" style={s.staticBadge}/>:null}
   <View style={{flex:1,minWidth:0}}>{identity}</View>
  </View>
 </View>;
 return <Modal visible animationType="none" transparent onRequestClose={onClose}>
  <View style={s.backdrop}>
   <View style={s.sheet} accessibilityViewIsModal>
    <View style={s.header}><View style={{flex:1,minWidth:0}}><Text style={s.eyebrow}>LIVE SET PREVIEW</Text><Text accessibilityRole="header" style={s.title}>{title}</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel="Close preview" onPress={onClose} style={s.action}><Text style={s.actionText}>Close</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
     <Text style={s.copy}>Preview only · no cosmetics are equipped or granted.</Text>
     {fixture?<PublicProfileScene profile={fixture} height={205} showGuild={false} allowUnreleasedCosmetics reduceMotion={reduced} cosmeticsActive={!paused}/>:<NextPremiumShowcaseStage collectionId={SAKURA.id} equippedPetId={SAKURA.pet} fullSet active={!paused} reduceMotion={reduced}
      portrait={<ProfileIcon classId={classId} size={36} style={{width:'100%',height:'100%'}}/>} identity={identity} fallback={staticSakura}/>}
     <Pressable accessibilityRole="button" accessibilityLabel={paused?'Play animation':'Pause animation'} accessibilityState={{disabled:!!state.settings.reduceMotion}} disabled={!!state.settings.reduceMotion} onPress={()=>setPaused(v=>!v)} style={s.action}>
      <Text style={s.actionText}>{state.settings.reduceMotion?'Reduced motion enabled':paused?'Play animation':'Pause animation'}</Text>
     </Pressable>
     {standard?<><Text style={s.copy}>Choose either included portrait to preview it. Background and sample identity are not included.</Text>
      <View style={s.portraits}>{standard.portraits.map((p,i)=><Pressable key={p.id} accessibilityRole="button" accessibilityLabel={'Preview '+p.name} accessibilityState={{selected:portraitIndex===i}} onPress={()=>setPortraitIndex(i===0?0:1)} style={[s.portrait,portraitIndex===i&&{borderColor:standard.accent}]}>
       <ProfileIcon id={p.id} classId={classId} size={58}/><Text style={s.actionText}>{p.name}</Text>
      </Pressable>)}</View>
      <Text style={s.copy}>{standard.border.name} · {standard.effect.name} · 2 portrait icons</Text>
     </>:<Text style={s.copy}>{SAKURA.backgroundName} · {SAKURA.borderName} · {SAKURA.petName} · {SAKURA.badgeName} · {SAKURA.titleName} · {palette?.name??'Matching name style'}. Tap the fox in the animated showcase to see its reaction.</Text>}
    </ScrollView>
   </View>
  </View>
 </Modal>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 backdrop:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:6,paddingVertical:16,backgroundColor:'rgba(0,0,0,.76)'},
 sheet:{width:'100%',maxWidth:500,maxHeight:'100%',borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panelRaised,overflow:'hidden'},
 header:{flexDirection:'row',alignItems:'center',gap:6,padding:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 eyebrow:{color:C.accent,fontSize:10,fontWeight:'800'},title:{color:C.text,fontSize:18,fontWeight:'900'},
 body:{padding:8,gap:10},copy:{fontSize:12,lineHeight:17,color:C.muted},
 action:{minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:7,backgroundColor:C.panel},
 actionText:{color:C.text,fontSize:12,fontWeight:'800',textAlign:'center'},portraits:{flexDirection:'row',gap:6},
 portrait:{flex:1,minWidth:0,alignItems:'center',gap:4,borderRadius:7,borderWidth:1,borderColor:C.line,padding:6,backgroundColor:C.panel},
 sampleName:{color:'#FFF5FA',fontSize:14,fontWeight:'900'},sampleTitle:{color:'#F5A6C8',fontSize:10,fontWeight:'800'},sampleMeta:{color:'#FFF5FA',fontSize:10},
 fallback:{gap:6},staticScene:{width:'100%',aspectRatio:340/205,position:'relative'},staticPieces:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#151020',padding:6},
 staticPet:{width:64,height:64},staticBadge:{width:26,height:26},
});}
