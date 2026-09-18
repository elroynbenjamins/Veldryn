import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {crossSkillViews,newCrossSkillState} from '../core/cross-skill-discoveries-v45';
import {Panel} from './Panel';
import {C,radii,spacing,typography} from '../theme/theme';

export function CrossSkillDiscoveriesPanel({state}:{state:GameState}){
 if(!state.character)return null;
 const accountId=state.account.crossSkillState?.accountId??state.account.journalState?.accountId??('account:'+state.createdAtMs);
 const cross=state.account.crossSkillState??newCrossSkillState(accountId);
 const levels=Object.fromEntries(state.skills.map(skill=>[skill.skillId,skill.level]));
 const rows=crossSkillViews(cross,state.character.id,{skillLevels:levels});
 return <Panel><View style={s.heading}><View style={s.flex}><Text style={s.title}>Cross-Skill Discoveries</Text><Text style={s.sub}>Level combinations unlock knowledge and crafting options for this character.</Text></View><Text style={s.count}>{rows.filter(row=>row.unlocked).length}/{rows.length}</Text></View>{rows.map(row=><View key={row.definition.id} style={[s.card,row.unlocked&&s.unlocked]}><View style={s.between}><Text style={s.name}>{row.definition.name}</Text><Text style={row.unlocked?s.done:s.progress}>{row.unlocked?'UNLOCKED':Math.round(row.progress*100)+'%'}</Text></View><Text style={s.sub}>{row.definition.description}</Text><View style={s.requirements}>{row.requirements.map(req=><View key={req.skillId} style={[s.requirement,req.complete&&s.requirementDone]}><Text style={s.reqText}>{req.skillName} {req.currentLevel}/{req.level}{req.complete?' ✓':''}</Text></View>)}</View><Text style={s.reward}>Unlock: {row.definition.reward.label}</Text></View>)}</Panel>;
}
const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1},title:{...typography.title,color:C.text},sub:{...typography.caption,color:C.muted,lineHeight:17},count:{color:C.accent,fontWeight:'900'},card:{paddingVertical:10,borderTopWidth:1,borderTopColor:C.line,gap:5},unlocked:{opacity:1},between:{flexDirection:'row',justifyContent:'space-between',gap:8},name:{color:C.text,fontWeight:'900'},done:{color:C.good,fontSize:10,fontWeight:'900'},progress:{color:C.info,fontSize:10,fontWeight:'900'},requirements:{flexDirection:'row',flexWrap:'wrap',gap:5},requirement:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},requirementDone:{borderColor:C.good},reqText:{color:C.muted,fontSize:10,fontWeight:'700'},reward:{color:C.accent,fontSize:11,fontWeight:'800'}});