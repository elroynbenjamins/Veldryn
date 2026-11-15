import {StyleSheet,Text,View} from 'react-native';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {eventRewardText,type EventRewardMessage} from '../i18n/event-rewards';
import {localizeGameplay} from '../i18n/gameplay';
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
 const C=useGameTheme(),language=useGameLanguage(),gl=(text:string)=>localizeGameplay(language,text),t=(key:EventRewardMessage,params?:Record<string,string|number>)=>eventRewardText(language,key,params),event=claimableLiveEvent(state,now);
 if(!event)return null;
 const definition=event.definition,discoveries=eventDiscoveryBoard(state,now),caches=availableEventRepeatCaches(state,definition.id),community=eventCommunityMilestones(state,now);
 const earningOpen=event.phase==='active',personalContribution=Math.max(0,Math.floor(state.account.eventContributionById?.[definition.id]??0));
 const showCaches=caches>0||eventProgress(state,definition.id)>=definition.maxProgress;
 if(!discoveries.length&&!community.length&&!showCaches)return null;
 return <Panel>
  <View style={s.heading}><Text accessibilityRole="header" style={[s.title,{color:C.text}]}>{t('Additional event rewards')}</Text><Text style={[s.body,{color:C.muted}]}>{t('Claim completed discoveries and other earned event rewards here.')}</Text></View>
  {discoveries.length?<View style={s.section}>
   <Text style={[s.kicker,{color:C.accent}]}>{t('FOLKLORE DISCOVERIES')}</Text>
   {discoveries.map(({discovery,count,ready,claimed})=>{
    const pending=pendingId===`discovery:${discovery.id}`;
    return <View key={discovery.id} style={[s.rewardRow,{borderColor:ready&&!claimed?C.accent:C.line,backgroundColor:ready&&!claimed?C.accentSurface:C.panel2}]}>
     <RewardArt reward={discovery.reward} definition={definition} size={48}/>
     <View style={s.copy}><Text style={[s.rewardName,{color:C.text}]} >{gl(discovery.reward.name)}</Text><Text style={[s.body,{color:C.muted}]} >{gl(discovery.name)} · {Math.min(count,discovery.required)} / {discovery.required}</Text>
      {!claimed&&!ready?<Text style={[s.body,{color:C.muted}]}>{earningOpen?t('Earn {remaining} more discoveries to unlock.',{remaining:Math.max(0,discovery.required-count)}):t('Not earned · event ended')}</Text>:null}</View>
     <View style={s.action}><GameButton compact title={claimed?t('Claimed'):ready?t('Claim'):t('Locked')} loading={pending} disabled={busy||claimed||!ready} tone={ready&&!claimed?'primary':'secondary'} onPress={()=>onClaimDiscovery(discovery.id)}/></View>
    </View>;
   })}
  </View>:null}
  {showCaches?<View style={s.section}>
   <Text style={[s.kicker,{color:C.accent}]}>{t('BONUS CACHE')}</Text>
   <View style={[s.rewardRow,{borderColor:caches?C.accent:C.line,backgroundColor:caches?C.accentSurface:C.panel2}]}><View style={s.cacheIcon}><Text style={[s.cacheMark,{color:C.special}]}>✦</Text></View><View style={s.copy}><Text style={[s.rewardName,{color:C.text}]}>{t('Post-cap event cache')}</Text><Text style={[s.body,{color:C.muted}]}>{caches?t('{count} ready · {count} {currency} total (1 per 1,000 extra reputation)',{count:caches,currency:gl(definition.prestigeCurrencyName)}):earningOpen?t('Earn 1,000 more reputation after the final milestone.'):t('No more reputation can be earned for bonus caches.')}</Text></View><View style={s.action}><GameButton compact title={caches?t('Claim all ({count})',{count:caches}):t('Locked')} loading={pendingId==='cache'} disabled={busy||!caches} tone={caches?'primary':'secondary'} onPress={onClaimCache}/></View></View>
  </View>:null}
  {community.length?<View style={s.section}>
   <Text style={[s.kicker,{color:C.accent}]}>{t('COMMUNITY REWARDS')}</Text>
   {community.map(({milestone,ready,eligible,claimed})=>{const pending=pendingId===`community:${milestone.percent}`,claimable=ready&&eligible&&!claimed;return <View key={milestone.percent} style={[s.rewardRow,{borderColor:claimable?C.accent:C.line,backgroundColor:claimable?C.accentSurface:C.panel2}]}><View style={s.communityIcon}><Text style={[s.communityPercent,{color:C.special}]}>{milestone.percent}%</Text></View><View style={s.copy}><Text style={[s.rewardName,{color:C.text}]}>{milestone.reward?.name??`${milestone.rewardCurrency} ${definition.currencyName}`}</Text><Text style={[s.body,{color:C.muted}]}>{claimed?t('Reward claimed'):claimable?t('Ready to claim'):ready?t('Community target reached.'):t('Community target {percent}% not reached yet.',{percent:milestone.percent})}</Text>
    {!claimed&&!eligible?<Text style={[s.body,{color:C.warning}]}>{t('Your contribution: {current}/{required} {currency}',{current:Math.min(personalContribution,EVENT_COMMUNITY_MIN_CONTRIBUTION),required:EVENT_COMMUNITY_MIN_CONTRIBUTION,currency:gl(definition.currencyName)})}{!earningOpen?' · '+t('Not earned · event ended'):''}</Text>:null}</View><View style={s.action}><GameButton compact title={claimed?t('Claimed'):claimable?t('Claim'):t('Locked')} loading={pending} disabled={busy||!claimable} tone={claimable?'primary':'secondary'} onPress={()=>onClaimCommunity(milestone.percent)}/></View></View>})}
  </View>:null}
 </Panel>;
}

const s=StyleSheet.create({
 heading:{gap:3},title:{...typography.title},body:{fontSize:12,lineHeight:18},section:{gap:8,marginTop:spacing.sm},kicker:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:1},rewardRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderRadius:radii.sm},copy:{flex:1,minWidth:0},rewardName:{fontSize:14,lineHeight:20,fontWeight:'800'},action:{width:92},cacheIcon:{width:48,height:48,alignItems:'center',justifyContent:'center'},cacheMark:{fontSize:28,fontWeight:'900'},communityIcon:{width:48,height:48,alignItems:'center',justifyContent:'center'},communityPercent:{fontSize:15,fontWeight:'900'}
});
