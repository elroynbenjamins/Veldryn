import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Animated,Easing,Image,ImageBackground,Pressable,StyleSheet,Text,View,useWindowDimensions,type ImageSourcePropType} from 'react-native';
import {useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameTheme} from '../theme/ThemeContext';
import {classIconArtwork} from '../theme/character-assets';
import {companionArtSource} from '../theme/companion-art';
import {GameButton} from './GameButton';
import {CombatTheaterModal} from './CombatTheaterModal';
import {UiIcon} from './UiIcon';
import {guildPveActivitySummary,guildPvePresentation,guildPveView,type GuildPveEncounter} from '../core/guild-pve-encounters';
import {formatGameNumber} from '../core/number-format';
import {combatCompanionDef} from '../content/combat-companions';
import type {EventReward} from '../content/live-events';
import type {GameState} from '../core/types';

const bossArt:Record<ReturnType<typeof guildPvePresentation>['visualKey'],ImageSourcePropType>={
 treant:require('../../assets/monsters/ancient_treant.webp'),fallen_knight:require('../../assets/monsters/fallen_knight.webp'),forest_troll:require('../../assets/monsters/forest_troll.webp'),veilbreak:require('../../assets/monsters/oathglass_revenant.webp'),harvestwake:require('../../assets/events/harvestwake/guardian-master-v2.webp'),merchant_guild:require('../../assets/monsters/oathbound_squire.webp'),default_event:require('../../assets/monsters/oathglass_revenant.webp'),
};
const forestStage=require('../../assets/card-backgrounds/forest_sanctum_wide_v2.webp');
const ruinsStage=require('../../assets/card-backgrounds/veilbreak_wide_v2.webp');
const harvestStage=require('../../assets/card-backgrounds/harvestwake_wide_v2.webp');
const caravanStage=require('../../assets/card-backgrounds/guild_plaza_wide_v2.webp');

export function GuildPveEncounterCard({row,state,guildRewards=[],numberMode='abbreviated',busy=false,onClaim,onAttempt,onCombat,onRefresh}:{row:GuildPveEncounter;state?:GameState;guildRewards?:EventReward[];numberMode?:'abbreviated'|'exact';busy?:boolean;onClaim:(percent:number)=>unknown;onAttempt?:()=>unknown;onCombat?:()=>unknown;onRefresh?:()=>unknown}){
 const st=useSocialText(),language=useGameLanguage(),C=useGameTheme(),{width,fontScale}=useWindowDimensions();
 const [now,setNow]=useState(Date.now()),[summaryOpen,setSummaryOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false),[startedAttemptCount,setStartedAttemptCount]=useState<number|null>(null);
 const bossPulse=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  bossPulse.stopAnimation();bossPulse.setValue(0);
  if(!summaryOpen||state?.settings.reduceMotion)return;
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(bossPulse,{toValue:1,duration:1050,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(bossPulse,{toValue:0,duration:1050,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));
  animation.start();return()=>{animation.stop();bossPulse.stopAnimation();};
 },[summaryOpen,bossPulse,state?.settings.reduceMotion]);
 // Only a live attempt needs second-by-second paint; server polling remains with the board.
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),row.pendingAttempts?1000:30000);return()=>clearInterval(timer)},[row.pendingAttempts,row.nextAttemptResolvesAt,row.damage,row.endsAt]);
 const view=guildPveView(row,now),presentation=guildPvePresentation(row),accent=row.kind==='event'?C.special:C.accent;
 const stage=presentation.visualKey==='treant'||presentation.visualKey==='forest_troll'?forestStage:presentation.visualKey==='harvestwake'?harvestStage:presentation.visualKey==='merchant_guild'?caravanStage:ruinsStage;
 const compact=width<360||fontScale>=1.3,n=(value:number)=>formatGameNumber(value,numberMode,language);
 const endDate=new Date(view.open?row.endsAt:row.claimEndsAt).toLocaleDateString(language,{day:'numeric',month:'short'});
 const companionId=state?.character?.equippedCombatCompanionId,companion=companionId?combatCompanionDef(companionId):undefined,companionArt=companionId?companionArtSource(companionId):undefined;
 const lastCompanion=row.lastAttemptCompanionId?combatCompanionDef(row.lastAttemptCompanionId)?.name??row.lastAttemptCompanionId:st('No companion equipped');
 const remainingSeconds=row.nextAttemptResolvesAt?Math.max(0,Math.ceil((Date.parse(row.nextAttemptResolvesAt)-now)/1000)):0;
 const countdown=`${Math.floor(remainingSeconds/60)}:${String(remainingSeconds%60).padStart(2,'0')}`;
 const pending=view.pendingAttempts>0,locked=view.guildLevel<view.requiredGuildLevel;
 const beginAttempt=()=>{setStartedAttemptCount(row.attemptsUsed??0);setSummaryOpen(true);onAttempt?.();};
 const openSummary=()=>{setStartedAttemptCount(null);setSummaryOpen(true);};
 const resultReady=!pending&&!busy&&row.lastAttemptDamage!=null&&(startedAttemptCount===null||(row.attemptsUsed??0)>startedAttemptCount);
 const actionLabel=busy?st('Please wait…'):pending?(remainingSeconds>0?st('Raid in progress · {time}',{time:countdown}):st('Resolving attempt…')):locked?st('Requires Guild Level {level}',{level:view.requiredGuildLevel}):!row.eligible?st('Next encounter'):!view.open?st(view.status):view.attemptsRemaining===0&&view.attemptCap>0?st('No attempts remaining'):st('Begin 3-minute attempt');
 return <View style={[s.encounter,{backgroundColor:C.panel,borderColor:C.line}]}>
  <ImageBackground source={stage} resizeMode="cover" style={s.hero} imageStyle={s.backdrop}>
   <View style={s.heroShade}/><View style={s.heroTop}><Text style={[s.kicker,{color:'#e7dfce'}]}>{st(row.kind==='event'?'EVENT BOSS':'WEEKLY BOSS')}</Text><View style={s.duration}><Text style={s.durationText}>{st('3-minute attempt')}</Text></View></View>
   <Image accessible={false} source={bossArt[presentation.visualKey]} resizeMode="contain" style={s.bossArt}/>
   <View style={s.heroCopy}><Text style={s.bossTitle}>{presentation.bossTitle}</Text><Text accessibilityRole="header" style={s.bossName}>{presentation.bossName}</Text></View>
  </ImageBackground>
  <View style={s.body}>
   <View style={s.row}><Text style={[s.kicker,{color:accent}]}>{st(view.status)}</Text><Text style={[s.meta,{color:C.muted}]}>{st(view.open?'Ends {date}':'Claim by {date}',{date:endDate})}</Text></View>
   <View accessibilityRole="progressbar" accessibilityLabel={st('Boss health')} accessibilityValue={{min:0,max:100,now:Math.round(100-view.percent),text:`${n(view.remaining)} / ${n(row.maxHp)} HP`}} style={[s.track,{backgroundColor:C.panel2}]}><View style={{height:'100%',width:`${100-view.percent}%`,backgroundColor:accent}}/></View>
   <View style={[s.row,compact&&s.stack]}><Text style={[s.meta,{color:C.text}]}>{n(view.remaining)} / {n(row.maxHp)} HP</Text><Text style={[s.meta,{color:C.muted}]}>{st('{count} contributors',{count:n(row.contributors)})} · {st('Guild damage: {percent}%',{percent:Math.round(view.percent)})}</Text></View>
   <View style={[s.personal,{borderColor:C.line}]}><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>{st('Your contribution')}</Text><Text style={[s.value,{color:C.text}]}>{n(row.personalDamage)} <Text style={s.unit}>{st('Damage')}</Text></Text></View><View style={s.attempts}><Text style={[s.meta,{color:C.muted}]}>{st('Attempts remaining')}</Text><Text style={[s.value,{color:accent}]}>{view.attemptsRemaining} <Text style={[s.unit,{color:C.muted}]}>/ {view.attemptCap}</Text></Text></View></View>
   <Text style={[s.sectionTitle,{color:C.text}]}>{st('Your battle party')}</Text>
   <View style={s.party}><View style={[s.portrait,{backgroundColor:C.panel2,borderColor:C.line}]}>{state?.character?<Image accessible={false} source={classIconArtwork[state.character.classId]} style={s.portraitArt}/>:<UiIcon name="character" size={34}/>}</View><View style={[s.portrait,{backgroundColor:C.panel2,borderColor:C.line}]}>{companionArt?<Image accessible={false} source={companionArt} resizeMode="contain" style={s.portraitArt}/>:<UiIcon name="companions" size={30} muted/>}</View><View style={s.flex}><Text style={[s.partyName,{color:C.text}]}>{state?.character?.name??st('Your character')}</Text><Text style={[s.meta,{color:C.muted}]}>{companion?.name??st('No companion equipped')}</Text></View></View>
   {pending?<View style={[s.pending,{backgroundColor:C.panel2}]}><ActivityIndicator size="small" color={accent}/><Text accessibilityLiveRegion="polite" style={[s.detail,s.flex,{color:C.text}]}>{remainingSeconds>0?st('Raid in progress · {time}',{time:countdown}):st('Resolving attempt…')}</Text><GameButton compact tone="secondary" title={st('Watch')} onPress={openSummary}/></View>:null}
   <GameButton title={actionLabel} loading={busy} disabled={busy||!view.canContribute||!onAttempt} onPress={beginAttempt}/>
   {!onAttempt&&view.canContribute&&onCombat?<GameButton tone="secondary" title={st('Go hunting')} onPress={onCombat}/>:null}
   <Text style={[s.hint,{color:C.muted}]}>{st('Your damage and companion damage count toward guild progress.')}</Text>
   {!row.eligible?<Text style={[s.detail,{color:C.warning}]}>{st('This encounter has a fixed roster. New members join the next encounter.')}</Text>:row.damage>=row.maxHp&&view.open&&row.personalDamage<1000?<Text style={[s.detail,{color:accent}]}>{st('Boss defeated! You can still contribute before the battle deadline to qualify for rewards.')}</Text>:null}
   {row.lastAttemptDamage!=null?<Pressable accessibilityRole="button" accessibilityLabel={st('View attempt summary')} onPress={openSummary} style={({pressed})=>[s.lastAttempt,{backgroundColor:C.panel2},pressed&&s.pressed]}><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>{st('Last attempt')}</Text><Text style={[s.partyName,{color:C.text}]}>{n(row.lastAttemptDamage)} {st('Damage')}</Text></View><Text style={[s.meta,{color:accent}]}>{st('Summary')} ›</Text></Pressable>:null}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(!detailsOpen)} style={[s.disclosure,{borderColor:C.line}]}><Text style={[s.sectionTitle,{color:C.text}]}>{st('Encounter details')}</Text><Text style={{color:C.muted,fontSize:20}}>{detailsOpen?'−':'+'}</Text></Pressable>
   {detailsOpen?<View style={s.details}><Text style={[s.detail,{color:C.muted}]}>{presentation.summary}</Text>{presentation.mechanicName?<View style={[s.mechanic,{backgroundColor:C.panel2,borderColor:accent}]}><Text style={[s.partyName,{color:C.text}]}>{presentation.mechanicName}</Text><Text style={[s.detail,{color:C.muted}]}>{presentation.mechanicSummary}</Text></View>:null}<Text style={[s.detail,{color:C.muted}]}>{guildPveActivitySummary(row.kind)}</Text><Text style={[s.meta,{color:C.muted}]}>{st('Difficulty: {count}-member bracket',{count:row.rosterSize})}</Text></View>:null}
   <Text style={[s.kicker,{color:accent}]}>{st('MILESTONE REWARDS')}</Text>
   {view.milestones.map(m=><View key={m.percent} style={[s.reward,compact&&s.stack,{borderColor:C.line}]}><View style={[s.medal,{backgroundColor:C.panel2}]}><Text style={[s.partyName,{color:m.claimed?C.muted:accent}]}>{m.claimed?'✓':`${m.percent}%`}</Text></View><View style={s.flex}><Text style={[s.partyName,{color:C.text}]}>{n(m.gold)} {st('Gold')}</Text>{m.eventCurrency>0?<Text style={[s.meta,{color:C.special}]}>{n(m.eventCurrency)} {st('Event currency')} · {m.candy} {st(m.candyKind)} {st('Candy')}</Text>:null}<Text style={[s.meta,{color:C.muted}]}>{m.claimed?st('Claimed'):view.percent<m.percent?st('Guild progress needed'):row.personalDamage<1000?st('Contribution needed'):!m.ready?st(view.status):st('Reward unlocked')}</Text></View><GameButton compact title={m.claimed?st('Claimed'):st('Claim')} loading={busy&&m.ready} disabled={busy||!m.ready} onPress={()=>onClaim(m.percent)}/></View>)}
   {guildRewards.length?<View style={[s.mechanic,{backgroundColor:C.panel2,borderColor:C.special}]}><Text style={[s.kicker,{color:C.special}]}>{st('Guild event cosmetics')}</Text>{guildRewards.map(reward=><Text key={reward.id} style={[s.partyName,{color:C.text}]}>{reward.name}</Text>)}</View>:null}
  </View>
   {summaryOpen?<CombatTheaterModal visible onClose={()=>setSummaryOpen(false)} title={presentation.bossName} eyebrow={st(row.kind==='event'?'EVENT BOSS':'GUILD RAID')} subtitle={st('Three-minute server-authoritative raid')} reduceMotion={state?.settings.reduceMotion}>
    <ImageBackground source={stage} resizeMode="cover" style={s.theaterScene} imageStyle={s.theaterSceneImage}>
     <View style={s.theaterShade}/>
     <Animated.Image accessible={false} source={bossArt[presentation.visualKey]} resizeMode="contain" style={[s.theaterBoss,{transform:[{scale:bossPulse.interpolate({inputRange:[0,1],outputRange:[1,1.045]})}]}]}/>
     <Text style={s.theaterBossName}>{presentation.bossName}</Text>
    </ImageBackground>
    <View style={[s.theaterParty,{borderColor:C.line,backgroundColor:C.panel}]}>
     <View style={[s.portrait,{borderColor:C.line,backgroundColor:C.panel2}]}>{state?.character?<Image source={classIconArtwork[state.character.classId]} style={s.portraitArt}/>:<UiIcon name="character" size={34}/>}</View>
     <View style={[s.portrait,{borderColor:C.line,backgroundColor:C.panel2}]}>{companionArt?<Image source={companionArt} resizeMode="contain" style={s.portraitArt}/>:<UiIcon name="companions" size={30} muted/>}</View>
     <View style={s.flex}><Text style={[s.partyName,{color:C.text}]}>{state?.character?.name??st('Your character')}</Text><Text style={[s.detail,{color:C.muted}]}>{companion?.name??st('No companion equipped')}</Text></View>
    </View>
    {pending||busy?<View style={[s.theaterStatus,{backgroundColor:C.panel,borderColor:C.line}]}>
     <ActivityIndicator color={accent} size="large"/>
     <Text accessibilityLiveRegion="polite" style={[s.summaryTotal,{color:C.text}]}>{pending&&remainingSeconds>0?countdown:st('Resolving attempt…')}</Text>
     <Text style={[s.detail,{color:C.muted,textAlign:'center'}]}>{st('Your guild raid is running on the server. Damage will appear after the attempt resolves.')}</Text>
     {onRefresh?<GameButton title={st('Refresh raid status')} tone="secondary" onPress={()=>onRefresh()}/>:null}
    </View>:resultReady?<View style={[s.theaterStatus,{backgroundColor:C.panel,borderColor:C.line}]}>
     <Text accessibilityLiveRegion="polite" style={[s.summaryTotal,{color:accent}]}>{n(row.lastAttemptDamage??0)} {st('Damage')}</Text>
     <View style={[s.summaryRow,{borderColor:C.line}]}><Text style={[s.detail,{color:C.muted}]}>{st('Character damage')}</Text><Text style={[s.partyName,{color:C.text}]}>{n(row.lastAttemptCharacterDamage??row.lastAttemptDamage??0)}</Text></View>
     <View style={[s.summaryRow,{borderColor:C.line}]}><View style={s.flex}><Text style={[s.detail,{color:C.muted}]}>{st('Companion damage')}</Text><Text style={[s.partyName,{color:C.text}]}>{lastCompanion}</Text></View><Text style={[s.partyName,{color:C.text}]}>{n(row.lastAttemptCompanionDamage??0)}</Text></View>
    </View>:<View style={[s.theaterStatus,{backgroundColor:C.panel,borderColor:C.line}]}>
     <Text style={[s.detail,{color:C.text}]}>{st('No newly resolved raid result is available yet.')}</Text>
     {onRefresh?<GameButton title={st('Refresh raid status')} tone="secondary" onPress={()=>onRefresh()}/>:null}
    </View>}
   </CombatTheaterModal>:null}
 </View>;
}
const s=StyleSheet.create({
 theaterScene:{height:320,overflow:'hidden',alignItems:'center',justifyContent:'center',borderRadius:16},theaterSceneImage:{opacity:.8,borderRadius:16},theaterShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,8,13,.45)'},theaterBoss:{width:244,height:244},theaterBossName:{color:'#fff5dc',fontSize:19,lineHeight:26,fontWeight:'900',textAlign:'center',backgroundColor:'rgba(5,8,13,.75)',paddingHorizontal:12,paddingVertical:7},theaterParty:{padding:12,borderWidth:1,borderRadius:14,flexDirection:'row',alignItems:'center',gap:10},theaterStatus:{borderWidth:1,borderRadius:14,padding:16,gap:14},
 encounter:{borderWidth:1,borderRadius:18,overflow:'hidden'},hero:{minHeight:240,justifyContent:'space-between',overflow:'hidden'},backdrop:{opacity:.7,width:'100%',height:'100%'},heroShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,8,13,.45)'},heroTop:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8,padding:14},duration:{backgroundColor:'rgba(5,8,13,.8)',borderRadius:20,paddingHorizontal:10,paddingVertical:5},durationText:{fontSize:11,lineHeight:16,color:'#eee9df',fontWeight:'700'},bossArt:{position:'absolute',width:174,height:174,alignSelf:'center',top:28},heroCopy:{backgroundColor:'rgba(5,8,13,.76)',paddingHorizontal:16,paddingVertical:12,marginTop:135},bossTitle:{color:'#d0c5d8',fontSize:12,lineHeight:18},bossName:{color:'#faf5ec',fontSize:25,lineHeight:30,fontWeight:'800'},body:{padding:16,gap:12},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6},stack:{flexDirection:'column',alignItems:'stretch'},kicker:{fontSize:11,lineHeight:16,fontWeight:'800',letterSpacing:1.1},meta:{fontSize:12,lineHeight:18},detail:{fontSize:13,lineHeight:20},track:{height:7,borderRadius:5,overflow:'hidden'},personal:{flexDirection:'row',flexWrap:'wrap',gap:12,borderBottomWidth:1,paddingBottom:14},flex:{flex:1,minWidth:0},attempts:{minWidth:110},value:{fontSize:23,lineHeight:30,fontWeight:'800',marginTop:3},unit:{fontSize:12,fontWeight:'500'},sectionTitle:{fontSize:15,lineHeight:21,fontWeight:'700'},party:{flexDirection:'row',alignItems:'center',gap:9},portrait:{width:46,height:46,borderWidth:1,borderRadius:12,alignItems:'center',justifyContent:'center'},portraitArt:{width:40,height:40},partyName:{fontSize:14,lineHeight:20,fontWeight:'700'},pending:{flexDirection:'row',alignItems:'center',padding:10,gap:10,borderRadius:10},hint:{fontSize:12,lineHeight:18,textAlign:'center'},lastAttempt:{minHeight:60,padding:12,borderRadius:12,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},pressed:{opacity:.7},disclosure:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,borderTopWidth:1,minHeight:48,paddingTop:6},details:{gap:10},mechanic:{gap:5,borderLeftWidth:3,padding:10,borderRadius:6},reward:{flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,paddingVertical:12},medal:{minWidth:45,minHeight:45,borderRadius:12,alignItems:'center',justifyContent:'center',padding:5},summary:{gap:14,paddingTop:8},summaryTotal:{fontSize:28,fontWeight:'800',textAlign:'center'},summaryRow:{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'space-between',alignItems:'center',borderTopWidth:1,paddingTop:12},
});
