import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Modal,Platform,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COMPANION_TOUR_STEPS,companionTutorialContext} from '../core/companion-tutorial';
import type {GameState} from '../core/types';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTutorialText} from '../i18n/companion-tutorial';
import {companionContent} from '../i18n/companions';
import {CombatCompanionPanel} from './CombatCompanionPanel';
import {UiIcon} from './UiIcon';
import type {UiIconName} from '../theme/ui-icons';

const icons:UiIconName[]=['companions','training','sanctuary','trials','world','quests'];
const noCommand=async()=>{};

/** Required, read-only tour of live screens. No resources or team prerequisites are needed. */
export function CompanionTutorial({state,now,step,onAdvance,onFinish}:{state:GameState;now:number;step:number;onAdvance:()=>void;onFinish:()=>void}){
 const C=useGameTheme(),language=useGameLanguage(),t=(source:string)=>companionTutorialText(language,source);
 const pulse=useRef(new Animated.Value(0)).current;
 const [reviewStep,setReviewStep]=useState<number|null>(null),[showMore,setShowMore]=useState(false);
 const index=Math.min(reviewStep??step,step),current=COMPANION_TOUR_STEPS[index],next=COMPANION_TOUR_STEPS[index+1];
 const previous=()=>{if(index>0){setReviewStep(index-1);setShowMore(false);}};
 const advance=()=>{
  setShowMore(false);
  if(index<step){setReviewStep(index+1<step?index+1:null);return;}
  setReviewStep(null);onAdvance();if(!next)onFinish();
 };
 const context=companionTutorialContext(state,current?.section??'Collection');
 const action=next?t('Next: {area}').replace('{area}',companionContent(language,next.section)):t('Finish guide');
 useEffect(()=>{
  pulse.setValue(0);
  if(state.settings.reduceMotion)return;
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(pulse,{toValue:1,duration:850,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(pulse,{toValue:0,duration:850,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));animation.start();return()=>animation.stop();
 },[pulse,index,state.settings.reduceMotion]);
 if(!current)return null;
 return <Modal visible animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={previous}>
  <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
   <View style={{paddingHorizontal:20,paddingTop:12,paddingBottom:12,gap:10,borderBottomWidth:1,borderColor:C.line}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
     <Text style={{fontSize:11,letterSpacing:1.4,fontWeight:'600',color:C.accent}}>{t('COMPANION GUIDE')}</Text>
     <View style={{flexDirection:'row',alignItems:'center',gap:12}}>{index>0&&<Pressable accessibilityRole="button" accessibilityLabel={t('Previous tip')} onPress={previous} style={{minHeight:44,justifyContent:'center'}}><Text style={{fontSize:13,color:C.accent}}>{t('Previous tip')}</Text></Pressable>}<Text style={{fontSize:12,color:C.muted}}>{index+1} / {COMPANION_TOUR_STEPS.length}</Text></View>
    </View>
    <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:COMPANION_TOUR_STEPS.length,now:index+1}} accessibilityLabel={t('Companion guide progress')} style={{flexDirection:'row',gap:5}}>
     {COMPANION_TOUR_STEPS.map((row,position)=><View key={row.section} style={{flex:1,height:4,borderRadius:2,backgroundColor:position<=index?C.accent:C.line}}/>)}
    </View>
   </View>
   <ScrollView key={index} contentContainerStyle={{padding:16,gap:12}} showsVerticalScrollIndicator>
    <View accessibilityLiveRegion="polite" style={{padding:14,borderRadius:18,backgroundColor:C.infoSurface,borderWidth:1,borderColor:C.info,gap:8}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}><UiIcon name={icons[index]} size={26}/><Text accessibilityRole="header" style={{fontSize:18,fontWeight:'600',color:C.text,flex:1}}>{t(current.title)}</Text></View>
     <Text style={{fontSize:14,lineHeight:20,color:C.text}}>{t(current.body)}</Text>
     <Text style={{fontSize:13,lineHeight:19,color:C.info}}>{t(context.text).replace('{name}',context.name??'')}</Text>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:showMore}} onPress={()=>setShowMore(value=>!value)} style={{minHeight:44,justifyContent:'center'}}><Text style={{fontSize:12,fontWeight:'600',color:C.accent}}>{t(showMore?'Less detail':'More detail')}</Text></Pressable>
     {showMore&&<Text style={{fontSize:13,lineHeight:19,color:C.info}}>{t(current.hint)}</Text>}
    </View>
    <View style={{gap:3}}><Text style={{fontSize:11,fontWeight:'600',letterSpacing:1,color:C.accent}}>{t('SCREEN PREVIEW')}</Text><Text style={{fontSize:12,color:C.muted}}>{t('Scroll to look around. Buttons are disabled during the guide.')}</Text></View>
    <View pointerEvents="none" aria-hidden={true} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS==='web'?{inert:true}:{})}>
     <CombatCompanionPanel key={current.section} state={state} now={now} onCommand={noCommand}/>
    </View>
   </ScrollView>
   <View style={{padding:16,gap:8,borderTopWidth:1,borderColor:C.line,backgroundColor:C.panel}}>
    {!next&&<Text style={{fontSize:12,textAlign:'center',color:C.muted}}>{t('Finish to open your roster and equip a helper.')}</Text>}
    <View>
     <Animated.View pointerEvents="none" style={{position:'absolute',inset:-4,borderRadius:16,borderWidth:2,borderColor:C.accent,opacity:state.settings.reduceMotion?1:pulse.interpolate({inputRange:[0,1],outputRange:[.25,1]})}}/>
     <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={advance} style={({pressed})=>({minHeight:54,padding:14,borderRadius:12,borderWidth:1,borderColor:C.accent,backgroundColor:C.accentSurface,opacity:pressed?.7:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10})}>
      <UiIcon name={next?icons[index+1]:'companions'} size={24}/><Text style={{fontSize:16,fontWeight:'600',color:C.text,flexShrink:1}}>{action}</Text>
     </Pressable>
    </View>
   </View>
  </SafeAreaView>
 </Modal>;
}
