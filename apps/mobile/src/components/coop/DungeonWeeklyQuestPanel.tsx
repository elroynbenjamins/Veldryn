import {useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {useSocialText} from '../../i18n/social';
import {dungeonWeeklyQuestCopy} from '../../i18n/dungeon-weekly-quest-copy';
import {dungeonUxText} from '../../i18n/dungeon-ux-copy';
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
 const [expanded,setExpanded]=useState(false);
 const st=useSocialText(),{colors:C,styles:s}=useCoopStyles(makeStyles);
 const copy=quest?dungeonWeeklyQuestCopy(quest.id,language):undefined;
 const reset=quest?new Date(quest.resetAtMs).toLocaleDateString(language,{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC':undefined;
 const progress=quest?.progress??0,ready=!!quest&&!quest.claimed&&progress>=quest.target;
 return <FantasyPanel variant={quest?.claimed?'success':ready?'selected':'default'}>
  <Pressable accessibilityRole="button"
   accessibilityState={{expanded}} accessibilityLabel={copy?.name??dungeonUxText(language,'weeklyFallback')}
   accessibilityHint={expanded?dungeonUxText(language,'weeklyCollapse'):dungeonUxText(language,'weeklyExpand')}
   onPress={()=>setExpanded(value=>!value)} style={({pressed})=>[s.heading,pressed&&s.pressed]}>
   <View style={s.titleWrap}>
    <Text style={s.eyebrow}>{dungeonUxText(language,'weeklyHeader')}</Text>
    <Text style={s.title} numberOfLines={1}>{copy?.name??dungeonUxText(language,'weeklyFallback')}</Text>
   </View>
   {quest?<StateChip label={quest.claimed?st('CLAIMED'):ready?st('READY'):dungeonUxText(language,'weeklyStatus')} tone={quest.claimed?'success':ready?'selected':'warning'}/>:null}
   <Text style={s.chevron}>{expanded?'⌄':'›'}</Text>
  </Pressable>
  {quest?<>{expanded?<Text style={s.description}>{copy?.description??quest.description}</Text>:null}
    <View style={s.progressRow} accessible accessibilityRole="progressbar" accessibilityValue={{min:0,max:quest.target,now:progress}} accessibilityLabel={dungeonUxText(language,'weeklyProgress',{name:copy?.name??quest.name,current:progress,goal:quest.target})}>
     <View style={s.track}><View style={[s.fill,{width:(Math.min(100,Math.round(progress/quest.target*100))+'%') as `${number}%`}]}/></View>
     <Text style={s.progress}>{progress}/{quest.target}</Text>
    </View>
    <View style={s.foot}>
     <View style={s.reward}><ExpeditionMarkIcon size={18}/><Text style={s.rewardLabel}>+{quest.rewardMarks} {st('Expedition Marks')}</Text></View>
     <Text style={s.reset}>{dungeonUxText(language,'weeklyReset')} {reset}</Text>
    </View>
    {ready?<GameButton compact title={dungeonUxText(language,'weeklyClaim')} disabled={busy} onPress={onClaim}/>:null}
    {expanded&&quest.claimed?<Text style={s.note}>{dungeonUxText(language,'weeklyClaimedNote')}</Text>:null}
    {expanded?<Text style={s.note}>{dungeonUxText(language,'weeklyScope')}</Text>:null}
  </>:loading?<View style={s.loading}><ActivityIndicator color={C.cyan}/><Text style={s.note}>{dungeonUxText(language,'weeklyLoading')}</Text></View>:
     <View style={s.loading}><Text style={s.note}>{error||dungeonUxText(language,'weeklyUnavailable')}</Text><GameButton compact title={st('Retry')} tone="secondary" onPress={onRefresh}/></View>}
 </FantasyPanel>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7,minHeight:44},
 chevron:{fontSize:18,lineHeight:23,fontWeight:'800',color:C.cyan,width:16,textAlign:'center'},
 pressed:{opacity:.72},
 titleWrap:{flex:1,minWidth:0,gap:2},
 eyebrow:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:.8,color:C.gold},
 title:{fontSize:14,lineHeight:19,fontWeight:'900',color:C.text},
 description:{fontSize:11,lineHeight:16,color:C.textSecondary},
 progressRow:{flexDirection:'row',alignItems:'center',gap:10},
 track:{flex:1,height:6,borderRadius:6,overflow:'hidden',backgroundColor:C.surfaceRaised},
 fill:{height:6,borderRadius:6,backgroundColor:C.cyan},
 progress:{fontSize:12,lineHeight:17,fontWeight:'900',color:C.text},
 foot:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6,flexWrap:'wrap'},
 reward:{flexDirection:'row',alignItems:'center',gap:5},rewardLabel:{fontWeight:'800',fontSize:12,color:C.gold},
 reset:{fontSize:10,lineHeight:15,color:C.textMuted},note:{fontSize:10,lineHeight:15,color:C.textMuted},
 loading:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}
});
