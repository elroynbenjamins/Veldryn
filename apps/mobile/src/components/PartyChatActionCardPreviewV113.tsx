import {useMemo} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {partyChatPreviewPresentationV113,partyChatPreviewIntentV113,partyChatPreviewVotePercentV113,
 type PartyChatPreviewAction,type PartyChatPreviewCardV113,type PartyChatPreviewIntentV113,
 type PartyChatPreviewRole,type PartyChatPreviewStatus} from '../core/party-chat-card-preview-v113';

/** Unmounted developer-preview component. No provider, RPC, navigation or
 * production action wiring. All supplied labels can be translated by host. */
export interface PartyChatCardLabelsV113{
 readonly roles:Readonly<Record<PartyChatPreviewRole,string>>;
 readonly statuses:Readonly<Record<PartyChatPreviewStatus,string>>;
 readonly actions:Readonly<Record<PartyChatPreviewAction,string>>;
 readonly accepted:string;readonly awaiting:string;readonly ready:string;readonly notReady:string;
 readonly expiresIn:(seconds:number)=>string;
 readonly votes:(votes:number,eligible:number)=>string;
 readonly confirmations:(accepted:number,total:number)=>string;
}
export function PartyChatActionCardPreviewV113({card,labels,nowMs,qaPreview=false,onPreviewIntent,busy=false}:{
 card:PartyChatPreviewCardV113;labels:PartyChatCardLabelsV113;nowMs:number;
 qaPreview?:boolean;onPreviewIntent?:(intent:PartyChatPreviewIntentV113)=>void;busy?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const narrow=width<360||fontScale>1.2;
 const view=partyChatPreviewPresentationV113(card,nowMs,qaPreview);
 const enabled=view.canPreviewRespond&&!!onPreviewIntent&&!busy;
 const respond=(action:PartyChatPreviewAction,optionId?:string)=>{
  if(!enabled)return;
  const intent=partyChatPreviewIntentV113(card,nowMs,action,optionId,qaPreview);
  if(intent)onPreviewIntent?.(intent);
 };
 if(view.collapsed)return <View style={[s.card,s.collapsed]}>
  <Text style={s.summary}>✦ {card.summary}</Text>
  {view.status!=='announcement'&&<Text style={s.meta}>{labels.statuses[view.status]}</Text>}
 </View>;
 const vote=card.kind==='contract_vote'||card.kind==='event_vote'?card:null;
 return <View style={s.card}>
  <View style={s.header}>
   <Text style={s.title}>✦ {card.title}</Text>
   <Text style={s.meta}>{labels.expiresIn(view.remainingSeconds)}</Text>
  </View>
  <Text style={s.summary}>{card.summary}</Text>
  {card.kind==='role_swap'&&<>
   {card.members.map(member=><View key={member.id} style={s.memberRow}>
    <View style={s.memberText}>
     <Text style={s.name}>{member.name}</Text>
     <Text style={s.meta}>{labels.roles[member.fromRole]} → {labels.roles[member.toRole]}</Text>
    </View>
    <Text style={[s.status,{color:member.accepted?C.good:C.muted}]}>{member.accepted?labels.accepted:labels.awaiting}</Text>
   </View>)}
   <Text style={s.meta}>{labels.confirmations(card.members.filter(m=>m.accepted).length,card.members.length)}</Text>
  </>}
  {vote&&vote.options.map(option=><View key={option.id} style={s.option}>
   <View style={s.header}>
    <Text style={s.name}>{option.label}</Text>
    <Text style={s.meta}>{labels.votes(option.votes,vote.eligibleCount)}</Text>
   </View>
   <View style={s.track}><View style={[s.fill,{width:partyChatPreviewVotePercentV113(option.votes,vote.eligibleCount)+'%' as `${number}%`}]}/></View>
   {view.actions.includes('vote')&&<GameButton compact tone="secondary" title={labels.actions.vote}
    accessibilityLabel={labels.actions.vote+' — '+option.label} disabled={!enabled||!!vote.myVote}
    selected={vote.myVote===option.id} onPress={()=>respond('vote',option.id)}/>}
  </View>)}
  {card.kind==='group_readiness'&&<>
   {card.members.map(member=><View key={member.id} style={s.memberRow}>
    <Text style={s.name}>{member.name}</Text>
    <Text style={[s.status,{color:member.ready===true?C.good:member.ready===false?C.bad:C.muted}]}>
     {member.ready===true?labels.ready:member.ready===false?labels.notReady:labels.awaiting}
    </Text>
   </View>)}
   <Text style={s.meta}>{labels.confirmations(card.members.filter(m=>m.ready===true).length,card.members.length)}</Text>
  </>}
  {card.kind==='recruitment_request'&&!!card.applicantName&&<Text style={s.name}>{card.applicantName}</Text>}
  {!vote&&view.actions.length>0&&<View style={[s.actions,narrow&&s.stacked]}>
   {view.actions.map(action=><GameButton key={action} compact title={labels.actions[action]}
    tone={action==='decline'||action==='not_ready'?'secondary':'primary'} disabled={!enabled}
    style={narrow?s.fullButton:s.halfButton} onPress={()=>respond(action)}/>)}
  </View>}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 card:{backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderLeftColor:C.warning,borderLeftWidth:2,
  borderRadius:radii.sm,padding:spacing.sm,gap:spacing.xs,minWidth:0,marginVertical:2},
 collapsed:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},
 header:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.xs},
 title:{...typography.bodyStrong,color:C.warning,flexGrow:1,flexShrink:1,minWidth:100},
 summary:{...typography.caption,color:C.text,flexShrink:1},
 meta:{...typography.caption,color:C.muted,flexShrink:1},
 memberRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.xs},
 memberText:{flex:1,minWidth:90},
 name:{...typography.bodyStrong,color:C.text,flexShrink:1,flexGrow:1},
 status:{...typography.caption,flexShrink:1},
 option:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,padding:spacing.xs,gap:spacing.xs},
 track:{height:4,backgroundColor:C.line,borderRadius:2,overflow:'hidden'},
 fill:{height:4,backgroundColor:C.warning,borderRadius:2},
 actions:{flexDirection:'row',gap:spacing.xs},
 stacked:{flexDirection:'column'},
 halfButton:{flex:1,minWidth:0},fullButton:{width:'100%'},
 });}
