import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {useSocialText} from '../../i18n/social';
import {dungeonWeeklyQuestCopy} from '../../i18n/dungeon-weekly-quest-copy';
import type {Language} from '../../i18n';
import type {DungeonWeeklyQuestSnapshot} from '../../core/dungeon-weekly-quests';
import {useCoopStyles} from '../../theme/useCoopStyles';
import {type CoopColors} from '../../theme/coop-ui-theme';
import {ExpeditionMarkIcon} from '../ExpeditionMarkIcon';
import {GameButton} from '../GameButton';
import {FantasyPanel,StateChip} from './CoopVisualKit';

/** Compact, dedicated dungeon-only weekly quest card on the dungeon home.
 * Its claim is separate from Class Challenges and all normal Quest Points. */
export function DungeonWeeklyQuestPanel({language,quest,loading,error,busy=false,onRefresh,onClaim}:{
 language:Language;quest?:DungeonWeeklyQuestSnapshot;loading:boolean;error?:string;busy?:boolean;
 onRefresh:()=>void;onClaim:()=>void;
}){
 const st=useSocialText(),{colors:C,styles:s}=useCoopStyles(makeStyles);
 const copy=quest?dungeonWeeklyQuestCopy(quest.id,language):undefined;
 const reset=quest?new Date(quest.resetAtMs).toLocaleDateString(language,{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':undefined;
 const progress=quest?.progress??0,ready=!!quest&&!quest.claimed&&progress>=quest.target;
 return <FantasyPanel variant={quest?.claimed?'success':ready?'selected':'default'}>
  <View style={s.heading}>
   <View style={s.titleWrap}><Text style={s.eyebrow}>{st('WEEKLY DUNGEON QUEST')}</Text>
    <Text style={s.title}>{copy?.name??st('Weekly dungeon challenge')}</Text>
   </View>
   {quest?<StateChip label={quest.claimed?st('CLAIMED'):ready?st('READY'):st('WEEKLY')} tone={quest.claimed?'success':ready?'selected':'warning'}/>:null}
  </View>
  {quest?<><Text style={s.description}>{copy?.description??quest.description}</Text>
    <View style={s.progressRow} accessible accessibilityRole="progressbar" accessibilityValue={{min:0,max:quest.target,now:progress}} accessibilityLabel={st('{name}: {current} of {goal}',{name:copy?.name??quest.name,current:progress,goal:quest.target})}>
     <View style={s.track}><View style={[s.fill,{width:(Math.min(100,Math.round(progress/quest.target*100))+'%') as `${number}%`}]}/></View>
     <Text style={s.progress}>{progress}/{quest.target}</Text>
    </View>
    <View style={s.foot}>
     <View style={s.reward}><ExpeditionMarkIcon size={18}/><Text style={s.rewardLabel}>+{quest.rewardMarks} {st('Expedition Marks')}</Text></View>
     <Text style={s.reset}>{st('Resets')} {reset}</Text>
    </View>
    {ready?<GameButton compact title={st('Claim weekly reward')} disabled={busy} onPress={onClaim}/>:null}
    {quest.claimed?<Text style={s.note}>{st('Weekly reward collected for this account.')}</Text>:null}
    <Text style={s.note}>{st('One reward per account each week. Solo and Live dungeons both count.')}</Text>
  </>:loading?<View style={s.loading}><ActivityIndicator color={C.cyan}/><Text style={s.note}>{st('Checking dungeon progress…')}</Text></View>:
     <View style={s.loading}><Text style={s.note}>{error||st('Weekly dungeon quest is currently unavailable.')}</Text><GameButton compact title={st('Retry')} tone="secondary" onPress={onRefresh}/></View>}
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 titleWrap:{flex:1,minWidth:0,gap:2},
 eyebrow:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:.8,color:C.gold},
 title:{fontSize:15,lineHeight:20,fontWeight:'900',color:C.text},
 description:{fontSize:12,lineHeight:18,color:C.textSecondary},
 progressRow:{flexDirection:'row',alignItems:'center',gap:10},
 track:{flex:1,height:6,borderRadius:6,overflow:'hidden',backgroundColor:C.surfaceRaised},
 fill:{height:6,borderRadius:6,backgroundColor:C.cyan},
 progress:{fontSize:12,lineHeight:17,fontWeight:'900',color:C.text},
 foot:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
 reward:{flexDirection:'row',alignItems:'center',gap:5},rewardLabel:{fontWeight:'800',fontSize:12,color:C.gold},
 reset:{fontSize:10,lineHeight:15,color:C.textMuted},note:{fontSize:10,lineHeight:15,color:C.textMuted},
 loading:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}
});
