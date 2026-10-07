import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Pressable,StyleSheet,Text,View} from 'react-native';
import {advanceGuildTutorial,GUILD_TUTORIAL_STEPS,guildTutorialContext,type GuildTutorialDestination,type GuildTutorialProgress} from '../core/guild-tutorial';
import {guildTutorialText} from '../i18n/guild-tutorial';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

export interface GuildTutorialGuideProps{
 progress:GuildTutorialProgress;role:'member'|'officer'|'leader';home:boolean;reduceMotion?:boolean;
 destination?:GuildTutorialDestination|null;
 onProgress:(next:GuildTutorialProgress)=>void;onNavigate:(destination:GuildTutorialDestination)=>void;onReveal:()=>void;

}
/** Same guide in production and basic-member QA; navigation never sends chat or spends resources. */
export function GuildTutorialGuide({progress,role,home,reduceMotion=false,destination,onProgress,onNavigate,onReveal}:GuildTutorialGuideProps){
 const C=useGameTheme(),language=useGameLanguage(),t=(text:string)=>guildTutorialText(language,text);
 const [exploring,setExploring]=useState(false),[details,setDetails]=useState(false);
 const pulse=useRef(new Animated.Value(0)).current;
 const active=progress.status==='active',step=GUILD_TUTORIAL_STEPS[progress.step],last=progress.step===GUILD_TUTORIAL_STEPS.length-1;
 useEffect(()=>{setExploring(false);setDetails(false);},[progress.step,progress.status]);
 useEffect(()=>{
  pulse.setValue(0);if(reduceMotion||!active)return;
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(pulse,{toValue:1,duration:900,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(pulse,{toValue:0,duration:900,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));animation.start();return()=>animation.stop();
 },[pulse,reduceMotion,active,progress.step,exploring]);
 if(!active)return home?<GameButton compact title={t(progress.status==='complete'?'Replay guild guide':'Resume guild guide')} tone="secondary" onPress={()=>{const next={step:progress.status==='complete'?0:progress.step,status:'active' as const};onProgress(next);onNavigate(GUILD_TUTORIAL_STEPS[next.step].destination);onReveal();}}/>:null;
 const atTarget=destination===undefined||destination===step.destination;
 const open=()=>{setExploring(true);setDetails(false);onNavigate(step.destination);};
 const next=()=>{const updated=advanceGuildTutorial(progress);onProgress(updated);onNavigate(updated.status==='complete'?'Home':GUILD_TUTORIAL_STEPS[updated.step].destination);onReveal();};
 const action=exploring&&atTarget?t(last?'Finish guide':'Continue guide'):t(step.action);
 const minor=(text:string,onPress:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={t(text)} onPress={onPress} style={s.minor}><Text style={{fontSize:12,color:C.accent}}>{t(text)}</Text></Pressable>;
 return <View style={[s.card,{backgroundColor:C.panel,borderColor:C.selectionLine}]}>
  <View style={s.heading}><Text style={[s.eyebrow,{color:C.accent}]}>{t('YOUR GUILD GUIDE')}</Text><Text style={{fontSize:12,color:C.muted}}>{progress.step+1} / {GUILD_TUTORIAL_STEPS.length}</Text></View>
  {!exploring&&<View accessibilityRole="progressbar" accessibilityLabel={t('Guild guide progress')} accessibilityValue={{min:1,max:GUILD_TUTORIAL_STEPS.length,now:progress.step+1}} style={[s.track,{backgroundColor:C.panel2}]}><View style={{height:4,width:`${(progress.step+1)/GUILD_TUTORIAL_STEPS.length*100}%`,backgroundColor:C.accent}}/></View>}
  <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[s.title,{color:C.text,fontSize:exploring?15:18}]}>{t(step.title)}</Text>
  {!exploring?<>
   <Text style={[s.body,{color:C.text}]}>{t(step.body)}</Text>
   <Text style={[s.tip,{color:C.info}]}>{t(guildTutorialContext(step.destination,role))}</Text>
   {details&&<Text style={[s.tip,{color:C.muted}]}>{t(step.tip)}</Text>}
  </>:!atTarget?<Text style={[s.tip,{color:C.info}]}>{t('Return to this section before continuing the guide.')}</Text>:<Text style={[s.tip,{color:C.muted}]}>{t('Look around below. No message, contribution or purchase is required.')}</Text>}
  <View style={{marginTop:4}}>
   <Animated.View pointerEvents="none" style={{position:'absolute',inset:-3,borderRadius:12,borderWidth:2,borderColor:C.accent,opacity:reduceMotion?1:pulse.interpolate({inputRange:[0,1],outputRange:[.2,.85]})}}/>
   <GameButton compact title={action} onPress={exploring&&atTarget?next:open}/>
  </View>
  <View style={s.actions}>
   {exploring?minor('Read tip again',()=>{setExploring(false);onReveal();}):minor(details?'Less detail':'More detail',()=>setDetails(value=>!value))}
   {progress.step>0&&minor('Previous tip',()=>{onProgress({...progress,step:progress.step-1});onNavigate(GUILD_TUTORIAL_STEPS[progress.step-1].destination);onReveal();})}
   {minor('Pause guide',()=>onProgress({...progress,status:'paused'}))}
  </View>
 </View>;
}
const s=StyleSheet.create({card:{padding:14,borderWidth:1,borderRadius:16,gap:8},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},eyebrow:{fontSize:11,fontWeight:'600',letterSpacing:.7},track:{height:4,borderRadius:2,overflow:'hidden'},title:{fontSize:18,lineHeight:24,fontWeight:'600'},body:{fontSize:14,lineHeight:20},tip:{fontSize:13,lineHeight:19},actions:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:4},minor:{minHeight:44,justifyContent:'center',paddingHorizontal:3}});
