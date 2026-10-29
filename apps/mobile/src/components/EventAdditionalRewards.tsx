import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {availableEventRepeatCaches,claimableLiveEvent,eventCommunityMilestones,eventDiscoveryBoard,EVENT_COMMUNITY_MIN_CONTRIBUTION,eventProgress} from '../core/live-events';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';
import {RewardArt} from './EventRewardArt';
import {Panel} from './Panel';

export function EventAdditionalRewards({state,now,busy=false,pendingId,onClaimDiscovery,onClaimCache,onClaimCommunity}:{
 state:GameState;now:number;busy?:boolean;pendingId?:string|null;
 onClaimDiscovery:(id:string)=>unknown;onClaimCache:()=>unknown;onClaimCommunity:(percent:number)=>unknown;
}){
 const C=useGameTheme(),event=claimableLiveEvent(state,now);
 if(!event)return null;
 const definition=event.definition,discoveries=eventDiscoveryBoard(state,now),caches=availableEventRepeatCaches(state,definition.id),community=eventCommunityMilestones(state,now);
 const showCaches=caches>0||eventProgress(state,definition.id)>=definition.maxProgress;
 if(!discoveries.length&&!community.length&&!showCaches)return null;
 return <Panel>
  <View style={s.heading}><Text accessibilityRole="header" style={[s.title,{color:C.text}]}>Additional event rewards</Text><Text style={[s.body,{color:C.muted}]}>Claim completed discoveries and other earned event rewards here.</Text></View>
  {discoveries.length?<View style={s.section}>
   <Text style={[s.kicker,{color:C.accent}]}>FOLKLORE DISCOVERIES</Text>
   {discoveries.map(({discovery,count,ready,claimed})=>{
    const pending=pendingId===`discovery:${discovery.id}`;
    return <View key={discovery.id} style={[s.rewardRow,{borderColor:ready&&!claimed?C.accent:C.line,backgroundColor:ready&&!claimed?C.accentSurface:C.panel2}]}>
     <RewardArt reward={discovery.reward} definition={definition} size={48}/>
     <View style={s.copy}><Text style={[s.rewardName,{color:C.text}]}>{discovery.reward.name}</Text><Text style={[s.body,{color:C.muted}]}>{discovery.name} · {Math.min(count,discovery.required)} / {discovery.required}</Text></View>
     <View style={s.action}><GameButton compact title={claimed?'Claimed':ready?'Claim':'Locked'} loading={pending} disabled={busy||claimed||!ready} tone={ready&&!claimed?'primary':'secondary'} onPress={()=>onClaimDiscovery(discovery.id)}/></View>
    </View>;
   })}
  </View>:null}
  {showCaches?<View style={s.section}>
   <Text style={[s.kicker,{color:C.accent}]}>BONUS CACHE</Text>
   <View style={[s.rewardRow,{borderColor:caches?C.accent:C.line,backgroundColor:caches?C.accentSurface:C.panel2}]}><View style={s.cacheIcon}><Text style={[s.cacheMark,{color:C.special}]}>✦</Text></View><View style={s.copy}><Text style={[s.rewardName,{color:C.text}]}>Post-cap event cache</Text><Text style={[s.body,{color:C.muted}]}>{caches?`${caches} ready · ${caches} ${definition.prestigeCurrencyName} total (1 per 1,000 extra reputation)`:`Earn 1,000 more reputation after the final milestone.`}</Text></View><View style={s.action}><GameButton compact title={caches?`Claim all (${caches})`:'Locked'} loading={pendingId==='cache'} disabled={busy||!caches} tone={caches?'primary':'secondary'} onPress={onClaimCache}/></View></View>
  </View>:null}
  {community.length?<View style={s.section}>
   <Text style={[s.kicker,{color:C.accent}]}>COMMUNITY REWARDS</Text>
   {community.map(({milestone,ready,eligible,claimed})=>{const pending=pendingId===`community:${milestone.percent}`,claimable=ready&&eligible&&!claimed;return <View key={milestone.percent} style={[s.rewardRow,{borderColor:claimable?C.accent:C.line,backgroundColor:claimable?C.accentSurface:C.panel2}]}><View style={s.communityIcon}><Text style={[s.communityPercent,{color:C.special}]}>{milestone.percent}%</Text></View><View style={s.copy}><Text style={[s.rewardName,{color:C.text}]}>{milestone.reward?.name??`${milestone.rewardCurrency} ${definition.currencyName}`}</Text><Text style={[s.body,{color:C.muted}]}>{claimed?'Reward claimed':!eligible?`Contribute ${EVENT_COMMUNITY_MIN_CONTRIBUTION} event currency to qualify`:ready?'Community milestone reached':'Community milestone in progress'}</Text></View><View style={s.action}><GameButton compact title={claimed?'Claimed':claimable?'Claim':'Locked'} loading={pending} disabled={busy||!claimable} tone={claimable?'primary':'secondary'} onPress={()=>onClaimCommunity(milestone.percent)}/></View></View>})}
  </View>:null}
 </Panel>;
}

const s=StyleSheet.create({
 heading:{gap:3},title:{...typography.title},body:{fontSize:12,lineHeight:18},section:{gap:8,marginTop:spacing.sm},kicker:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:1},rewardRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderRadius:radii.sm},copy:{flex:1,minWidth:0},rewardName:{fontSize:14,lineHeight:20,fontWeight:'800'},action:{width:92},cacheIcon:{width:48,height:48,alignItems:'center',justifyContent:'center'},cacheMark:{fontSize:28,fontWeight:'900'},communityIcon:{width:48,height:48,alignItems:'center',justifyContent:'center'},communityPercent:{fontSize:15,fontWeight:'900'}
});
