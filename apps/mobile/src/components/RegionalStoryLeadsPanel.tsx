import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {regionalStoryLeads} from '../core/regional-story-leads';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';

const regionLabel:Record<string,string>={SUNSCAR:'SUNSCAR',FROSTMARCH:'FROSTMARCH',ASHLANDS:'ASHLANDS'};
export function RegionalStoryLeadsPanel({state,regionId,onOpenCombat}:{state:GameState;regionId:'SUNSCAR'|'FROSTMARCH'|'ASHLANDS';onOpenCombat:()=>void}){
 const leads=regionalStoryLeads(regionId,state),available=leads.find(row=>row.status==='available');
 return <View style={s.root}>
  <View><Text style={s.eyebrow}>{regionLabel[regionId]} · REGIONAL STORY</Text><Text style={s.title}>Story leads</Text><Text style={s.copy}>These leads use existing regional hunts as narrative milestones. Mastery 20 marks a lead as fully studied without introducing another quest currency or separate combat mode.</Text></View>
  {leads.map(lead=><View key={lead.id} style={[s.card,lead.status==='available'&&s.active,lead.status==='mastered'&&s.mastered,lead.status==='locked'&&s.locked]}>
   <View style={s.head}><View style={s.flex}><Text style={s.chapter}>CHAPTER {lead.chapter} · {lead.location.toUpperCase()}</Text><Text style={s.name}>{lead.title}</Text></View><Text style={[s.status,lead.status==='mastered'?s.statusDone:lead.status==='available'?s.statusReady:s.statusLocked]}>{lead.status==='mastered'?'MASTERED':lead.status==='available'?'AVAILABLE':`LV ${lead.minLevel}`}</Text></View>
   <Text style={s.story}>{lead.lore}</Text>
   <Text style={s.objective}>HUNT LEAD · {lead.monsterName}</Text><Text style={s.copy}>{lead.objective}</Text>
   <View style={s.progress}><Text style={s.progressLabel}>MASTERY</Text><Text style={s.progressValue}>{lead.masteryRank} / 20</Text></View>
   {lead.status==='available'&&<GameButton title={available?.id===lead.id?'Continue regional story':'Open hunt'} tone={available?.id===lead.id?'primary':'secondary'} onPress={onOpenCombat}/>}
  </View>)}
 </View>;
}
const s=StyleSheet.create({
 root:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},
 eyebrow:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
 title:{...typography.title,color:C.text},copy:{...typography.body,color:C.muted,lineHeight:19},
 card:{gap:7,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 active:{borderColor:C.info},mastered:{borderColor:C.good},locked:{opacity:.55},
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},
 chapter:{...typography.caption,color:C.accent,fontWeight:'900'},name:{...typography.bodyStrong,color:C.text,fontSize:15},
 status:{fontSize:9,lineHeight:12,fontWeight:'900',letterSpacing:.6},statusDone:{color:C.good},statusReady:{color:C.info},statusLocked:{color:C.muted},
 story:{...typography.body,color:C.text,lineHeight:19},objective:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.6},
 progress:{flexDirection:'row',justifyContent:'space-between',paddingTop:5,borderTopWidth:1,borderTopColor:C.line},progressLabel:{...typography.caption,color:C.muted,fontWeight:'900'},progressValue:{...typography.caption,color:C.text,fontWeight:'900'},
});
