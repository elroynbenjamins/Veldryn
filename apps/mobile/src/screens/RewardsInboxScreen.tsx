import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {PLAYER_MARKET_RELEASED,MARKET_AUTHENTICATED_SERVICE_READY} from '../core/release-flags';
import {MarketInboxPanel} from './MarketInboxPanel';
import {eventInboxRewards} from '../core/live-events';
import {liveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {loadRewardInbox,claimInboxReward,claimAllInboxRewards,type InboxEntry,type InboxSnapshot,type InboxAttachment} from '../online/reward-inbox';
import {useGameTheme} from '../theme/ThemeContext';
import {recentScreenText} from '../i18n/recent-screens';
import {SocialActionButton} from '../components/SocialActionButton';
import {ResourceIcon} from '../components/ResourceIcon';
import {UiIcon} from '../components/UiIcon';
import {LoadingState} from '../components/LoadingState';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

export function RewardsInboxScreen({state,online,onRefresh,onEventClaim,preview}:{state:GameState;online:boolean;onRefresh:()=>Promise<unknown>;onEventClaim:(id:string)=>Promise<unknown>;preview?:InboxSnapshot}){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>recentScreenText(language,text,params);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[expandedId,setExpandedId]=useState<string|null>(null),[history,setHistory]=useState(false),[marketTab,setMarketTab]=useState(false),[snapshot,setSnapshot]=useState<InboxSnapshot>(preview??{entries:[],pendingCount:0,total:0}),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[blockedClaims,setBlockedClaims]=useState<Record<string,string>>({});
 const {width,fontScale}=useWindowDimensions(),stackActions=width<430||fontScale>=1.2||state.settings.textScale>=1.2,stackHeader=width<360||fontScale>=1.3||state.settings.textScale>=1.3;
 const running=useRef(false),generation=useRef(0);
 const load=useCallback(async(append=false)=>{const token=++generation.current;if(preview)return;if(!online){setError(a('Sign in to receive rewards and gifts.'));return;}setLoading(true);try{const next=await loadRewardInbox(history,append?snapshot.entries.length:0);if(token===generation.current){setSnapshot(previous=>({...next,entries:append?[...previous.entries,...next.entries]:next.entries}));setError('');}}catch(e){if(token===generation.current)setError(e instanceof Error?e.message:a('Inbox unavailable.'));}finally{if(token===generation.current)setLoading(false);}},[history,online,preview,snapshot.entries.length]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[history,online,preview]);
 const eventRows=eventInboxRewards(state).filter(row=>row.claimed===history);
 const eventEntries:InboxEntry[]=eventRows.map(row=>({id:'event:'+row.reward.id,source:'event',title:a('{name} milestone',{name:row.eventName}),body:a('Earned festival rewards remain yours after the event ends.'),attachments:[{kind:row.reward.kind,resourceId:row.reward.id,name:row.reward.name,quantity:row.reward.quantity??1}],createdAt:'',claimedAt:row.claimed?'claimed':null}));
 const rows=[...eventEntries,...(preview?snapshot.entries.filter(row=>!!row.claimedAt===history):snapshot.entries)],pending=snapshot.pendingCount+eventInboxRewards(state).filter(row=>!row.claimed).length;
 const run=async(id?:string)=>{if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');try{
  if(preview){setSnapshot(s=>{const entries=s.entries.map(row=>!id||row.id===id?{...row,claimedAt:new Date().toISOString()}:row);return {...s,entries,pendingCount:entries.filter(row=>!row.claimedAt).length}});setNotice(a('Preview reward claimed.'));return;}
  if(id?.startsWith('event:'))await onEventClaim(id.slice(6));
  else if(id){const result=await claimInboxReward(id);const reason=result.blocked?result.message?.trim()||a('Make room in your inventory.'):null;
   setBlockedClaims(previous=>{const next={...previous};if(reason)next[id]=reason;else delete next[id];return next;});
   setNotice(reason??a('Reward claimed.'));}
  else{
   let claimed=0,blocked=0,result,pages=0;do{result=await claimAllInboxRewards();claimed+=result.claimed;blocked=result.blocked;pages++;}while(result.claimed>0&&result.claimed+result.blocked>=40&&pages<10);
   for(const row of eventRows){await onEventClaim(row.reward.id);claimed++;}
   setNotice(blocked?a('{count} claimed. Items needing inventory space remain safe in your inbox.',{count:claimed}):a('{count} rewards claimed.',{count:claimed})+(pages>=10?' '+a('More rewards may be waiting; tap Claim all again.'):''));
  }
  await onRefresh();await load();
 }catch(e){const message=e instanceof Error?e.message:a('Could not claim. Your rewards remain safe.');await load();setError(message);}finally{running.current=false;setBusy(false);}};

 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={[s.header,stackHeader&&s.headerStack]}>
    <View style={s.headCopy}>
      <View style={s.headTitle}><UiIcon name="rewards" size={26}/><Text accessibilityRole="header" style={s.heading}>{a('Rewards Inbox')}</Text></View>
      <Text style={s.sub}>{!history&&!marketTab&&pending>0?a('{count} rewards waiting',{count:pending}):a('Earned rewards and gifts stay safe here until claimed.')}</Text>
    </View>
    {!marketTab&&!history&&pending>0?<View style={[s.headerAction,stackHeader&&s.headerActionStack]}>
      <SocialActionButton primary label={a('Claim all')} busy={busy} disabled={loading||(!online&&!preview)} onPress={()=>run()}/>
    </View>:null}
  </View>
  <View accessibilityRole="tablist" style={s.tabs}>
    {[false,true].map(value=><Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{selected:history===value&&!marketTab,disabled:busy}} disabled={busy} onPress={()=>{const changed=history!==value;if(!marketTab&&!changed)return;if(!preview&&changed)setSnapshot(previous=>({...previous,entries:[],total:0}));setMarketTab(false);setHistory(value);setNotice('');setExpandedId(null);setBlockedClaims({});if(marketTab&&!changed)void load();}} style={[s.tab,history===value&&!marketTab&&s.tabActive]}>
      <Text style={[s.tabText,history===value&&!marketTab&&s.tabTextActive]}>{value?a('Claimed history'):a('Inbox')+(pending?' · '+pending:'')}</Text>
    </Pressable>)}
    {PLAYER_MARKET_RELEASED&&MARKET_AUTHENTICATED_SERVICE_READY?<Pressable accessibilityRole="tab" accessibilityLabel={a('Market')} accessibilityState={{selected:marketTab,disabled:busy}}
      disabled={busy} onPress={()=>{setMarketTab(true);setNotice('');setExpandedId(null);}}
      style={[s.tab,marketTab&&s.tabActive]}>
      <Text style={[s.tabText,marketTab&&s.tabTextActive]}>{a('Market')}</Text>
    </Pressable>:null}
  </View>
  {marketTab?<MarketInboxPanel state={state} online={online} onRefresh={onRefresh}/>:<>
  {!!error?<View accessibilityRole="alert" style={s.feedback}><Text style={s.warning}>{error}</Text><SocialActionButton label={a('Retry')} disabled={busy} onPress={()=>load()}/></View>:null}
  {!!notice?<Text accessibilityRole="alert" style={s.success}>{notice}</Text>:null}
  <View style={s.list}>
    {rows.map(row=>{
      const expanded=expandedId===row.id,available=row.attachments.slice(0,2),remaining=row.attachments.length-available.length,blockedReason=!row.claimedAt?blockedClaims[row.id]:undefined;
      return <View key={row.id} style={[s.card,!row.claimedAt&&s.cardPending,!!blockedReason&&s.cardBlocked]}>
        <View style={s.cardHead}>
          <View style={s.sourceIcon}><UiIcon name={row.source==='gift'?'rewards':row.source==='guild'?'guild':row.source==='event'?'events':'quests'} size={22}/></View>
          <View style={s.flex}><Text numberOfLines={2} style={s.cardTitle}>{row.title}</Text><Text numberOfLines={1} style={s.source}>{row.source==='gift'?a('GIFT FROM VELDRYN'):a('{source} REWARD',{source:row.source.toUpperCase()})}</Text></View>
          <Text numberOfLines={2} style={[s.status,row.claimedAt?s.claimed:blockedReason?s.blocked:s.pending]}>{row.claimedAt?a('CLAIMED'):blockedReason?a('CLAIM BLOCKED'):a('READY')}</Text>
        </View>
        <View style={[s.cardBody,stackActions&&s.cardBodyStack]}>
          <View style={s.preview}>
            {available.map((attachment,index)=><View key={attachment.resourceId+':'+index} accessible accessibilityRole="text" accessibilityLabel={attachment.name+' ×'+attachment.quantity.toLocaleString(language)} style={s.previewItem}><InboxArtwork attachment={attachment} size={26}/><Text numberOfLines={1} style={s.previewQuantity}>×{attachment.quantity.toLocaleString(language)}</Text></View>)}
            {remaining>0?<Text style={s.moreCount}>{a('+{count} more',{count:remaining})}</Text>:null}
            {!row.attachments.length?<Text style={s.sub}>{a('Reward details')}</Text>:null}
          </View>
          <View style={[s.actions,stackActions&&s.actionsStack]}>
            <Pressable accessibilityRole="button" accessibilityLabel={a('Reward details')+': '+row.title} accessibilityState={{expanded}} onPress={()=>setExpandedId(previous=>previous===row.id?null:row.id)} style={({pressed})=>[s.detailsButton,pressed&&s.pressed]}>
              <Text numberOfLines={1} style={s.detailsButtonText}>{a('Reward details')}</Text><Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text>
            </Pressable>
            {!row.claimedAt?<SocialActionButton label={a('Claim reward')} accessibilityLabel={a('Claim reward')+': '+row.title} disabled={busy||(!online&&!preview)} onPress={()=>run(row.id)}/>:null}
          </View>
        </View>
        {expanded?<View style={s.details}>
          {!!row.body?<Text style={s.body}>{row.body}</Text>:null}
          {row.attachments.map((attachment,index)=><View key={attachment.resourceId+':'+index} style={s.attachment}><InboxArtwork attachment={attachment}/><Text style={s.attachmentName}>{attachment.name}</Text><Text style={s.attachmentCount}>×{attachment.quantity.toLocaleString(language)}</Text></View>)}
        </View>:null}
        {blockedReason?<Text accessibilityRole="alert" style={s.warning}>{blockedReason}</Text>:null}
        {row.claimedAt?<Text style={s.claimedLabel}>✓ {a('Claimed')}{row.claimedAt!=='claimed'?' · '+new Date(row.claimedAt).toLocaleDateString(language):''}</Text>:null}
      </View>;
    })}
  </View>
  {loading?<LoadingState compact label={a('Loading rewards…')}/>:null}
  {!loading&&!rows.length&&!error?<View style={s.empty}><UiIcon name="rewards" size={42}/><Text style={s.emptyTitle}>{history?a('No claimed rewards yet'):a('You’re all caught up')}</Text><Text style={s.sub}>{history?a('Your reward history will appear here.'):a('New rewards will appear when earned.')}</Text></View>:null}
  {snapshot.entries.length<snapshot.total?<SocialActionButton label={a('Load more')} disabled={loading||busy} onPress={()=>load(true)}/>:null}
  </>}
 </ScrollView>;
}
function InboxArtwork({attachment:a,size=36}:{attachment:InboxAttachment;size?:number}){
 const eventId=a.resourceId.split(':candy:')[0],definition=liveEventDef(eventId),visuals=definition?liveEventVisuals(definition.visualKey):undefined;
 const source=a.kind==='candy'?visuals?.candyIcon:visuals?.rewardArt[a.resourceId];
 if(source)return <Image source={source} style={{width:size,height:size}} resizeMode="contain"/>;
 if(a.kind==='gold'||a.kind==='item')return <ResourceIcon resourceId={a.resourceId} size={size}/>;
 return <UiIcon name="events" size={size}/>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:10,maxWidth:640,width:'100%',alignSelf:'center',paddingBottom:110},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 headerStack:{alignItems:'stretch',flexDirection:'column'},
 headCopy:{flex:1,minWidth:0,gap:4},
 headTitle:{flexDirection:'row',alignItems:'center',gap:9},
 heading:{...typography.hero,color:C.text,flexShrink:1},
 sub:{...typography.caption,color:C.muted,lineHeight:18},
 headerAction:{flexShrink:0},
 headerActionStack:{alignSelf:'flex-end'},
 tabs:{flexDirection:'row',gap:7},
 tab:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:6},
 tabActive:{borderColor:C.accent,backgroundColor:C.accentSurface},
 tabText:{...typography.bodyStrong,color:C.muted,textAlign:'center'},
 tabTextActive:{color:C.text},
 flex:{flex:1,minWidth:0},
 feedback:{gap:8},
 warning:{...typography.caption,color:C.warning,lineHeight:18},
 success:{...typography.caption,color:C.good},
 list:{gap:8},
 card:{padding:10,gap:8,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},
 cardPending:{borderLeftWidth:3,borderLeftColor:C.accent},
 cardBlocked:{borderLeftColor:C.warning},
 cardHead:{flexDirection:'row',alignItems:'center',gap:9},
 sourceIcon:{width:36,height:36,backgroundColor:C.panel2,borderRadius:9,alignItems:'center',justifyContent:'center'},
 source:{fontSize:9,letterSpacing:.5,fontWeight:'900',color:C.accent,marginTop:3},
 cardTitle:{...typography.bodyStrong,color:C.text},
 status:{fontSize:10,fontWeight:'900',textAlign:'right',maxWidth:96,flexShrink:1},
 claimed:{color:C.good},pending:{color:C.accent},blocked:{color:C.warning},
 cardBody:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 cardBodyStack:{flexDirection:'column',alignItems:'stretch',gap:5},
 preview:{flexDirection:'row',flex:1,minWidth:0,alignItems:'center',flexWrap:'wrap',gap:5},
 previewItem:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:8,paddingVertical:3,paddingHorizontal:5},
 previewQuantity:{fontSize:11,color:C.text,fontWeight:'800',flexShrink:1},
 moreCount:{fontSize:11,color:C.muted,fontWeight:'800'},
 actions:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',flexWrap:'wrap',gap:6,minWidth:0},
 actionsStack:{alignSelf:'stretch',justifyContent:'flex-end'},
 detailsButton:{minHeight:44,minWidth:80,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:8,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 detailsButtonText:{...typography.caption,color:C.text,fontWeight:'800',flexShrink:1,textAlign:'center'},
 chevron:{fontSize:16,color:C.muted},
 details:{gap:8,borderTopWidth:1,borderTopColor:C.line,paddingTop:9},
 body:{...typography.caption,color:C.muted,lineHeight:19},
 attachment:{flexDirection:'row',alignItems:'center',gap:9,backgroundColor:C.panel2,borderRadius:9,padding:8},
 attachmentName:{...typography.body,color:C.text,flex:1,minWidth:0},
 attachmentCount:{...typography.bodyStrong,color:C.text},
 claimedLabel:{...typography.caption,color:C.good,textAlign:'right'},
 empty:{alignItems:'center',gap:8,paddingVertical:38},
 emptyTitle:{...typography.title,color:C.text},
 pressed:{opacity:.75}
});}
