import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,ImageBackground,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {BoardTabs} from './BoardTabs';
import {GameThemeScope,useGameTheme} from '../theme/ThemeContext';
import {eventTheme} from '../theme/event-palette';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {FROSTFALL_EVENT} from '../content/annual-events-v2';
import {getWinterHearthGuildSnapshot,type WinterHearthGuildSnapshot} from '../online/winter-hearth-guild';
import {useGameplayText} from '../i18n/gameplay';
import {useGameLanguage} from '../i18n/GameLanguageProvider';

type Page='Market'|'Rewards';
const stages=[
 {percent:25,gold:10000,name:'Market foundations',buff:'+4% Gathering Speed',cosmetics:[]},
 {percent:50,gold:20000,name:'Festive stalls',buff:'+6% Skill XP',cosmetics:["Winter's Aurora · Background"]},
 {percent:75,gold:30000,name:'Festival of Lights',buff:'+6% Combat XP',cosmetics:['Frostfall Standard · Banner']},
 {percent:100,gold:50000,name:'Grand Winter Market',buff:'All three bonuses +10%',cosmetics:['Frozen Majesty · Border','Frostfall Aurora · Name Color']},
] as const;
const stageTitle=(p:number)=>stages.find(row=>row.percent===p)?.name??'Snow-covered grounds';
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
type Props={onClose:()=>void;onOpenCrafting?:(skill:'smithing'|'tailoring')=>void;scope:string};

/** Seasonal scope only: never changes account theme or Guild Home. */
export function WinterHearthGuildScreen(props:Props){
 const base=useGameTheme(),colors=useMemo(()=>eventTheme(base,FROSTFALL_EVENT),[base]);
 return <GameThemeScope colors={colors}><WinterHearthContent {...props}/></GameThemeScope>;
}
function WinterHearthContent({onClose,onOpenCrafting,scope}:Props){
 const C=useGameTheme(),{gl}=useGameplayText(),language=useGameLanguage();
 const [page,setPage]=useState<Page>('Market'),[snapshot,setSnapshot]=useState<WinterHearthGuildSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[craftOpen,setCraftOpen]=useState(false),[expanded,setExpanded]=useState<number|null>(null);
 const generation=useRef(0);
 const reload=useCallback(async()=>{
  const key=++generation.current;setLoading(true);setError('');setSnapshot(null);
  try{const next=await getWinterHearthGuildSnapshot();if(generation.current===key)setSnapshot(next);}
  catch{if(generation.current===key)setError('Unable to refresh guild event progress.');}
  finally{if(generation.current===key)setLoading(false);}
 },[]);
 useEffect(()=>{void reload();return()=>{generation.current++;};},[reload,scope]);
 const fmt=(n:number)=>n.toLocaleString(language);
 const stage=snapshot?.milestonePercent??0,logs=snapshot?.logs??0,lights=snapshot?.lights??0;
 const progress=clamp(Math.floor(Math.min(logs/25000,lights/2500)*100));
 const next=stages.find(row=>row.percent>stage);
 const titleStyle={color:C.text,fontWeight:'800' as const,fontSize:15};
 const smallStyle={color:C.muted,fontSize:12,lineHeight:17};
 const renderTrack=(label:string,n:number,total:number,fill:string)=> <View style={s.trackWrap}><View style={s.row}><Text style={titleStyle}>{gl(label)}</Text><Text style={[smallStyle,{color:C.text,fontVariant:['tabular-nums']}]}>{fmt(n)} / {fmt(total)}</Text></View><View accessibilityRole="progressbar" accessibilityLabel={gl(label)} accessibilityValue={{min:0,max:total,now:n}} style={[s.track,{backgroundColor:C.panel2,borderColor:C.line}]}><View style={[s.fill,{width:`${clamp(n/total*100)}%`,backgroundColor:fill}]}/></View></View>;
 return <View style={[s.screen,{backgroundColor:C.bg}]}>
  <View style={[s.header,{borderBottomColor:C.line,backgroundColor:C.panel}]}><GameButton compact tone="secondary" title={gl('← Guild Home')} onPress={onClose}/><Text style={[s.headerText,{color:C.accent}]}>{gl('Frostfall 2026')}</Text></View>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
   <ImageBackground source={liveEventVisuals('frostfall').heroBackground} resizeMode="cover" style={s.hero} imageStyle={s.heroImage}><View style={s.shade}/><View style={s.heroText}><Text style={s.kicker}>{gl('GUILD CHRISTMAS MARKET')}</Text><Text style={s.heroTitle}>{gl('Winter Hearth')}</Text><Text style={s.heroCopy}>{gl('Build a winter market together.')}</Text></View></ImageBackground>
   {loading?<Panel><ActivityIndicator color={C.accent}/><Text style={smallStyle}>{gl('Loading guild progress…')}</Text></Panel>:error?<Panel><Text style={smallStyle}>{gl(error)}</Text><GameButton compact title={gl('Retry')} onPress={reload}/></Panel>:!snapshot?.inGuild||!snapshot.enabled?<Panel><Text style={titleStyle}>{gl('Winter Hearth is not available.')}</Text><GameButton tone="secondary" compact title={gl('Refresh')} onPress={reload}/></Panel>:<>
    <BoardTabs compact label={gl('Guild event sections')} items={[{id:'Market',label:gl('Market')},{id:'Rewards',label:gl('Rewards')}] as const} value={page} onChange={setPage}/>
    {page==='Market'?<>
     <Panel accentColor={C.lineStrong}><View style={s.row}><View style={s.flex}><Text style={smallStyle}>{gl('Market construction')}</Text><Text style={[titleStyle,{fontSize:19}]}>{gl(stageTitle(stage))}</Text></View><Text style={{fontSize:27,fontWeight:'900',color:C.accent,fontVariant:['tabular-nums']}}>{progress}%</Text></View>
     <View style={s.stageRow}>{[0,25,50,75,100].map(p=><View key={p} style={s.stageCell}><View style={[s.stageDot,{backgroundColor:p<=stage?C.accent:C.panel2,borderColor:p<=stage?C.accent:C.lineStrong}]}/><Text style={{fontSize:10,fontWeight:'700',color:p<=stage?C.accent:C.muted}}>{p}%</Text></View>)}</View>
     {renderTrack('Logs',logs,25000,C.accent)}{renderTrack('Christmas Lights',lights,2500,C.warning)}
     <Text style={smallStyle}>{next?gl('Both tracks must reach the next milestone.'):gl('Your guild completed the market!')}</Text></Panel>
     <Panel><Text style={titleStyle}>{gl('Your weekly contributions')}</Text>{renderTrack('Logs',snapshot.memberLogsThisWeek??0,2500,C.accent)}{renderTrack('Christmas Lights',snapshot.memberLightsThisWeek??0,250,C.warning)}
      <Text style={smallStyle}>{gl('Donations are shared across characters and reset Monday at 00:00 UTC.')}</Text>
      <Text style={smallStyle}>{gl(snapshot.active?'Donation controls are awaiting server integration review.':'The donation window is closed.')}</Text>
      <GameButton compact tone="secondary" title={gl(craftOpen?'Hide light recipes':'How to craft lights')} onPress={()=>setCraftOpen(v=>!v)}/>
      {craftOpen&&(['smithing','tailoring'] as const).map(skill=><View key={skill} style={[s.recipe,{borderColor:C.line,backgroundColor:C.panel2}]}><Text style={titleStyle}>{gl(skill==='smithing'?'Smithing · Level 4':'Tailoring · Level 4')}</Text><Text style={smallStyle}>{gl(skill==='smithing'?'8 Copper Ore':'8 Moss Fiber')} · {gl('4 Dewleaf')} · {gl('1 Wisp Dust')}</Text><Text style={{color:C.accent,fontSize:12,fontWeight:'700'}}>{gl('5 Christmas Lights · 35 base XP · 40s · 30 base Gold')}</Text>{onOpenCrafting&&snapshot.active?<GameButton compact tone="secondary" title={gl('Open crafting')} onPress={()=>onOpenCrafting(skill)}/>:null}</View>)}
     </Panel>
     <Panel><Text style={titleStyle}>{gl('Active guild bonuses')}</Text><View style={s.buffs}>{[[snapshot.gatheringSpeedBps??0,'Gathering Speed'],[snapshot.skillXpBps??0,'Skill XP'],[snapshot.combatXpBps??0,'Combat XP']].map(([bps,label])=><View key={String(label)} style={[s.buff,{backgroundColor:C.panel2,borderColor:C.line}]}><Text style={{fontSize:18,fontWeight:'900',color:Number(bps)>0?C.good:C.muted}}>+{Number(bps)/100}%</Text><Text style={[smallStyle,{textAlign:'center',fontSize:11}]}>{gl(String(label))}</Text></View>)}</View><Text style={smallStyle}>{gl('Temporary bonuses expire December 27 at 00:00 UTC.')}</Text></Panel>
    </>:null}
    <Panel><Text style={titleStyle}>{gl('Market milestones')}</Text>{stages.map(row=><Pressable key={row.percent} accessibilityRole="button" accessibilityState={{expanded:expanded===row.percent}} onPress={()=>setExpanded(p=>p===row.percent?null:row.percent)} style={[s.milestone,{borderColor:stage>=row.percent?C.accent:next?.percent===row.percent?C.warning:C.line,backgroundColor:C.panel2}]}><View style={s.row}><Text style={{fontSize:15,fontWeight:'900',color:stage>=row.percent?C.accent:C.text}}>{row.percent}%</Text><View style={s.flex}><Text style={titleStyle}>{gl(row.name)}</Text><Text style={smallStyle}>{fmt(row.gold)} {gl('Guild Gold')} · {gl(row.buff)}</Text></View><Text style={{color:C.muted}}>{expanded===row.percent?'−':'+'}</Text></View>{expanded===row.percent?<View style={s.detail}><Text style={smallStyle}>{fmt(row.percent*250)} {gl('Logs')} · {fmt(row.percent*25)} {gl('Christmas Lights')}</Text>{row.cosmetics.map(name=><Text key={name} style={{color:C.accent,fontSize:12,fontWeight:'700'}}>{gl(name)}</Text>)}<Text style={smallStyle}>{gl(stage>=row.percent?'Milestone reached':'Not yet reached')}</Text></View>:null}</Pressable>)}</Panel>
    <Panel><Text style={titleStyle}>{gl('Permanent guild cosmetics')}</Text><Text style={smallStyle}>{gl('Exclusive guild-owned rewards. Ownership and equipment are verified separately by the server.')}</Text>{stages.flatMap(row=>row.cosmetics.map(name=><View key={name} style={[s.reward,{borderColor:C.line}]}><Text style={[titleStyle,{flex:1,fontSize:13}]}>{gl(name)}</Text><Text style={{color:stage>=row.percent?C.accent:C.muted,fontSize:12,fontWeight:'700'}}>{row.percent}%</Text></View>))}</Panel>
    <GameButton compact tone="secondary" title={gl('Refresh progress')} onPress={reload}/>
   </>}
  </ScrollView>
 </View>;
}
const s=StyleSheet.create({screen:{flex:1,minHeight:0},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:8,borderBottomWidth:1,gap:8},headerText:{fontSize:13,fontWeight:'800',flexShrink:1},content:{padding:12,gap:10,paddingBottom:30},hero:{minHeight:150,borderRadius:10,overflow:'hidden',justifyContent:'flex-end'},heroImage:{opacity:.9},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(8,23,43,.48)'},heroText:{padding:12,gap:3},kicker:{color:'#b9e9fa',fontSize:10,fontWeight:'800',letterSpacing:1.3},heroTitle:{fontSize:27,fontWeight:'900',color:'#f4fbff'},heroCopy:{fontSize:12,color:'#e2effa'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9},flex:{flex:1,minWidth:0},trackWrap:{gap:5},track:{height:10,borderWidth:1,borderRadius:3,overflow:'hidden'},fill:{height:'100%'},stageRow:{flexDirection:'row',justifyContent:'space-between',gap:3,marginVertical:4},stageCell:{flex:1,alignItems:'center',gap:4},stageDot:{width:11,height:11,borderWidth:1,borderRadius:3},buffs:{flexDirection:'row',gap:5},buff:{flex:1,minWidth:0,borderWidth:1,borderRadius:6,padding:7,alignItems:'center',gap:4},recipe:{borderWidth:1,borderRadius:6,padding:8,gap:5},milestone:{borderWidth:1,borderRadius:6,padding:9,gap:6},detail:{paddingTop:5,gap:4},reward:{flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,paddingTop:8}});
