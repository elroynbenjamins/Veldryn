import {useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {PartyChatActionCardPreviewV113,type PartyChatCardLabelsV113} from './PartyChatActionCardPreviewV113';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,radii,type ThemeColors} from '../theme/theme';
import type {PartyActiveRequestsPreviewV115} from '../core/party-chat-active-requests-preview-v115';
type Model=ReturnType<PartyActiveRequestsPreviewV115['view']>;
type Intent=NonNullable<ReturnType<PartyActiveRequestsPreviewV115['intent']>>;
export interface PartyActiveRequestLabelsV115{
 readonly title:string;readonly empty:string;readonly refreshing:string;
 readonly show:string;readonly hide:string;
 readonly count:(needsResponse:number,waiting:number)=>string;
}
/** Unmounted local preview. The host resolves current intent using V115
 * at tap time. Never sends a mutation or guesses that a request completed. */
export function PartyActiveRequestsPanelPreviewV115({model,labels,cardLabels,onResolvePreviewIntent,onPreviewIntent,qaPreview=false}:{
 model:Model;labels:PartyActiveRequestLabelsV115;cardLabels:PartyChatCardLabelsV113;
 onResolvePreviewIntent?:(cardId:string,action:Intent['action'],optionId?:string)=>Intent|null;
 onPreviewIntent?:(intent:Intent)=>void;qaPreview?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [open,setOpen]=useState(false);
 const enabled=qaPreview&&model.fresh&&!!onResolvePreviewIntent&&!!onPreviewIntent;
 return <View style={s.panel}>
  <View style={s.heading}>
   <View style={s.headingText}>
    <Text style={s.title}>{labels.title}</Text>
    <Text style={s.meta}>{model.fresh?labels.count(model.needsResponse,model.waiting):labels.refreshing}</Text>
   </View>
   <GameButton compact tone="secondary" title={open?labels.hide:labels.show} onPress={()=>setOpen(previous=>!previous)}/>
  </View>
  {open&&(!model.fresh?<Text style={s.meta}>{labels.refreshing}</Text>:
   model.requests.length===0?<Text style={s.meta}>{labels.empty}</Text>:
   model.requests.map(row=><PartyChatActionCardPreviewV113 key={row.card.id} card={row.card} labels={cardLabels}
    nowMs={model.serverNowMs} qaPreview={enabled} onPreviewIntent={request=>{
     if(!enabled)return;
     const intent=onResolvePreviewIntent?.(request.cardId,request.action,request.optionId);
     if(intent&&intent.partyId===request.partyId&&intent.messageId===request.messageId&&
      intent.rosterRevision===model.rosterRevision&&intent.sourceRevision===row.sourceRevision)
      onPreviewIntent?.(intent);
    }}/>))}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 panel:{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:radii.sm,padding:spacing.sm,gap:spacing.xs,minWidth:0},
 heading:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},
 headingText:{flex:1,minWidth:110},title:{...typography.bodyStrong,color:C.warning},
 meta:{...typography.caption,color:C.muted,flexShrink:1},
 });}
