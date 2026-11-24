/** Isolated UI review, never registered in navigation or live raid routes. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Image,ImageBackground,Pressable,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {dungeonCombatPortraitSource} from '../theme/dungeon-combat-art';
import {accountEntitlementBenefits} from '../core/account-entitlements';
import type {GameState} from '../core/types';
import {CombatTheaterModal} from './CombatTheaterModal';
import {CombatImpactBurst} from './CombatImpactBurst';
import {weeklyRaidBattleSummary,weeklyRaidPresentationFrame,weeklyRaidPlaybackSpeed,weeklyRaidPendingState,weeklyRaidOpenCursor,weeklyRaidVisualEffects,type WeeklyRaidSettledReceipt} from '../core/weekly-guild-raid-replay-review';
const number=(n:number)=>Math.round(n).toLocaleString();
const time=(ms:number)=>Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0');
export function WeeklyGuildRaidTheaterReview(props:{visible:boolean;onClose:()=>void;receipt:WeeklyRaidSettledReceipt;
 stageArt:ImageSourcePropType;bossArt:ImageSourcePropType;companionArt?:ImageSourcePropType;
 state?:GameState;reduceMotion:boolean;onRefresh?:()=>unknown;serverClockOffsetMs?:number}){
 const {receipt,visible,reduceMotion}=props,C=useGameTheme(),source=receipt.replay;
 const [clock,setClock]=useState({elapsed:weeklyRaidOpenCursor(receipt),previous:null as number|null});
 const [wallNow,setWallNow]=useState(Date.now());
 const vipPlus=props.state?accountEntitlementBenefits(props.state).vipPlus:false;
 const refresh=useRef(props.onRefresh);refresh.current=props.onRefresh;
 const pending=weeklyRaidPendingState(receipt,wallNow+(props.serverClockOffsetMs??0));
 const heroArt=dungeonCombatPortraitSource(receipt.identity?.classId??source?.classId);
 const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState<1|2>(1),[active,setActive]=useState(AppState.currentState==='active');
 const receiptKey=receipt.nonce+':'+(source?'settled':'pending');
 const identity=useRef(receiptKey);
 useEffect(()=>{identity.current=receiptKey;setClock({elapsed:weeklyRaidOpenCursor(receipt),previous:null});setPlaying(false)},[receiptKey]);
 const effectiveSpeed=weeklyRaidPlaybackSpeed(vipPlus,speed);
 useEffect(()=>{if(!vipPlus)setSpeed(1)},[vipPlus]);
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>{setActive(s==='active');if(s!=='active')setPlaying(false)});return()=>sub.remove()},[]);
 useEffect(()=>{if(!visible){setPlaying(false);return}if(active){setWallNow(Date.now());if(!source)void refresh.current?.()}},[visible,active,receipt.nonce,Boolean(source)]);
 useEffect(()=>{if(!visible||!active||source)return;const timer=setInterval(()=>setWallNow(Date.now()),1000);return()=>clearInterval(timer)},[visible,active,Boolean(source)]);
 useEffect(()=>{if(!visible||!active||pending.status!=='resolving')return;void refresh.current?.();const timer=setInterval(()=>{void refresh.current?.()},12000);return()=>clearInterval(timer)},[visible,active,pending.status,receipt.nonce]);
 const duration=source?.durationMs??0;
 useEffect(()=>{
  if(!playing||!visible||!active||!source||clock.elapsed>=duration)return;
  const timer=setInterval(()=>setClock(c=>({elapsed:Math.min(duration,c.elapsed+250*effectiveSpeed),previous:c.elapsed})),250);
  return()=>clearInterval(timer);
 },[playing,visible,active,source,duration,effectiveSpeed,clock.elapsed>=duration]);
 const frame=useMemo(()=>source&&identity.current===receiptKey?weeklyRaidPresentationFrame(source,clock.elapsed,clock.previous,reduceMotion):null,[source,receiptKey,clock,reduceMotion]);
 const summary=useMemo(()=>weeklyRaidBattleSummary(receipt),[receipt]);
 const seek=(elapsed:number)=>{setPlaying(false);setClock({elapsed:Math.min(duration,Math.max(0,elapsed)),previous:null})};
 const cue=frame?.cue;
 const effects=useMemo(()=>source&&frame?weeklyRaidVisualEffects(frame.effects,source.presentation.hero.id,source.presentation.boss.id):[],[source,frame]);
 const showEffects=visible&&active&&playing&&!reduceMotion;
 const impactNode=(target:'hero'|'boss')=>{
  if(!showEffects)return null;
  const effect=effects.find(e=>e.anchor===target);
  if(!effect)return null;
  const eventId=receipt.nonce+':'+effect.key;
  if(effect.kind==='cleanse'||effect.kind==='miss')return <View pointerEvents="none" accessible={false} style={[s.effectLabel,{backgroundColor:C.panel,borderColor:C.line}]}><Text style={[s.small,{color:effect.kind==='cleanse'?C.good:C.muted,fontWeight:'800'}]}>{effect.kind==='cleanse'?'Cleansed':'Miss'}</Text></View>;
  return <CombatImpactBurst key={eventId} eventId={eventId} kind={effect.kind} size={target==='hero'?38:58}/>;
 };
 const bar=(name:string,hp:number,max:number,color:string,approx:boolean)=><View style={s.barBlock}>
  <View style={s.row}><Text style={[s.label,{color:C.text}]}>{name}</Text><Text style={[s.small,{color:C.muted}]}>{approx?'~':''}{number(hp)} / {number(max)}</Text></View>
  <View accessibilityRole="progressbar" accessibilityLabel={name} accessibilityValue={{min:0,max:100,now:Math.round(hp/max*100)}} style={[s.track,{backgroundColor:C.panel2}]}><View style={{width:`${hp/max*100}%` as `${number}%`,height:'100%',backgroundColor:color}}/></View>
 </View>;
 const button=(label:string,fn:()=>void,disabled=false)=><Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={fn} style={[s.button,{backgroundColor:C.panel2,borderColor:C.line,opacity:disabled?.45:1}]}><Text style={[s.label,{color:C.text}]}>{label}</Text></Pressable>;
 return <CombatTheaterModal visible={visible} onClose={props.onClose} title={source?.presentation.boss.name??receipt.identity?.bossName??'Weekly Guild Boss'} eyebrow="REVIEW ONLY · WEEKLY RAID" subtitle={source?'Settled personal battle replay':'Awaiting authoritative settlement'} tone="guild" compactHeader reduceMotion={reduceMotion}>
  {!source||!frame?<View style={[s.panel,{backgroundColor:C.panel,borderColor:C.line}]}><ImageBackground source={props.stageArt} style={s.arena} imageStyle={{opacity:.64}} resizeMode="cover"><View style={s.shade}/><View style={s.bossSide}><Image source={props.bossArt} style={s.boss} resizeMode="contain" accessible={false}/></View></ImageBackground><Text style={[s.label,{color:C.text,textAlign:"center"}]}>{pending.status==='resolving'?'Resolving attempt…':pending.remainingMs===null?'Attempt in progress':time(pending.remainingMs)+' remaining'}</Text><Text style={[s.small,{color:C.muted}]}>You can leave. The server continues this attempt; reopen to check progress or view the result.</Text>{button('Leave battle',props.onClose)}</View>:<>
   <View style={s.row}><Text style={[s.label,{color:C.muted}]}>PERSONAL BATTLE · REPLAY</Text><Text style={[s.label,{color:C.warning}]}>{time(frame.elapsedMs)} / {time(duration)}</Text></View>
   {bar('Boss · personal battle HP',frame.bossHp,source.presentation.boss.maxHp,C.bad,frame.approximateHp)}
   <ImageBackground source={props.stageArt} style={s.arena} imageStyle={{opacity:.64}} resizeMode="cover">
    <View style={s.shade}/>
    <View style={s.bossSide}><Image source={props.bossArt} style={s.boss} resizeMode="contain" accessible={false}/>{impactNode('boss')}</View>
   </ImageBackground>
   <View style={s.bossStatus}>
    {frame.cast?<Text numberOfLines={1} style={[s.cast,{color:C.warning,backgroundColor:C.panel}]}>{frame.cast.name} · casting</Text>:null}
    {frame.phase?<Text numberOfLines={1} style={[s.phase,{color:C.warning}]}>{frame.phase}</Text>:null}
   </View>
   <View style={[s.heroSide,{backgroundColor:C.panel,borderColor:C.line}]}><View style={s.heroPortrait}>{heroArt?<Image source={heroArt} style={s.hero} resizeMode="contain" accessible={false}/>:null}{impactNode('hero')}</View><View style={{flex:1,minWidth:0,gap:4}}>{bar(source.presentation.hero.name,frame.heroHp,source.presentation.hero.maxHp,C.good,frame.approximateHp)}<Text numberOfLines={1} style={[s.small,{color:cue?.source==='Companion'?C.special:C.muted}]}>{frame.log.find(e=>e.source!=='Boss')?.label??'Ready'}</Text></View>{props.companionArt?<Image source={props.companionArt} style={s.companion} resizeMode="contain" accessible={false}/>:null}</View>
   <Text style={[s.small,{color:C.muted}]}>Replay HP is approximate until the exact final server snapshot. Shared guild HP is separate.</Text>
   <View style={s.controls}>{button('−15s',()=>seek(clock.elapsed-15000))}{button(frame.state==='complete'?'Replay':playing?'Pause':'Play',()=>{if(frame.state==='complete')setClock({elapsed:0,previous:null});setPlaying(frame.state==='complete'||!playing)})}{vipPlus?button(effectiveSpeed+'×',()=>setSpeed(v=>v===1?2:1)):null}{button('+15s',()=>seek(clock.elapsed+15000))}{button('Summary',()=>seek(duration))}{button('Leave',props.onClose)}</View>
   <View style={[s.panel,{backgroundColor:C.panel,borderColor:C.line}]}>
    <Text style={[s.label,{color:C.text}]}>Combat log</Text>
    {frame.log.length===0?<Text style={[s.small,{color:C.muted}]}>No combat events yet</Text>:frame.log.map((e,i)=><View key={e.atMs+':'+i} style={s.row}><Text style={[s.small,{color:C.muted}]}>{time(e.atMs)}</Text><Text numberOfLines={2} style={[s.small,{color:e.source==='Companion'?C.special:C.text,flex:1}]}>{e.source} · {e.label}</Text><Text style={[s.label,{color:C.text}]}>{e.amount===undefined?'':number(e.amount)}</Text></View>)}
   </View>
   {frame.state==='complete'&&summary?<View style={[s.panel,{backgroundColor:C.panel,borderColor:C.line}]}>
    <Text style={[s.label,{color:C.warning}]}>BATTLE SUMMARY · {summary.outcome==='wipe'?'Defeated':summary.outcome==='victory'?'Personal battle cleared':'Time limit'}</Text>
    <Text style={[s.total,{color:C.text}]}>{summary.sharedHpCredit===null?'—':number(summary.sharedHpCredit)}</Text><Text style={[s.small,{color:C.muted}]}>Shared boss HP credited</Text>
    {([['Personal battle HP damage',summary.localBossHpDamage],['Effective healing',summary.effectiveHealing],['Shield absorbed',summary.shieldAbsorbed],['Interrupts',summary.interrupts],['Cleanses',summary.cleanses],['Companion direct damage',summary.companionDirectDamage],['Companion healing',summary.companionEffectiveHealing],['Companion shield granted',summary.companionShieldGranted],['Review performance score',summary.performanceScore]] as [string,number|null][]).map(([label,value])=><View key={label} style={[s.row,s.metric,{borderColor:C.line}]}><Text style={[s.small,{color:C.muted,flex:1}]}>{label}</Text><Text style={[s.label,{color:C.text}]}>{value===null?'—':number(value)}</Text></View>)}
    <Text style={[s.small,{color:C.muted}]}>Review only · no reward or claim.</Text>
   </View>:null}
  </>}
 </CombatTheaterModal>;
}
const s=StyleSheet.create({
 row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 barBlock:{gap:5},track:{height:10,borderRadius:5,overflow:'hidden'},label:{fontSize:12,fontWeight:'800'},small:{fontSize:11,lineHeight:16},
 arena:{height:208,borderRadius:14,overflow:'hidden',justifyContent:'center',alignItems:'center',padding:8},
 shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,8,13,.35)'},bossSide:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},boss:{width:'82%',maxWidth:216,height:'100%'},bossStatus:{minHeight:42,justifyContent:'center',alignItems:'center',gap:2},heroPortrait:{width:48,height:48,alignItems:'center',justifyContent:'center'},effectLabel:{position:'absolute',zIndex:7,top:0,alignSelf:'center',borderWidth:1,borderRadius:5,paddingHorizontal:5,paddingVertical:2},cast:{paddingHorizontal:7,paddingVertical:3,borderRadius:4,fontSize:11,fontWeight:'800'},phase:{fontSize:11,fontWeight:'800'},
 heroSide:{flexDirection:'row',alignItems:'center',alignSelf:'stretch',borderWidth:1,borderRadius:10,padding:6,gap:8},hero:{width:48,height:48},companion:{width:26,height:26},
 controls:{flexDirection:'row',flexWrap:'wrap',gap:6},button:{borderWidth:1,borderRadius:8,paddingHorizontal:10,minHeight:44,justifyContent:'center'},
 panel:{borderWidth:1,borderRadius:12,padding:12,gap:8},metric:{paddingTop:6,borderTopWidth:1},total:{fontSize:26,fontWeight:'900'},
});
