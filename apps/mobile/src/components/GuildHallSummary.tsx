import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {ThemedIcon} from './ThemedNavigationIcon';
import {loadOnlineGuildMuster,type OnlineGuildMusterState} from '../online/guild-muster';
import {claimOnlineGuildDailyTokens,claimOnlineGuildEventBonus,claimOnlineGuildWeeklyTokens,loadOnlineGuildTokenShop,type GuildTokenShopSnapshot,type GuildWeeklyRewardKind} from '../online/guild-token-shop';
import {guildDailyTokenClaimStatus,type GuildDailyTokenKind} from '../core/guild-token-daily-claim';
import {typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type ClaimRow={id:string;title:string;tokens:number;run:()=>Promise<number>};

const weeklyLabel=(kind:GuildWeeklyRewardKind):string=>
 kind==='attendance'?'Four-day participation':kind==='project'?'Guild Project contribution':'Guild Boss reward';

function readyClaims(snapshot:GuildTokenShopSnapshot|null):ClaimRow[]{
 if(!snapshot)return [];
 const rows:ClaimRow[]=[];
 for(const reward of snapshot.weeklyRewards)
  if(reward.eligible&&!reward.claimed)
   rows.push({id:`weekly:${reward.kind}`,title:weeklyLabel(reward.kind),tokens:reward.tokens,run:()=>claimOnlineGuildWeeklyTokens(reward.kind)});
 for(const reward of snapshot.eventBonuses)
  if(!reward.claimed)
   rows.push({id:`event:${reward.eventId}:${reward.milestonePercent}`,title:`${reward.eventId.replace(/[_-]/g,' ')} · ${reward.milestonePercent}%`,tokens:reward.tokens,run:()=>claimOnlineGuildEventBonus(reward.eventId,reward.milestonePercent)});
 return rows;
}

/**
 * Guild Hall landing summary. Surfaces the two things done every session — daily
 * Muster check-in (automatic on first authenticated session) and Guild Token
 * claiming — at the top of the Guild home, instead of buried under
 * Activities -> Muster and Hall -> Shop -> Earn.
 */
export function GuildHallSummary({onOpenMuster,onOpenShop,onRewardsChanged,compact=false}:{onOpenMuster:()=>void;onOpenShop:()=>void;onRewardsChanged?:()=>void|Promise<unknown>;compact?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [muster,setMuster]=useState<OnlineGuildMusterState|null>(null);
 const [shop,setShop]=useState<GuildTokenShopSnapshot|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[noticeError,setNoticeError]=useState(false);
 const mounted=useRef(true),claimPending=useRef(false),loadGeneration=useRef(0);

 const load=async()=>{
  if(!mounted.current)return;
  const generation=++loadGeneration.current;
  setLoading(true);
  const [musterResult,shopResult]=await Promise.allSettled([loadOnlineGuildMuster(),loadOnlineGuildTokenShop()]);
  if(!mounted.current||generation!==loadGeneration.current)return;
  // Missing/failing snapshots must never leave a stale green Claim button.
  setMuster(musterResult.status==='fulfilled'?musterResult.value?.state??null:null);
  setShop(shopResult.status==='fulfilled'?shopResult.value??null:null);
  setLoading(false);
 };

 useEffect(()=>{
  mounted.current=true;
  void load();
  const listener=AppState.addEventListener('change',next=>{if(next==='active')void load()});
  return()=>{mounted.current=false;loadGeneration.current++;listener.remove();};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const claims=readyClaims(shop);

 const claim=async(row:ClaimRow)=>{
  if(claimPending.current)return;
  claimPending.current=true;setBusy(row.id);setNotice('');setNoticeError(false);
  try{
   const credited=await row.run();
   setNotice(credited?`+${credited} Guild Tokens`:'Already claimed, or weekly cap reached.');
   try{await onRewardsChanged?.();}catch{/* credited reward must remain successful */}
   await load();
  }catch(reason){
   setNoticeError(true);setNotice(reason instanceof Error?reason.message:'Could not claim right now.');
   await load();
  }finally{claimPending.current=false;if(mounted.current)setBusy('');}
 };
 const claimAll=async()=>{
  if(claimPending.current)return;
  claimPending.current=true;setBusy('all');setNotice('');setNoticeError(false);
  try{
   let total=0,failed=0;
   for(const row of claims){try{total+=await row.run();}catch{failed++;}}
   setNoticeError(failed>0);
   setNotice((total?`+${total} Guild Tokens claimed`:'No rewards claimed')+(failed?` · ${failed} claim${failed===1?'':'s'} failed. Retry remaining rewards.`:''));
   try{await onRewardsChanged?.();}catch{/* non-fatal */}
   await load();
  }finally{claimPending.current=false;if(mounted.current)setBusy('');}
 };
 const claimDaily=async(kind:GuildDailyTokenKind)=>{
  if(claimPending.current||busy||loading||guildDailyTokenClaimStatus(shop,muster,kind)!=='ready')return;
  claimPending.current=true;setBusy('daily:'+kind);setNotice('');setNoticeError(false);
  try{
   const credited=await claimOnlineGuildDailyTokens(kind);
   setNotice(credited?`+${credited} Guild Tokens claimed`:'Already claimed or weekly cap reached.');
   try{await onRewardsChanged?.();}catch{/* credited reward must remain successful */}
  }catch(reason){
   setNoticeError(true);
   setNotice(reason instanceof Error?reason.message:'Could not claim Guild Tokens. Refresh and try again.');
  }finally{
   await load();
   claimPending.current=false;
   if(mounted.current)setBusy('');
  }
 };

 const checkedIn=muster?.checkedIn===true;
 const rallyPct=muster&&muster.rallyTarget>0?Math.max(0,Math.min(100,Math.round(muster.rallyMarks/muster.rallyTarget*100))):0;
 const weeklyPct=shop&&shop.weeklyCap>0?Math.max(0,Math.min(100,Math.round(shop.earnedThisWeek/shop.weeklyCap*100))):0;
 const treasury=shop?.treasuryBonusBps?Math.round(shop.treasuryBonusBps/100):0;
 const busyAll=busy==='all';
 const dailyRewards=(['attendance','contribution'] as const).map(kind=>({
  kind,
  status:loading?'unavailable' as const:guildDailyTokenClaimStatus(shop,muster,kind),
  title:kind==='attendance'?'Check-in':'Activity',
  tokens:Math.min(Math.max(0,(shop?.weeklyCap??0)-(shop?.earnedThisWeek??0)),Math.ceil(10*(10000+(shop?.treasuryBonusBps??0))/10000)),
 }));
 const dailyActions=<View style={s.dailySection}>
  <View style={s.dailyHead}>
   <Text style={s.dailyHeading}>DAILY TOKEN REWARDS</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Refresh daily Guild Token eligibility" disabled={loading||!!busy}
    accessibilityState={{disabled:loading||!!busy}} onPress={()=>void load()} style={s.refresh}>
    <Text style={[s.refreshText,{color:loading||!!busy?C.muted:C.accent}]}>{loading?'Checking…':'Refresh ↻'}</Text>
   </Pressable>
  </View>
  <View style={s.dailyPair}>
   {dailyRewards.map(reward=>{
    const ready=reward.status==='ready',claimed=reward.status==='claimed',blocked=reward.status==='locked';
    const enabled=ready&&!busy&&!loading;
    const foreground=ready?C.good:blocked?C.bad:C.muted;
    const stateText=busy==='daily:'+reward.kind?'Claiming…':ready?'Claim now':claimed?'Claimed today':reward.status==='capped'?'Weekly cap reached':blocked?(reward.kind==='attendance'?'Muster check-in needed':'Combat or Skilling needed'):'Status unavailable';
    return <Pressable key={reward.kind} accessibilityRole="button" accessibilityLabel={reward.title+', up to '+reward.tokens+' Guild Tokens, '+stateText}
     accessibilityState={{disabled:!enabled,busy:busy==='daily:'+reward.kind}} disabled={!enabled}
     onPress={()=>void claimDaily(reward.kind)}
     style={({pressed})=>[s.dailyTile,{borderColor:ready?C.good:blocked?C.bad:C.line,backgroundColor:ready?C.goodSurface:blocked?C.badSurface:C.panel2},pressed&&s.dailyTilePressed]}>
     <Text style={[s.dailyTitle,{color:C.text}]}>{reward.title}</Text>
     <Text style={[s.dailyAmount,{color:foreground}]}>Up to +{reward.tokens} Tokens</Text>
     <Text style={[s.dailyState,{color:foreground}]}>{stateText}</Text>
    </Pressable>;
   })}
  </View>
  <Text style={s.dailyFootnote}>Activity requires verified Combat or Skilling today · Resets at 00:00 UTC</Text>
 </View>;

 if(compact)return <View style={s.stack}>
  <Panel style={s.compactPanel}>
   <View style={s.row}>
    <View style={s.flex}><Text style={s.kicker}>DAILY MUSTER</Text><Text style={s.compactTitle}>{checkedIn?'Checked in today':'Check-in pending'}</Text><Text style={s.compactMeta}>{muster?'Rally '+rallyPct+'% · '+muster.dailyPoints+' points today':loading?'Checking attendance…':'Muster unavailable'}</Text></View>
    <StatusPill label={checkedIn?'DONE':'TODAY'} tone={checkedIn?'good':'warning'}/>
   </View>
   <GameButton compact tone="secondary" title="View Muster & Rally" onPress={onOpenMuster}/>
  </Panel>
  <Panel style={s.compactPanel}>
   <View style={s.row}><View style={s.flex}><Text style={s.kicker}>GUILD TOKENS</Text><Text style={s.compactTitle}>{shop?shop.balance.toLocaleString():'—'} <Text style={s.compactMeta}>available</Text></Text></View>
    {claims.length>0?<StatusPill label={claims.length+' READY'} tone="good"/>:null}
   </View>
   {claims.length>1?<GameButton compact title={busyAll?'Claiming…':'Claim all '+claims.length+' rewards'} disabled={!!busy} loading={busyAll} onPress={()=>void claimAll()}/>:null}
   {claims.slice(0,claims.length>1?0:1).map(row=><View key={row.id} style={s.compactClaim}><Text numberOfLines={2} style={[s.claimTitle,s.flex]}>{row.title} · +{row.tokens}</Text><GameButton compact title="Claim" disabled={!!busy} loading={busy===row.id} onPress={()=>void claim(row)}/></View>)}
   {notice?<Text accessibilityLiveRegion="polite" style={[s.notice,{color:noticeError?C.bad:C.good}]}>{notice}</Text>:null}
   <GameButton compact tone="secondary" title="Guild Token Shop" onPress={onOpenShop}/>
   {dailyActions}
  </Panel>
 </View>;

 return <View style={s.stack}>
  {/* CHECK-IN */}
  <Panel style={s.hero}>
   <View style={s.row}>
    <View style={s.heroIcon}><ThemedIcon name="guild" size={30}/></View>
    <View style={s.flex}>
     <Text style={s.kicker}>DAILY MUSTER</Text>
     <Text style={s.heroTitle}>Show up with your Guild</Text>
    </View>
    <StatusPill label={checkedIn?'CHECKED IN':'CHECK-IN DUE'} tone={checkedIn?'good':'warning'}/>
   </View>
   {muster?<View style={s.metrics}>
    <Metric label="CHECK-IN" value={String(muster.checkInPoints)} C={C} s={s}/>
    <Metric label="TODAY" value={String(muster.dailyPoints)} C={C} s={s}/>
    <Metric label="RALLY" value={`${rallyPct}%`} C={C} s={s}/>
    {muster.hallBonusBps>0?<Metric label="HALL BONUS" value={`+${Math.round(muster.hallBonusBps/100)}%`} C={C} s={s}/>:null}
   </View>:<Text style={s.copy}>{loading?'Checking today’s attendance…':'Join a Guild to take part in daily Muster.'}</Text>}
   <Text style={s.hint}>{checkedIn
    ?'Attendance is recorded. Combat and skilling keep adding Muster automatically for the rest of the day.'
    :'Opening the Guild records today’s attendance. Combat and skilling then add Muster automatically.'}</Text>
   <GameButton compact tone="secondary" title="Open Muster & Rally" onPress={onOpenMuster}/>
  </Panel>

  {/* TOKENS + CLAIM */}
  <Panel style={s.wallet}>
   <View style={s.row}>
    <View style={s.flex}>
     <Text style={s.kicker}>GUILD TOKENS</Text>
     <View style={s.balRow}>
      <Text style={s.balance}>{shop?shop.balance.toLocaleString():'—'}</Text>
      <Text style={s.balUnit}>Tokens</Text>
     </View>
    </View>
    {treasury>0?<View style={s.treasury}><Text style={s.treasuryText}>Treasury +{treasury}%</Text></View>:null}
   </View>
   {shop?<View style={s.cap}>
    <View style={s.capRow}><Text style={s.capLabel}>Earned this week</Text><Text style={s.capValue}>{shop.earnedThisWeek} / {shop.weeklyCap}</Text></View>
    <View style={s.track}><View style={[s.fill,{width:(weeklyPct+'%') as `${number}%`,backgroundColor:C.accent}]}/></View>
   </View>:null}

   <View style={s.claimHead}>
    <Text style={s.claimKicker}>{claims.length?'Ready to claim':'Nothing to claim right now'}</Text>
    {claims.length>1?<GameButton compact title="Claim all" loading={busyAll} disabled={!!busy} onPress={()=>void claimAll()}/>:null}
   </View>
   {claims.map(row=><View key={row.id} style={s.claim}>
    <View style={s.flex}>
     <Text style={s.claimTitle}>{row.title}</Text>
     <Text style={s.claimMeta}><Text style={s.amt}>+{row.tokens}</Text> Tokens · ready</Text>
    </View>
    <GameButton compact title="Claim" loading={busy===row.id} disabled={!!busy} onPress={()=>void claim(row)}/>
   </View>)}
   {!claims.length&&shop?<Text style={s.copy}>Earn Tokens through daily Muster, Guild Projects and Guild bosses. New rewards appear here to claim.</Text>:null}
   {notice?<Text accessibilityLiveRegion="polite" style={[s.notice,{color:noticeError?C.bad:C.good}]}>{notice}</Text>:null}
   <GameButton compact tone="secondary" title="Open Guild Token Shop" onPress={onOpenShop}/>
   {dailyActions}
  </Panel>
 </View>;
}

function Metric({label,value,C,s}:{label:string;value:string;C:ThemeColors;s:ReturnType<typeof makeStyles>}){
 return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={[s.metricValue,{color:C.accent}]}>{value}</Text></View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 stack:{gap:12},
 compactPanel:{gap:7,padding:10},compactTitle:{fontSize:16,lineHeight:22,fontWeight:'800',color:C.text},compactMeta:{fontSize:11,lineHeight:16,color:C.muted,fontWeight:'600'},compactClaim:{flexDirection:'row',alignItems:'center',gap:8},
 hero:{gap:11},
 wallet:{gap:11},
 row:{flexDirection:'row',alignItems:'center',gap:10},
 flex:{flex:1,minWidth:0},
 heroIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 kicker:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:.8},
 heroTitle:{...typography.title,color:C.text},
 metrics:{flexDirection:'row',flexWrap:'wrap',gap:8},
 metric:{flex:1,minWidth:70,paddingVertical:8,paddingHorizontal:10,borderRadius:10,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line},
 metricLabel:{fontSize:9.5,color:C.muted,fontWeight:'900',letterSpacing:.7},
 metricValue:{fontSize:17,fontWeight:'900',marginTop:2},
 copy:{fontSize:13,lineHeight:19,color:C.muted},
 hint:{fontSize:12,lineHeight:17,color:C.muted},
 balRow:{flexDirection:'row',alignItems:'baseline',gap:6,marginTop:2},
 balance:{fontSize:26,fontWeight:'900',color:C.accent},
 balUnit:{fontSize:12,color:C.muted,fontWeight:'800',letterSpacing:.5},
 treasury:{paddingHorizontal:9,paddingVertical:4,borderRadius:99,backgroundColor:C.infoSurface,borderWidth:1,borderColor:C.info},
 treasuryText:{fontSize:11,color:C.info,fontWeight:'900'},
 cap:{gap:6},
 capRow:{flexDirection:'row',justifyContent:'space-between'},
 capLabel:{fontSize:12,color:C.muted,fontWeight:'700'},
 capValue:{fontSize:12,color:C.text,fontWeight:'900'},
 track:{height:8,borderRadius:5,overflow:'hidden',backgroundColor:C.panel},
 fill:{height:'100%',borderRadius:5},
 claimHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:2},
 claimKicker:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,flex:1,minWidth:0},
 claim:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:9,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 claimTitle:{fontSize:14,color:C.text,fontWeight:'800'},
 claimMeta:{fontSize:12,color:C.muted,marginTop:1},
 amt:{color:C.accent,fontWeight:'900'},
 notice:{fontSize:12.5,color:C.good,fontWeight:'700'},
 dailySection:{gap:7,marginTop:4},
 dailyHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 dailyHeading:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.65},
 refresh:{minHeight:32,minWidth:55,paddingHorizontal:5,alignItems:'center',justifyContent:'center'},
 refreshText:{fontSize:11,fontWeight:'800'},
 dailyPair:{flexDirection:'row',gap:8},
 dailyTile:{flex:1,minWidth:0,minHeight:92,borderWidth:1,borderRadius:10,paddingVertical:10,paddingHorizontal:5,alignItems:'center',justifyContent:'center',gap:3},
 dailyTilePressed:{opacity:.8},
 dailyTitle:{fontSize:13,lineHeight:18,fontWeight:'900',textAlign:'center'},
 dailyAmount:{fontSize:13,lineHeight:19,fontWeight:'900',textAlign:'center'},
 dailyState:{fontSize:10.5,lineHeight:15,fontWeight:'800',textAlign:'center'},
 dailyFootnote:{fontSize:10.5,lineHeight:15,color:C.muted},
});}
