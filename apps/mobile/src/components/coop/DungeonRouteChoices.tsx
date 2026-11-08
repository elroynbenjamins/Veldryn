import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopMode,CoopRouteOptionView} from '../../core/coop-presentation';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useDungeonDynamicUiText} from '../../i18n/dungeon-dynamic-ui';
import {localizedDungeonEncounterPreview} from '../../i18n/dungeon-encounter-preview';
import {seasonalDungeonRoomTitle} from '../../i18n/seasonal-dungeon-copy';
import {localizedSeasonalDungeonRouteRisk,localizedSeasonalDungeonRouteReward} from '../../i18n/seasonal-dungeon-effects';
import {CoopImageSlot} from './CoopVisualKit';
import {IdentityArtwork} from '../SocialIdentity';
import {dungeonRoomPresentation} from './dungeon-room-presentation';
import {localizedDungeonRoomModifier} from '../../i18n/dungeon-room-modifiers';

/**
 * One decision per room card. The whole card is the Choose/Vote target;
 * the existing server-authoritative onChoose callback remains unchanged.
 */
export function DungeonRouteChoices({options,mode,phase,busy=false,onChoose,myVotedNodeId,selfVoter}:{
 options:CoopRouteOptionView[];mode:CoopMode;phase:string;busy?:boolean;onChoose?:(nodeId:string)=>void;myVotedNodeId?:string;selfVoter?:{name:string;profileIconId?:string|null;className?:string|null};
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),ui=useDungeonDynamicUiText(),language=useGameLanguage(),canChoose=Boolean(onChoose)&&phase==='awaiting_choice'&&!busy;
 const action=mode==='qmode'?ui('Choose room'):ui('Vote');
 const live=mode==='live',totalVotes=live?options.reduce((total,option)=>total+(option.votes??0),0):0;
 return <View style={s.list}>
  {options.map(option=>{
   const canPress=canChoose&&!option.hidden;
   const votedHere=live&&myVotedNodeId===option.nodeId;
   const room=dungeonRoomPresentation(option.kind);
   const title=room&&(option.title.trim().toLowerCase()===option.kind.trim().toLowerCase()||(option.kind==='boss'&&option.title.trim().toLowerCase()==='final boss'))?st(room.name):seasonalDungeonRoomTitle(language,option.title);
   const preview=option.encounterPreview?localizedDungeonEncounterPreview(language,option.encounterPreview).summary:(room?st(room.description):undefined);
   const modifier=option.kind==='battle'||option.kind==='elite'?localizedDungeonRoomModifier(language,option.modifierId):undefined;
   const riskBaseline=/^risk\s+1(?:\.0+)?$/i.test(option.risk.trim());
   const redundantReward=option.reward.trim().toLowerCase().replace(/[\s_-]+/g,'')===option.kind.trim().toLowerCase().replace(/[\s_-]+/g,'');
   const translatedRisk=localizedSeasonalDungeonRouteRisk(language,option.risk);
   const translatedReward=localizedSeasonalDungeonRouteReward(language,option.reward);
   return <Pressable
    key={option.nodeId}
    accessibilityRole="button"
    accessibilityLabel={ui('Route {title}: {risk}; {reward}. {extra}{action}',{title,risk:translatedRisk,reward:translatedReward,extra:live?ui('{votes} of {total} votes. ',{votes:option.votes??0,total:totalVotes})+(votedHere?ui('Your vote. '):''):'',action:canPress?action:ui('Unavailable')})}
    accessibilityHint={[modifier?.description,preview].filter(Boolean).join(' · ')}
    accessibilityState={{disabled:!canPress,selected:votedHere}}
    disabled={!canPress}
    onPress={()=>onChoose?.(option.nodeId)}
    style={({pressed})=>[s.card,option.kind==='boss'&&s.bossCard,votedHere&&s.myChoice,option.hidden&&s.hiddenCard,pressed&&canPress&&s.pressed]}
   >
    <CoopImageSlot assetId={room?.art??'node_event'} size="node" accessibilityLabel={title}/>
    <View style={s.content}>
     <View style={s.heading}>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      {live?<View style={s.voteLine}>
       <Text style={s.votes}>{ui('{votes}/4 votes',{votes:option.votes??0})}</Text>
       {votedHere&&selfVoter?<View style={s.myVote}><IdentityArtwork name={selfVoter.name} profileIconId={selfVoter.profileIconId} className={selfVoter.className} size={18}/></View>:null}
      </View>:null}
      <Text style={s.chevron}>{'›'}</Text>
     </View>
     {preview?<Text numberOfLines={1} style={s.preview}>{preview}</Text>:null}
     {(!riskBaseline||!redundantReward||modifier)?<View style={s.tags}>
      {modifier?<View style={s.modifierTag}><Text style={s.modifierText} numberOfLines={1}>{modifier.label}</Text></View>:null}
      {!riskBaseline?<View style={s.riskTag}><Text style={s.riskText} numberOfLines={1}>{translatedRisk}</Text></View>:null}
      {!redundantReward?<View style={s.rewardTag}><Text style={s.rewardText} numberOfLines={1}>{translatedReward}</Text></View>:null}
     </View>:null}
    </View>
   </Pressable>;
  })}
 </View>;
}
function makeStyles(C:CoopColors){return StyleSheet.create({
 list:{gap:6},
 card:{minHeight:62,flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:9,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.surface,overflow:'hidden'},
 bossCard:{borderColor:C.goldDim},myChoice:{borderColor:C.cyan,borderWidth:2,backgroundColor:C.selection},
 hiddenCard:{opacity:.6},
 pressed:{backgroundColor:C.surfaceRaised},
 content:{flex:1,minWidth:0,justifyContent:'center',gap:2},
 heading:{flexDirection:'row',alignItems:'center',gap:6,minHeight:19},
 title:{flex:1,minWidth:0,fontSize:14,lineHeight:19,color:C.text,fontWeight:'800'},
 tags:{flexDirection:'row',alignItems:'center',gap:5},
 modifierTag:{borderRadius:4,paddingHorizontal:5,paddingVertical:1,backgroundColor:C.surfaceRaised,maxWidth:'48%'},
 modifierText:{fontSize:10,lineHeight:13,color:C.cyan,fontWeight:'800'},
 riskTag:{borderRadius:4,paddingHorizontal:5,paddingVertical:1,backgroundColor:C.surfaceRaised,maxWidth:'48%'},
 riskText:{fontSize:10,lineHeight:13,color:C.danger,fontWeight:'700'},
 rewardTag:{borderRadius:4,paddingHorizontal:5,paddingVertical:1,backgroundColor:C.surfaceRaised,maxWidth:'48%'},
 rewardText:{fontSize:10,lineHeight:13,color:C.gold,fontWeight:'700'},
 preview:{fontSize:11,lineHeight:15,color:C.textMuted},
 voteLine:{flexDirection:'row',alignItems:'center',gap:4,flexShrink:0},
 myVote:{alignItems:'center',justifyContent:'center'},
 votes:{fontSize:11,lineHeight:16,color:C.cyan,fontWeight:'800'},
 chevron:{fontSize:21,lineHeight:23,color:C.gold,fontWeight:'700',minWidth:12,textAlign:'center'},
 });}
