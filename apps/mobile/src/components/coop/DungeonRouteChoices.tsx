import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopMode,CoopRouteOptionView} from '../../core/coop-presentation';
import type {CoopUiAssetId} from '../../core/coop-ui-contract';
import {type CoopColors,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {CoopImageSlot} from './CoopVisualKit';

const artwork:Record<string,CoopUiAssetId>={
 battle:'node_battle',elite:'node_elite',event:'node_event',forge:'node_event',
 shrine:'node_shrine',camp:'node_camp',treasure:'node_treasure',merchant:'node_merchant',
 echo:'node_echo',risk:'node_risk',secret:'node_treasure',boss:'node_boss',
};

/**
 * One decision per room card. The whole card is the Choose/Vote target;
 * the existing server-authoritative onChoose callback remains unchanged.
 */
export function DungeonRouteChoices({options,mode,phase,busy=false,onChoose}:{
 options:CoopRouteOptionView[];mode:CoopMode;phase:string;busy?:boolean;onChoose?:(nodeId:string)=>void;
}){
 const {styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText(),canChoose=Boolean(onChoose)&&phase==='awaiting_choice'&&!busy;
 const action=mode==='qmode'?st('Choose room'):st('Vote');
 return <View style={s.list}>
  {options.map((option,index)=>{
   const canPress=canChoose&&!option.hidden;
   return <Pressable
    key={option.nodeId}
    accessibilityRole="button"
    accessibilityLabel={`${option.title}. ${option.risk}. ${option.reward}. ${option.votes!==undefined?`${option.votes} votes. `:''}${canPress?action:st('Unavailable')}`}
    accessibilityState={{disabled:!canPress}}
    disabled={!canPress}
    onPress={()=>onChoose?.(option.nodeId)}
    style={({pressed})=>[s.card,option.kind==='boss'&&s.bossCard,option.hidden&&s.hiddenCard,pressed&&canPress&&s.pressed]}
   >
    <CoopImageSlot assetId={artwork[option.kind]??'node_event'} size="room" accessibilityLabel={option.title}/>
    <View style={s.content}>
     <View style={s.heading}>
      <Text style={s.title} numberOfLines={2}>{option.title}</Text>
      <Text style={s.roomNumber}>{String(index+1).padStart(2,'0')}</Text>
     </View>
     <View style={s.tags}>
      <View style={s.riskTag}><Text style={s.riskText} numberOfLines={2}>{option.risk}</Text></View>
      <View style={s.rewardTag}><Text style={s.rewardText} numberOfLines={2}>{option.reward}</Text></View>
     </View>
     {option.encounterPreview?.summary?<Text numberOfLines={2} style={s.preview}>{option.encounterPreview.summary}</Text>:null}
     <View style={s.footer}>
      {option.votes!==undefined?<Text style={s.votes}>{option.votes} {st('votes')}</Text>:<View style={s.grow}/>}
      <View style={[s.action,!canPress&&s.actionDisabled]}>
       <Text style={[s.actionText,!canPress&&s.actionTextDisabled]}>{canPress?action:st('Awaiting choice')}</Text>
       <Text style={[s.chevron,!canPress&&s.actionTextDisabled]}>›</Text>
      </View>
     </View>
    </View>
   </Pressable>;
  })}
 </View>;
}
function makeStyles(C:CoopColors){return StyleSheet.create({
 list:{gap:coopSpacing.sm},
 card:{minHeight:140,flexDirection:'row',gap:12,padding:9,borderWidth:1,borderColor:C.goldDim,borderRadius:14,backgroundColor:C.surfaceRaised,overflow:'hidden'},
 bossCard:{borderColor:C.gold},
 hiddenCard:{opacity:.6},
 pressed:{backgroundColor:C.surface},
 content:{flex:1,minWidth:0,justifyContent:'space-between',gap:7},
 heading:{flexDirection:'row',alignItems:'flex-start',gap:6},
 title:{flex:1,minWidth:0,...coopTypography.section,color:C.text,fontWeight:'900'},
 roomNumber:{...coopTypography.meta,color:C.textMuted,fontWeight:'800'},
 tags:{flexDirection:'row',flexWrap:'wrap',gap:5},
 riskTag:{borderWidth:1,borderColor:C.danger,borderRadius:7,paddingHorizontal:7,paddingVertical:4,maxWidth:'100%'},
 riskText:{...coopTypography.meta,color:C.textSecondary,fontWeight:'800'},
 rewardTag:{borderWidth:1,borderColor:C.goldDim,borderRadius:7,paddingHorizontal:7,paddingVertical:4,maxWidth:'100%'},
 rewardText:{...coopTypography.meta,color:C.gold,fontWeight:'800'},
 preview:{...coopTypography.meta,color:C.textMuted,lineHeight:15},
 footer:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:7,marginTop:2},
 grow:{flex:1},
 votes:{...coopTypography.meta,color:C.cyan,fontWeight:'800',flex:1},
 action:{flexDirection:'row',alignItems:'center',gap:5},
 actionDisabled:{opacity:.55},
 actionText:{...coopTypography.meta,color:C.gold,fontWeight:'900'},
 actionTextDisabled:{color:C.textMuted},
 chevron:{fontSize:23,lineHeight:26,color:C.gold,fontWeight:'700'},
 });}
