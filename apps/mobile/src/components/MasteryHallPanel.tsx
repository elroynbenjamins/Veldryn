import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {professionMasteryHallSummary} from '../core/profession-mastery-presentation';
import {JOURNAL_ACHIEVEMENTS_V42} from '../core/adventurers-journal-v42';
import {formatGameNumber} from '../core/number-format';
import {Panel} from './Panel';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function MasteryHallPanel({state}:{state:GameState}){
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]),summary=professionMasteryHallSummary(state);
 const ladder=JOURNAL_ACHIEVEMENTS_V42.filter(row=>row.id.startsWith('mastery_hall_')),next=ladder.find(row=>summary.mastered<row.target),earned=ladder.filter(row=>summary.mastered>=row.target).length;
 const skills=summary.skills.slice(0,6);
 return <Panel accentColor={summary.mastered?E.goldSoft:C.info}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>ACCOUNT MASTERY HALL</Text><Text style={s.title}>{summary.mastered?summary.mastered+' R50 master'+(summary.mastered===1?'y':'ies'):'Build your first R50 mastery'}</Text><Text style={s.copy}>Recognition across all characters and classes. Mastery Hall adds prestige, achievements and profile showcase options—not more power.</Text></View><View style={[s.seal,summary.mastered>0&&s.sealEarned]}><Text style={[s.sealValue,summary.mastered>0&&s.sealValueEarned]}>{summary.mastered}</Text><Text style={s.sealLabel}>R50</Text></View></View>
  <View style={s.stats}><View style={s.stat}><Text style={s.statLabel}>TRAINED</Text><Text style={s.statValue}>{summary.trained}</Text></View><View style={s.stat}><Text style={s.statLabel}>R10+</Text><Text style={s.statValue}>{summary.rank10}</Text></View><View style={s.stat}><Text style={s.statLabel}>R30+</Text><Text style={s.statValue}>{summary.rank30}</Text></View><View style={s.stat}><Text style={s.statLabel}>POINTS</Text><Text numberOfLines={1} style={s.statValue}>{formatGameNumber(summary.totalPoints,state.settings.numberMode)}</Text></View></View>
  <View style={s.progressBlock}><View style={s.progressHead}><Text style={s.section}>MASTERY HALL ACHIEVEMENTS</Text><Text style={s.progressMeta}>{earned}/{ladder.length}</Text></View>{next?<><View style={s.track}><View style={[s.fill,{width:(Math.max(4,Math.min(100,summary.mastered/next.target*100))+'%') as `${number}%`}]}/></View><Text style={s.copy}>Next: {next.title} · {summary.mastered}/{next.target} mastered actions</Text></>:<Text style={s.complete}>Grandmaster Mastery Hall complete · Masterwork Savant title earned.</Text>}</View>
  {skills.length?<View style={s.skillBlock}><Text style={s.section}>STRONGEST PROFESSIONS</Text><View style={s.skillGrid}>{skills.map(row=><View key={row.skillId} style={[s.skill,row.mastered>0&&s.skillMastered]}><Text numberOfLines={1} style={s.skillName}>{row.label}</Text><Text style={s.skillMeta}>Best R{row.bestRank} · {row.mastered} mastered</Text></View>)}</View></View>:<Text style={s.empty}>Complete profession actions to begin filling the Hall.</Text>}
 </Panel>;
}
function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:E.goldSoft,fontWeight:'900',letterSpacing:.85},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted},seal:{width:58,height:58,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:29,backgroundColor:C.panel2},sealEarned:{borderColor:E.goldSoft,backgroundColor:C.warningSurface},sealValue:{fontSize:19,lineHeight:21,color:C.muted,fontWeight:'900'},sealValueEarned:{color:E.goldSoft},sealLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},
 stats:{flexDirection:'row',gap:5},stat:{flex:1,minWidth:0,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},statLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.55},statValue:{...typography.bodyStrong,color:C.text},
 progressBlock:{gap:4,paddingTop:5,borderTopWidth:1,borderTopColor:C.line},progressHead:{flexDirection:'row',justifyContent:'space-between',gap:8},section:{fontSize:8.5,color:C.muted,fontWeight:'900',letterSpacing:.7},progressMeta:{fontSize:9,color:C.info,fontWeight:'900'},track:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.bg},fill:{height:'100%',borderRadius:99,backgroundColor:E.goldSoft},complete:{...typography.caption,color:C.good,fontWeight:'800'},
 skillBlock:{gap:5,paddingTop:5,borderTopWidth:1,borderTopColor:C.line},skillGrid:{flexDirection:'row',flexWrap:'wrap',gap:5},skill:{width:'48%',minWidth:125,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},skillMastered:{borderColor:C.good,backgroundColor:C.goodSurface},skillName:{fontSize:10,color:C.text,fontWeight:'900'},skillMeta:{fontSize:8.5,color:C.muted,fontWeight:'700'},empty:{...typography.caption,color:C.muted}
});}