import {useCallback,useEffect,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {eventInboxRewards} from '../core/live-events';
import {liveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {loadRewardInbox,claimInboxReward,claimAllInboxRewards,type InboxEntry,type InboxSnapshot,type InboxAttachment} from '../online/reward-inbox';
import {useGameTheme} from '../theme/ThemeContext';
import {SocialActionButton} from '../components/SocialActionButton';
import {ResourceIcon} from '../components/ResourceIcon';
import {UiIcon} from '../components/UiIcon';

export function RewardsInboxScreen({state,online,onRefresh,onEventClaim,preview}:{state:GameState;online:boolean;onRefresh:()=>Promise<unknown>;onEventClaim:(id:string)=>Promise<unknown>;preview?:InboxSnapshot}){
 const C=useGameTheme(),[history,setHistory]=useState(false),[snapshot,setSnapshot]=useState<InboxSnapshot>(preview??{entries:[],pendingCount:0,total:0}),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const running=useRef(false),generation=useRef(0);
 const load=useCallback(async(append=false)=>{const token=++generation.current;if(preview)return;if(!online){setError('Sign in to receive rewards and gifts.');return;}setLoading(true);try{const next=await loadRewardInbox(history,append?snapshot.entries.length:0);if(token===generation.current){setSnapshot(previous=>({...next,entries:append?[...previous.entries,...next.entries]:next.entries}));setError('');}}catch(e){if(token===generation.current)setError(e instanceof Error?e.message:'Inbox unavailable.');}finally{if(token===generation.current)setLoading(false);}},[history,online,preview,snapshot.entries.length]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[history,online,preview]);
 const eventRows=eventInboxRewards(state).filter(row=>row.claimed===history);
 const eventEntries:InboxEntry[]=eventRows.map(row=>({id:'event:'+row.reward.id,source:'event',title:row.eventName+' milestone',body:'Earned festival rewards remain yours after the event ends.',attachments:[{kind:row.reward.kind,resourceId:row.reward.id,name:row.reward.name,quantity:row.reward.quantity??1}],createdAt:'',claimedAt:row.claimed?'claimed':null}));
 const rows=[...eventEntries,...(preview?snapshot.entries.filter(row=>!!row.claimedAt===history):snapshot.entries)],pending=snapshot.pendingCount+eventInboxRewards(state).filter(row=>!row.claimed).length;
 const run=async(id?:string)=>{if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');try{
  if(preview){setSnapshot(s=>{const entries=s.entries.map(row=>!id||row.id===id?{...row,claimedAt:new Date().toISOString()}:row);return {...s,entries,pendingCount:entries.filter(row=>!row.claimedAt).length}});setNotice('Preview reward claimed.');return;}
  if(id?.startsWith('event:'))await onEventClaim(id.slice(6));
  else if(id){const result=await claimInboxReward(id);setNotice(result.blocked?result.message??'Make room in your inventory.':'Reward claimed.');}
  else{
   let claimed=0,blocked=0,result;do{result=await claimAllInboxRewards();claimed+=result.claimed;blocked=result.blocked;}while(result.claimed>0&&result.claimed+result.blocked>=40);
   for(const row of eventRows){await onEventClaim(row.reward.id);claimed++;}
   setNotice(blocked?`${claimed} claimed. Items needing inventory space remain safe in your inbox.`:`${claimed} rewards claimed.`);
  }
  await onRefresh();await load();
 }catch(e){const message=e instanceof Error?e.message:'Could not claim. Your rewards remain safe.';await load();setError(message);}finally{running.current=false;setBusy(false);}};
 return <ScrollView contentContainerStyle={{padding:18,gap:18,maxWidth:620,width:'100%',alignSelf:'center',paddingBottom:32}}>
  <View style={{gap:7}}><UiIcon name="rewards" size={32}/><Text style={{fontSize:11,letterSpacing:1.6,color:C.good}}>YOUR REWARDS</Text><Text accessibilityRole="header" style={{fontSize:30,lineHeight:36,fontWeight:'600',color:C.text}}>A little something for you.</Text><Text style={{fontSize:14,lineHeight:21,color:C.muted}}>Earned rewards and gifts, kept safe until you claim them.</Text></View>
  <View style={{flexDirection:'row',gap:8}}>{[false,true].map(value=><Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{selected:history===value,disabled:busy}} disabled={busy} onPress={()=>{if(!preview)setSnapshot({entries:[],pendingCount:snapshot.pendingCount,total:0});setHistory(value);setNotice('');}} style={{flex:1,minHeight:46,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:history===value?C.goodSurface:C.panel}}><Text style={{fontSize:14,color:history===value?C.good:C.muted}}>{value?'Claimed history':`Inbox${pending?' · '+pending:''}`}</Text></Pressable>)}</View>
  {!history&&pending>0&&<SocialActionButton primary label="Claim all" busy={busy} disabled={!online&&!preview} onPress={()=>void run()}/>}
  {!!error&&<View accessibilityRole="alert" style={{gap:8}}><Text style={{color:C.warning,fontSize:13}}>{error}</Text><SocialActionButton label="Retry" disabled={busy} onPress={()=>void load()}/></View>}
  {!!notice&&<Text accessibilityRole="alert" style={{color:C.good,fontSize:13,lineHeight:20}}>{notice}</Text>}
  {rows.map(row=><View key={row.id} style={{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:16,padding:16,gap:13}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><UiIcon name={row.source==='gift'?'rewards':row.source==='guild'?'guild':'quests'} size={30}/><View style={{flex:1,gap:4}}><Text style={{fontSize:10,letterSpacing:1,color:C.good}}>{row.source==='gift'?'A GIFT FROM VELDRYN':row.source.toUpperCase()+' REWARD'}</Text><Text style={{fontSize:18,lineHeight:24,color:C.text,fontWeight:'600'}}>{row.title}</Text></View></View>
   {!!row.body&&<Text style={{color:C.muted,fontSize:13,lineHeight:20}}>{row.body}</Text>}
   <View style={{gap:8}}>{row.attachments.map(a=><View key={a.resourceId} style={{flexDirection:'row',alignItems:'center',gap:12,padding:11,borderRadius:10,backgroundColor:C.panel2}}><InboxArtwork attachment={a}/><Text style={{flex:1,color:C.text,fontSize:14}}>{a.name}</Text><Text style={{color:C.text,fontWeight:'600',fontSize:16}}>{a.quantity.toLocaleString()}</Text></View>)}</View>
   {row.claimedAt?<Text style={{fontSize:12,color:C.good}}>✓ Claimed{row.claimedAt!=='claimed'?' · '+new Date(row.claimedAt).toLocaleDateString():''}</Text>:<SocialActionButton label="Claim reward" disabled={busy||(!online&&!preview)} onPress={()=>void run(row.id)}/>}
  </View>)}
  {loading&&<Text style={{color:C.muted}}>Loading rewards…</Text>}
  {!loading&&!rows.length&&!error&&<View style={{paddingVertical:36,alignItems:'center',gap:12}}><UiIcon name="rewards" size={48}/><Text style={{fontSize:20,color:C.text}}>{history?'Your claimed rewards will appear here.':'You’re all caught up.'}</Text><Text style={{color:C.muted,textAlign:'center',lineHeight:21}}>Only earned rewards appear here. No need to rush before a reset.</Text></View>}
  {snapshot.entries.length<snapshot.total&&<SocialActionButton label="Load more" disabled={loading||busy} onPress={()=>void load(true)}/>}
 </ScrollView>;
}
function InboxArtwork({attachment:a}:{attachment:InboxAttachment}){
 const eventId=a.resourceId.split(':candy:')[0],definition=liveEventDef(eventId),visuals=definition?liveEventVisuals(definition.visualKey):undefined;
 const source=a.kind==='candy'?visuals?.candyIcon:visuals?.rewardArt[a.resourceId];
 if(source)return <Image source={source} style={{width:38,height:38}} resizeMode="contain"/>;
 if(a.kind==='gold'||a.kind==='item')return <ResourceIcon resourceId={a.resourceId} size={36}/>;
 return <UiIcon name="events" size={32}/>;
}
