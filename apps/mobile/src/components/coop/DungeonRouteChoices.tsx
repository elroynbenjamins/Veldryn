import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopMode,CoopRouteOptionView} from '../../core/coop-presentation';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {CoopImageSlot} from './CoopVisualKit';
import {IdentityArtwork} from '../SocialIdentity';
import {dungeonRoomPresentation} from './dungeon-room-presentation';

/**
 * One decision per room card. The whole card is the Choose/Vote target;
 * the existing server-authoritative onChoose callback remains unchanged.
 */
export function DungeonRouteChoices({options,mode,phase,busy=false,onChoose,myVotedNodeId,selfVoter}:{
 options:CoopRouteOptionView[];mode:CoopMode;phase:string;busy?:boolean;onChoose?:(nodeId:string)=>void;myVotedNodeId?:string;selfVoter?:{name:string;profileIconId?:string|null;className?:string|null};
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),canChoose=Boolean(onChoose)&&phase==='awaiting_choice'&&!busy;
 const action=mode==='qmode'?st('Choose room'):st('Vote');
 const live=mode==='live',totalVotes=live?options.reduce((total,option)=>total+(option.votes??0),0):0;
 return <View style={s.list}>
  {options.map((option,index)=>{
   const canPress=canChoose&&!option.hidden;
   const votedHere=live&&myVotedNodeId===option.nodeId;
   const room=dungeonRoomPresentation(option.kind);
   const preview=option.encounterPreview?.summary??(room?st(room.description):undefined);
   const riskBaseline=/^risk\\s+1(?:\\.0+)?$/i.test(option.risk.trim());
   const redundantReward=option.reward.trim().toLowerCase().replace(/[\\s_-]+/g,'')===option.kind.trim().toLowerCase().replace(/[\\s_-]+/g,'');
   return <Pressable
    key={option.nodeId}
    accessibilityRole="button"
    accessibilityLabel={`${option.title}. ${option.risk}. ${option.reward}. ${live?`${option.votes??0} of ${totalVotes} votes. `:''}${votedHere?'Your vote. ':''}${canPress?action:st('Unavailable')}`}
    accessibilityState={{disabled:!canPress}}
    disabled={!canPress}
    onPress={()=>onChoose?.(option.nodeId)}
    style={({pressed})=>[s.card,option.kind==='boss'&&s.bossCard,votedHere&&s.myChoice,option.hidden&&s.hiddenCard,pressed&&canPress&&s.pressed]}
   >
    <CoopImageSlot assetId={room?.art??'node_event'} size="thumbnail" accessibilityLabel={option.title}/>
    <View style={s.content}>
     <View style={s.heading}>
      <Text style={s.title} numberOfLines={2}>{option.title}</Text>
      <Text style={s.roomNumber}>{String(index+1).padStart(2,'0')}</Text>
     </View>
     {(!riskBaseline||!redundantReward)?<View style={s.tags}>
      {!riskBaseline?<View style={s.riskTag}><Text style={s.riskText} numberOfLines={1}>{option.risk}</Text></View>:null}
      {!redundantReward?<View style={s.rewardTag}><Text style={s.rewardText} numberOfLines={1}>{option.reward}</Text></View>:null}
     </View>:null}
     {preview?<Text numberOfLines={2} style={s.preview}>{preview}</Text>:null}
     <View style={s.footer}>
      {live?<View style={s.voteLine}>
       <Text style={s.votes}>{option.votes??0}/4 {st('votes')}</Text>
       {votedHere&&selfVoter?<View style={s.myVote}><IdentityArtwork name={selfVoter.name} profileIconId={selfVoter.profileIconId} className={selfVoter.className} size={22}/><Text style={s.myVoteText}>{st('You')}</Text></View>:null}
      </View>:<View style={s.grow}/>}
      <View style={[s.action,!canPress&&s.actionDisabled]}>
       <Text style={[s.actionText,!canPress&&s.actionTextDisabled]}>{votedHere?st('Your vote'):canPress?action:st('Awaiting choice')}</Text>
       <Text style={[s.chevron,!canPress&&s.actionTextDisabled]}>›</Text>
      </View>
     </View>
    </View>
   </Pressable>;
  })}
 </View>;
}
function makeStyles(C:CoopColors){return StyleSheet.create({
 list:{gap:8},
 card:{minHeight:88,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.surface,overflow:'hidden'},
 bossCard:{borderColor:C.goldDim},myChoice:{borderColor:C.cyan,borderWidth:2,backgroundColor:C.selection},
 hiddenCard:{opacity:.6},
 pressed:{backgroundColor:C.surfaceRaised},
 content:{flex:1,minWidth:0,justifyContent:'center',gap:4},
 heading:{flexDirection:'row',alignItems:'center',gap:6},
 title:{flex:1,minWidth:0,fontSize:16,lineHeight:21,color:C.text,fontWeight:'800'},
 roomNumber:{fontSize:10,lineHeight:14,color:C.textMuted,fontWeight:'700'},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:5},
 riskTag:{borderRadius:5,paddingHorizontal:6,paddingVertical:2,backgroundColor:C.surfaceRaised,maxWidth:'100%'},
 riskText:{fontSize:11,lineHeight:15,color:C.danger,fontWeight:'700'},
 rewardTag:{borderRadius:5,paddingHorizontal:6,paddingVertical:2,backgroundColor:C.surfaceRaised,maxWidth:'100%'},
 rewardText:{fontSize:11,lineHeight:15,color:C.gold,fontWeight:'700'},
 preview:{fontSize:12,lineHeight:16,color:C.textMuted},
 footer:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:6},
 grow:{flex:1},voteLine:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},myVote:{flexDirection:'row',alignItems:'center',gap:4},myVoteText:{fontSize:11,lineHeight:16,color:C.cyan,fontWeight:'700'},
 votes:{fontSize:12,lineHeight:17,color:C.cyan,fontWeight:'800',flex:1},
 action:{flexDirection:'row',alignItems:'center',gap:5,minHeight:24},
 actionDisabled:{opacity:.55},
 actionText:{fontSize:12,lineHeight:18,color:C.gold,fontWeight:'800'},
 actionTextDisabled:{color:C.textMuted},
 chevron:{fontSize:19,lineHeight:22,color:C.gold,fontWeight:'700'},
 });}
