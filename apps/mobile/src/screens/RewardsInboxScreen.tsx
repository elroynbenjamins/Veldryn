import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {eventInboxRewards} from '../core/live-events';
import {liveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {loadRewardInbox,claimInboxReward,claimAllInboxRewards,type InboxEntry,type InboxSnapshot,type InboxAttachment} from '../online/reward-inbox';
import {useGameTheme} from '../theme/ThemeContext';
import {accountText} from '../i18n/account';
import {SocialActionButton} from '../components/SocialActionButton';
import {ResourceIcon} from '../components/ResourceIcon';
import {UiIcon} from '../components/UiIcon';
import {LoadingState} from '../components/LoadingState';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';

export function RewardsInboxScreen({state,online,onRefresh,onEventClaim,preview}:{state:GameState;online:boolean;onRefresh:()=>Promise<unknown>;onEventClaim:(id:string)=>Promise<unknown>;preview?:InboxSnapshot}){
 const language=state.settings.language;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[expandedId,setExpandedId]=useState<string|null>(null),[history,setHistory]=useState(false),[snapshot,setSnapshot]=useState<InboxSnapshot>(preview??{entries:[],pendingCount:0,total:0}),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const running=useRef(false),generation=useRef(0);
 const load=useCallback(async(append=false)=>{const token=++generation.current;if(preview)return;if(!online){setError(a('Sign in to receive rewards and gifts.'));return;}setLoading(true);try{const next=await loadRewardInbox(history,append?snapshot.entries.length:0);if(token===generation.current){setSnapshot(previous=>({...next,entries:append?[...previous.entries,...next.entries]:next.entries}));setError('');}}catch(e){if(token===generation.current)setError(e instanceof Error?e.message:a('Inbox unavailable.'));}finally{if(token===generation.current)setLoading(false);}},[history,online,preview,snapshot.entries.length]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[history,online,preview]);
 const eventRows=eventInboxRewards(state).filter(row=>row.claimed===history);
 const eventEntries:InboxEntry[]=eventRows.map(row=>({id:'event:'+row.reward.id,source:'event',title:a('{name} milestone',{name:row.eventName}),body:a('Earned festival rewards remain yours after the event ends.'),attachments:[{kind:row.reward.kind,resourceId:row.reward.id,name:row.reward.name,quantity:row.reward.quantity??1}],createdAt:'',claimedAt:row.claimed?'claimed':null}));
 const rows=[...eventEntries,...(preview?snapshot.entries.filter(row=>!!row.claimedAt===history):snapshot.entries)],pending=snapshot.pendingCount+eventInboxRewards(state).filter(row=>!row.claimed).length;
 const run=async(id?:string)=>{if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');try{
  if(preview){setSnapshot(s=>{const entries=s.entries.map(row=>!id||row.id===id?{...row,claimedAt:new Date().toISOString()}:row);return {...s,entries,pendingCount:entries.filter(row=>!row.claimedAt).length}});setNotice(a('Preview reward claimed.'));return;}
  if(id?.startsWith('event:'))await onEventClaim(id.slice(6));
  else if(id){const result=await claimInboxReward(id);setNotice(result.blocked?result.message??a('Make room in your inventory.'):a('Reward claimed.'));}
  else{
   let claimed=0,blocked=0,result,pages=0;do{result=await claimAllInboxRewards();claimed+=result.claimed;blocked=result.blocked;pages++;}while(result.claimed>0&&result.claimed+result.blocked>=40&&pages<10);
   for(const row of eventRows){await onEventClaim(row.reward.id);claimed++;}
   setNotice(blocked?a('{count} claimed. Items needing inventory space remain safe in your inbox.',{count:claimed}):a('{count} rewards claimed.',{count:claimed})+(pages>=10?' '+a('More rewards may be waiting; tap Claim all again.'):''));
  }
  await onRefresh();await load();
 }catch(e){const message=e instanceof Error?e.message:a('Could not claim. Your rewards remain safe.');await load();setError(message);}finally{running.current=false;setBusy(false);}};

 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={s.header}>
    <View style={s.headTitle}><UiIcon name="rewards" size={26}/><Text accessibilityRole="header" style={s.heading}>{a('Rewards Inbox')}</Text></View>
    <Text style={s.sub}>{a('Earned rewards and gifts stay safe here until claimed.')}</Text>
  </View>
  <View accessibilityRole="tablist" style={s.tabs}>
    {[false,true].map(value=><Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{selected:history===value,disabled:busy}} disabled={busy} onPress={()=>{if(!preview)setSnapshot(previous=>({...previous,entries:[],total:0}));setHistory(value);setNotice('');setExpandedId(null);}} style={[s.tab,history===value&&s.tabActive]}>
      <Text style={[s.tabText,history===value&&s.tabTextActive]}>{value?a('Claimed history'):a('Inbox')+(pending?' · '+pending:'')}</Text>
    </Pressable>)}
  </View>
  {!history&&pending>0?<View style={s.bulkAction}><View style={s.flex}><Text style={s.bulkTitle}>{a('{count} rewards waiting',{count:pending})}</Text><Text style={s.sub}>{a('Claim everything that fits in your inventory.')}</Text></View><SocialActionButton primary label={a('Claim all')} busy={busy} disabled={!online&&!preview} onPress={()=>run()}/></View>:null}
  {!!error?<View accessibilityRole="alert" style={s.feedback}><Text style={s.warning}>{error}</Text><SocialActionButton label={a('Retry')} disabled={busy} onPress={()=>load()}/></View>:null}
  {!!notice?<Text accessibilityRole="alert" style={s.success}>{notice}</Text>:null}
  <View style={s.list}>
    {rows.map(row=>{
      const expanded=expandedId===row.id,available=row.attachments.slice(0,3),remaining=row.attachments.length-available.length;
      return <View key={row.id} style={[s.card,!row.claimedAt&&s.cardPending]}>
        <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={row.title} onPress={()=>setExpandedId(previous=>previous===row.id?null:row.id)} style={({pressed})=>[s.cardHead,pressed&&s.pressed]}>
          <View style={s.sourceIcon}><UiIcon name={row.source==='gift'?'rewards':row.source==='guild'?'guild':row.source==='event'?'events':'quests'} size={24}/></View>
          <View style={s.flex}><Text style={s.source}>{row.source==='gift'?a('GIFT FROM VELDRYN'):a('{source} REWARD',{source:row.source.toUpperCase()})}</Text><Text numberOfLines={2} style={s.cardTitle}>{row.title}</Text></View>
          <View style={s.cardStatus}><Text style={[s.status,row.claimedAt?s.claimed:s.pending]}>{row.claimedAt?a('CLAIMED'):a('READY')}</Text><Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text></View>
        </Pressable>
        <View style={s.preview}>{available.map((a,index)=><View key={a.resourceId+':'+index} style={s.previewItem}><InboxArtwork attachment={a}/><Text style={s.previewQuantity}>×{a.quantity.toLocaleString()}</Text></View>)}{remaining>0?<Text style={s.moreCount}>{a('+{count} more',{count:remaining})}</Text>:null}{!row.attachments.length?<Text style={s.sub}>{a('Reward details')}</Text>:null}</View>
        {expanded?<View style={s.details}>
          {!!row.body?<Text style={s.body}>{row.body}</Text>:null}
          {row.attachments.map((a,index)=><View key={a.resourceId+':'+index} style={s.attachment}><InboxArtwork attachment={a}/><Text style={s.attachmentName}>{a.name}</Text><Text style={s.attachmentCount}>×{a.quantity.toLocaleString()}</Text></View>)}
        </View>:null}
        <View style={s.cardFooter}>
          {row.claimedAt?<Text style={s.claimedLabel}>✓ {a('Claimed')}{row.claimedAt!=='claimed'?' · '+new Date(row.claimedAt).toLocaleDateString(language):''}</Text>:<SocialActionButton label={a('Claim reward')} disabled={busy||(!online&&!preview)} onPress={()=>run(row.id)}/>}
        </View>
      </View>;
    })}
  </View>
  {loading?<LoadingState compact label={a('Loading rewards…')}/>:null}
  {!loading&&!rows.length&&!error?<View style={s.empty}><UiIcon name="rewards" size={42}/><Text style={s.emptyTitle}>{history?a('No claimed rewards yet'):a('You’re all caught up')}</Text><Text style={s.sub}>{history?a('Your reward history will appear here.'):a('New rewards will appear when earned.')}</Text></View>:null}
  {snapshot.entries.length<snapshot.total?<SocialActionButton label={a('Load more')} disabled={loading||busy} onPress={()=>load(true)}/>:null}
 </ScrollView>;
}
function InboxArtwork({attachment:a}:{attachment:InboxAttachment}){
 const eventId=a.resourceId.split(':candy:')[0],definition=liveEventDef(eventId),visuals=definition?liveEventVisuals(definition.visualKey):undefined;
 const source=a.kind==='candy'?visuals?.candyIcon:visuals?.rewardArt[a.resourceId];
 if(source)return <Image source={source} style={{width:38,height:38}} resizeMode="contain"/>;
 if(a.kind==='gold'||a.kind==='item')return <ResourceIcon resourceId={a.resourceId} size={36}/>;
 return <UiIcon name="events" size={32}/>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:spacing.md,maxWidth:640,width:'100%',alignSelf:'center',paddingBottom:110},
 header:{gap:5},headTitle:{flexDirection:'row',alignItems:'center',gap:10},heading:{...typography.hero,color:C.text},sub:{...typography.caption,color:C.muted,lineHeight:18},
 tabs:{flexDirection:'row',gap:7},tab:{flex:1,minHeight:46,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,paddingHorizontal:6},tabActive:{borderColor:C.accent,backgroundColor:C.accentSurface},tabText:{...typography.bodyStrong,color:C.muted,textAlign:'center'},tabTextActive:{color:C.text},
 flex:{flex:1,minWidth:0},bulkAction:{borderWidth:1,borderColor:C.good,borderRadius:radii.lg,padding:12,backgroundColor:C.goodSurface,gap:8},bulkTitle:{...typography.bodyStrong,color:C.text},
 feedback:{gap:8},warning:{...typography.caption,color:C.warning},success:{...typography.caption,color:C.good},
 list:{gap:9},card:{padding:12,gap:10,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},cardPending:{borderLeftWidth:3,borderLeftColor:C.accent},
 cardHead:{flexDirection:'row',alignItems:'center',gap:9,minHeight:47},sourceIcon:{width:40,height:40,backgroundColor:C.panel2,borderRadius:10,alignItems:'center',justifyContent:'center'},source:{fontSize:9,letterSpacing:.7,fontWeight:'900',color:C.accent},cardTitle:{...typography.bodyStrong,color:C.text,marginTop:3},cardStatus:{alignItems:'flex-end',gap:3},status:{fontSize:10,fontWeight:'900'},claimed:{color:C.good},pending:{color:C.accent},chevron:{fontSize:16,color:C.muted},
 preview:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7},previewItem:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:8,padding:5},previewQuantity:{fontSize:11,color:C.text,fontWeight:'800'},moreCount:{fontSize:11,color:C.muted,fontWeight:'800'},
 details:{gap:8,borderTopWidth:1,borderTopColor:C.line,paddingTop:10},body:{...typography.caption,color:C.muted,lineHeight:19},attachment:{flexDirection:'row',alignItems:'center',gap:9,backgroundColor:C.panel2,borderRadius:9,padding:8},attachmentName:{...typography.body,color:C.text,flex:1,minWidth:0},attachmentCount:{...typography.bodyStrong,color:C.text},
 cardFooter:{alignSelf:'flex-end'},claimedLabel:{...typography.caption,color:C.good},empty:{alignItems:'center',gap:8,paddingVertical:38},emptyTitle:{...typography.title,color:C.text},pressed:{opacity:.75}
});}
