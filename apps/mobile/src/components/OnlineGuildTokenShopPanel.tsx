import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {OnlineGuildConstructionPanel} from './OnlineGuildConstructionPanel';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {claimOnlineGuildDailyTokens,claimOnlineGuildEventBonus,claimOnlineGuildWeeklyTokens,purchaseOnlineGuildTokenReward,loadOnlineGuildTokenShop,type GuildTokenShopCategory,type GuildTokenShopSnapshot,type GuildWeeklyRewardKind} from '../online/guild-token-shop';

type Filter='all'|GuildTokenShopCategory;
const FILTERS:readonly {id:Filter;label:string}[]=[
 {id:'all',label:'All'},{id:'pet',label:'Pets'},{id:'companion',label:'Companions'},
 {id:'border',label:'Borders'},{id:'profile_icon',label:'Icons'},{id:'emote_set',label:'Emotes'},
];
const STATUS_LABELS={
 owned:'Owned',guild_level_locked:'Guild level required',
 insufficient_tokens:'Saving up',eligible:'Tokens available',
} as const;

/** Read-only until atomic purchase + in-game entitlement delivery are available. */
export function OnlineGuildTokenShopPanel({onRewardsChanged}:{onRewardsChanged?:()=>void|Promise<unknown>}){
 const C=useGameTheme(),styles=useMemo(()=>makeStyles(C),[C]);
 const [snapshot,setSnapshot]=useState<GuildTokenShopSnapshot|null>(null);
 const [filter,setFilter]=useState<Filter>('all');
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [claiming,setClaiming]=useState<'attendance'|'contribution'|null>(null),[claimNotice,setClaimNotice]=useState('');
 const [purchasing,setPurchasing]=useState<string|null>(null);
 const [eventBusy,setEventBusy]=useState<string|null>(null);
 const [weeklyBusy,setWeeklyBusy]=useState<GuildWeeklyRewardKind|null>(null);
 const claimWeekly=async(kind:GuildWeeklyRewardKind)=>{
  if(weeklyBusy||loading||claiming||eventBusy||purchasing)return;
  setWeeklyBusy(kind);setError('');setClaimNotice('');
  try{
   const credited=await claimOnlineGuildWeeklyTokens(kind);
   setClaimNotice(credited>0?`+ ${credited} weekly Guild Tokens earned!`:'Already claimed or weekly cap reached.');
   setSnapshot(await loadOnlineGuildTokenShop());
  }catch(reason){setError(reason instanceof Error?reason.message:'Could not claim weekly Guild reward.');}
  finally{setWeeklyBusy(null);}
 };
 const claimEvent=async(eventId:string,milestonePercent:number)=>{
  if(eventBusy||weeklyBusy||loading||claiming||purchasing)return;
  const key=eventId+':'+milestonePercent;
  setEventBusy(key);setError('');setClaimNotice('');
  try{
   const credited=await claimOnlineGuildEventBonus(eventId,milestonePercent);
   setClaimNotice(credited>0?`+ ${credited} bonus Guild Tokens from the event!`:'This milestone was already claimed.');
   setSnapshot(await loadOnlineGuildTokenShop());
  }catch(reason){setError(reason instanceof Error?reason.message:'Could not claim Guild event bonus.');}
  finally{setEventBusy(null);}
 };
 const buy=async(itemId:string)=>{
  if(purchasing||eventBusy||weeklyBusy||loading||claiming)return;
  setPurchasing(itemId);setError('');setClaimNotice('');
  try{
   const status=await purchaseOnlineGuildTokenReward(itemId);
   setClaimNotice(status==='purchased'?'Reward unlocked for your account!':'Already owned. No additional Guild Tokens were spent.');
   await onRewardsChanged?.();
   setSnapshot(await loadOnlineGuildTokenShop());
  }catch(reason){setError(reason instanceof Error?reason.message:'Unable to confirm reward purchase.');}
  finally{setPurchasing(null);}
 };
 const claim=async(kind:'attendance'|'contribution')=>{
  if(claiming||eventBusy||weeklyBusy||purchasing||loading)return;
  setClaiming(kind);setError('');setClaimNotice('');
  try{
   const credited=await claimOnlineGuildDailyTokens(kind);
   setClaimNotice(credited>0?`+ ${credited} Guild Tokens earned!`:'Already claimed or normal weekly cap reached.');
   setSnapshot(await loadOnlineGuildTokenShop());
  }catch(reason){setError(reason instanceof Error?reason.message:'Unable to claim Guild Tokens.');}
  finally{setClaiming(null);}
 };
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   setLoading(true);setError('');
   try{const next=await loadOnlineGuildTokenShop();if(active)setSnapshot(next);}
   catch(reason){if(active)setError(reason instanceof Error?reason.message:'Unable to load the Guild Token Shop.');}
   finally{if(active)setLoading(false);}
  };
  void load();return()=>{active=false;};
 },[]);
 const retry=async()=>{
  setLoading(true);setError('');
  try{setSnapshot(await loadOnlineGuildTokenShop());}
  catch(reason){setError(reason instanceof Error?reason.message:'Unable to load the Guild Token Shop.');}
  finally{setLoading(false);}
 };
 const visible=snapshot?.cards.filter(card=>filter==='all'||card.category===filter)??[];
 const normalCapReached=!!snapshot&&snapshot.earnedThisWeek>=snapshot.weeklyCap;
 return <View style={styles.root}>
  <Panel>
   <Text style={styles.kicker}>GUILD REWARDS</Text>
   <Text style={styles.title}>Guild Token Shop</Text>
   <Text style={styles.copy}>Permanent pets, companions and identity rewards. Guild Tokens are separate from the Quartermaster's Guild Marks.</Text>
   <View style={styles.balanceRow}>
    <View><Text style={styles.mini}>YOUR GUILD TOKENS</Text><Text style={styles.balance}>{snapshot?snapshot.balance.toLocaleString():'—'}</Text></View>
    <View style={styles.weekly}><Text style={styles.mini}>NORMAL WEEKLY CAP</Text><Text style={styles.weeklyNumber}>{snapshot?`${snapshot.earnedThisWeek}/${snapshot.weeklyCap}`:'0/250'}</Text></View>
   </View>
   <Text style={styles.note}>Guild event milestones can award additional tokens above the normal weekly cap. Your balance remains yours when changing guilds.</Text>
   {snapshot?<View style={styles.claimBlock}>
    <Text style={styles.mini}>VERIFIED DAILY GUILD MUSTER</Text>
    <View style={styles.dailyRow}>
     <GameButton compact tone="secondary" title={snapshot.claimedDailyKinds.includes('attendance')?'Check-in claimed':normalCapReached?'Weekly cap reached':claiming==='attendance'?'Claiming…':'Claim 10 · Check-in'} disabled={loading||normalCapReached||claiming!==null||!!weeklyBusy||!!eventBusy||!!purchasing||snapshot.claimedDailyKinds.includes('attendance')} onPress={()=>void claim('attendance')}/>
     <GameButton compact tone="secondary" title={snapshot.claimedDailyKinds.includes('contribution')?'Contribution claimed':normalCapReached?'Weekly cap reached':claiming==='contribution'?'Claiming…':'Claim 10 · Activity'} disabled={loading||normalCapReached||claiming!==null||!!weeklyBusy||!!eventBusy||!!purchasing||snapshot.claimedDailyKinds.includes('contribution')} onPress={()=>void claim('contribution')}/>
    </View>
    <Text style={styles.note}>Check in or complete verified Combat and Skilling through Guild Muster to earn these rewards. Each claim is available once per UTC day.</Text>
    {claimNotice?<Text accessibilityLiveRegion="polite" style={styles.success}>{claimNotice}</Text>:null}
   </View>:null}
  </Panel>
  {snapshot?.weeklyRewards.length?<Panel>
   <Text style={styles.kicker}>WEEKLY GUILD GOALS</Text>
   <Text style={styles.section}>Earn together</Text>
   <Text style={styles.copy}>Complete four daily Muster check-ins, contribute meaningfully to a Guild Project, or claim a weekly Guild Boss reward. These count toward your normal 250-token cap.</Text>
   {snapshot.weeklyRewards.map(reward=>{
    const title=reward.kind==='attendance'?'Four-day participation':reward.kind==='project'?'Guild Project contribution':'Guild Boss reward';
    return <View key={reward.kind} style={styles.eventRow}>
     <View style={{flex:1}}>
      <Text style={styles.rewardTitle}>{title}</Text>
      <Text style={styles.meta}>+{reward.tokens} Guild Tokens · {reward.claimed?'Claimed':reward.eligible?'Ready to claim':'In progress'}</Text>
     </View>
     <GameButton compact tone="secondary"
      title={reward.claimed?'Claimed':normalCapReached?'Weekly cap reached':weeklyBusy===reward.kind?'Claiming…':'Claim'}
      disabled={!reward.eligible||reward.claimed||normalCapReached||!!weeklyBusy||loading||!!claiming||!!purchasing||!!eventBusy}
      onPress={()=>void claimWeekly(reward.kind)}/>
    </View>;
   })}
  </Panel>:null}
  <Panel>
   <View style={styles.between}><Text style={styles.section}>Exclusive rewards</Text>{loading?<ActivityIndicator color={C.accent}/>:<GameButton compact tone="secondary" title="Refresh" onPress={()=>void retry()}/>}</View>
   <Text style={styles.notice}>Only released rewards can be purchased. Guild levels above 10 are future progression content; their rewards will unlock after that cap expands.</Text>
   {snapshot?.unavailableSections?.length?<Text accessibilityRole="alert" style={styles.notice}>Some Guild Shop sections are temporarily unavailable ({snapshot.unavailableSections.join(', ')}). Your balance and available rewards are still shown; refresh to check again.</Text>:null}
   {error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}
   {!loading&&!error&&!snapshot?<Text style={styles.copy}>Join a guild to browse its permanent rewards.</Text>:null}
   <View style={styles.filters}>{FILTERS.map(tab=><Pressable key={tab.id} accessibilityRole="button" accessibilityState={{selected:filter===tab.id}} onPress={()=>setFilter(tab.id)} style={[styles.filter,filter===tab.id&&styles.filterSelected]}><Text style={[styles.filterText,filter===tab.id&&styles.filterTextSelected]}>{tab.label}</Text></Pressable>)}</View>
   {visible.map(card=><View key={card.id} style={styles.reward}>
    <View style={styles.between}><Text style={styles.rewardTitle}>{card.title}</Text><Text style={styles.price}>{card.price.toLocaleString()} Tokens</Text></View>
    <Text style={styles.meta}>Guild Lv {card.requiredGuildLevel} · {STATUS_LABELS[card.status]}</Text>
    {card.status!=='owned'?<View style={styles.track}><View style={[styles.fill,{width:`${Math.round(card.progressToPrice*100)}%` as `${number}%`}]}/></View>:null}
    {card.status==='insufficient_tokens'?<Text style={styles.hint}>{Math.max(0,card.price-(snapshot?.balance??0)).toLocaleString()} more tokens needed</Text>:null}
    {card.status==='guild_level_locked'?<Text style={styles.hint}>{card.requiredGuildLevel>10?`Future Guild progression · Level ${card.requiredGuildLevel}`:`Reach Guild Level ${card.requiredGuildLevel} to unlock this reward.`}</Text>:null}
    {card.released&&card.status==='eligible'?<GameButton compact title={purchasing===card.id?'Purchasing…':'Unlock reward'} disabled={loading||!!purchasing||claiming!==null||!!weeklyBusy||!!eventBusy} onPress={()=>void buy(card.id)}/>:null}
    {!card.released&&card.status!=='owned'?<Text style={styles.hint}>Coming soon · Reward not released</Text>:null}
   </View>)}
   {snapshot&&!visible.length?<Text style={styles.copy}>No rewards in this category yet.</Text>:null}
  </Panel>
  {snapshot&&snapshot.eventBonuses.length>0?<Panel>
   <Text style={styles.kicker}>SEASONAL BONUSES</Text>
   <Text style={styles.section}>Event Guild Tokens</Text>
   <Text style={styles.copy}>Already-earned community milestones award extra Guild Tokens outside the regular 250-per-week limit. Each reward can be claimed once.</Text>
   {snapshot.eventBonuses.map(reward=>{
    const key=reward.eventId+':'+reward.milestonePercent;
    return <View key={key} style={styles.eventRow}>
     <View style={{flex:1}}>
      <Text style={styles.rewardTitle}>{reward.eventId.replace(/[_-]/g,' ')} · {reward.milestonePercent}%</Text>
      <Text style={styles.meta}>+{reward.tokens} bonus Guild Tokens</Text>
     </View>
     <GameButton compact tone="secondary"
      title={reward.claimed?'Claimed':eventBusy===key?'Claiming…':'Claim'}
      disabled={reward.claimed||!!eventBusy||!!weeklyBusy||loading||!!claiming||!!purchasing}
      onPress={()=>void claimEvent(reward.eventId,reward.milestonePercent)}/>
    </View>;
   })}
  </Panel>:null}
  {snapshot?<OnlineGuildConstructionPanel snapshot={snapshot} onRewardsChanged={onRewardsChanged} onReload={retry}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},kicker:{fontSize:9,fontWeight:'900',letterSpacing:1,color:C.accent},title:{fontSize:19,fontWeight:'800',color:C.text,marginTop:3},
 copy:{fontSize:11,lineHeight:16,color:C.muted,marginTop:6},
 balanceRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:12,padding:12,borderRadius:10,backgroundColor:C.panel2},
 mini:{fontSize:8,fontWeight:'800',letterSpacing:.6,color:C.muted},balance:{fontSize:24,fontWeight:'900',color:C.accent,marginTop:3},
 weekly:{alignItems:'flex-end'},weeklyNumber:{fontSize:15,fontWeight:'800',color:C.text,marginTop:4},
 note:{fontSize:10,color:C.info,lineHeight:15,marginTop:8},
 between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 section:{fontSize:16,fontWeight:'800',color:C.text},
 notice:{fontSize:10,color:C.warning,lineHeight:15,marginTop:8},
 eventRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderBottomColor:C.line,borderBottomWidth:1},
 claimBlock:{marginTop:12,gap:8},dailyRow:{flexDirection:'row',flexWrap:'wrap',gap:8},success:{fontSize:10,color:C.good},
 error:{fontSize:11,color:C.bad,marginTop:8},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:12,marginBottom:4},
 filter:{paddingVertical:6,paddingHorizontal:10,borderWidth:1,borderRadius:8,borderColor:C.lineStrong,backgroundColor:C.panel2},
 filterSelected:{borderColor:C.accent,backgroundColor:C.goodSurface},
 filterText:{fontSize:10,color:C.muted,fontWeight:'700'},filterTextSelected:{color:C.text},
 reward:{paddingVertical:11,gap:5,borderBottomWidth:1,borderBottomColor:C.line},
 rewardTitle:{color:C.text,fontSize:12,fontWeight:'800',flex:1},
 price:{color:C.accent,fontSize:11,fontWeight:'900'},
 meta:{color:C.info,fontSize:10},track:{height:5,borderRadius:4,backgroundColor:C.panel2,overflow:'hidden',marginTop:4},
 fill:{height:'100%',backgroundColor:C.accent},hint:{fontSize:10,color:C.muted},
 });}
