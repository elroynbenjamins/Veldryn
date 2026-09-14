import {useState} from 'react';
import {SearchField} from './SearchField';
import {GameTextInput as TextInput} from './GameTextInput';
import {Text,View,StyleSheet,Switch} from 'react-native';
import {GameButton} from './GameButton';
import {C,spacing,touchTargetMin} from '../theme/theme';
import {EMPTY_RECRUITMENT_FILTERS} from '../core/party-social';
import type {RecruitmentClientFilters,RecruitmentPostType,RecruitmentActivityLevel} from '../core/party-social';
export const recruitmentTags=(text:string)=>text.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
export function RecruitmentFiltersPanel({value,onChange}:{value:RecruitmentClientFilters;onChange:(value:RecruitmentClientFilters)=>void}){
 const [expanded,setExpanded]=useState(false);
 const count=Object.entries(value).filter(([key,v])=>key!=='query'&&(Array.isArray(v)?v.length>0:!!v)).length;
 const update=(patch:Partial<RecruitmentClientFilters>)=>onChange({...value,...patch});
 const toggle=<T,>(items:T[],item:T)=>items.includes(item)?items.filter(x=>x!==item):[...items,item];
 return <View style={s.root}>
  <SearchField accessibilityLabel="Search recruitment" placeholder="Search adverts" placeholderTextColor={C.muted} value={value.query} onChangeText={query=>update({query})}/><GameButton title={(expanded?'Hide filters':'Filters')+(count?' · '+count+' active':'')} tone="secondary" onPress={()=>setExpanded(v=>!v)}/>{expanded&&<>
  <View style={s.row}>{(['looking_for_party','party_recruiting','looking_for_guild','guild_recruiting'] as RecruitmentPostType[]).map(type=><GameButton key={type} title={`${value.postTypes.includes(type)?'✓ ':''}${type.replaceAll('_',' ')}`} tone="secondary" onPress={()=>update({postTypes:toggle(value.postTypes,type)})}/>)}</View>
  <View style={s.row}>{(['combat','skilling','mixed'] as const).map(focus=><GameButton key={focus} title={`${value.focuses.includes(focus)?'✓ ':''}${focus}`} tone="secondary" onPress={()=>update({focuses:toggle(value.focuses,focus)})}/>)}</View>
  <View style={s.row}>{(['tank','damage','support'] as const).map(role=><GameButton key={role} title={`${value.roles.includes(role)?'✓ ':''}${role}`} tone="secondary" onPress={()=>update({roles:toggle(value.roles,role)})}/>)}</View>
  {(['activityTags','playstyleTags','availabilityTags','guildInterestTags'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={`${key.replace('Tags','')} (comma separated)`} placeholderTextColor={C.muted} style={s.input} defaultValue={value[key]?.join(', ')} onEndEditing={event=>update({[key]:recruitmentTags(event.nativeEvent.text)})}/>)}
  <View style={s.row}>{(['casual','regular','active','hardcore'] as RecruitmentActivityLevel[]).map(level=><GameButton key={level} title={`${value.activityLevels?.includes(level)?'✓ ':''}${level}`} tone="secondary" onPress={()=>update({activityLevels:toggle(value.activityLevels??[],level)})}/>)}</View>
  <View style={s.row}>{(['language','region'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key} placeholderTextColor={C.muted} style={[s.input,s.grow]} value={value[key]??''} maxLength={40} onChangeText={text=>update({[key]:text})}/>)}</View>
  <View style={s.row}>{(['maxMinCombatLevel','maxMinTotalLevel'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='maxMinCombatLevel'?'My Combat level':'My Total level'} placeholderTextColor={C.muted} style={[s.input,s.grow]} keyboardType="number-pad" value={value[key]?.toString()??''} onChangeText={text=>update({[key]:text?Math.max(0,parseInt(text,10)||0):undefined})}/>)}</View>
  <View style={s.row}><Switch accessibilityLabel="Only Parties with open spots" value={value.requireOpenPartySpot??false} onValueChange={requireOpenPartySpot=>update({requireOpenPartySpot})}/><Text style={s.text}>Only Parties with open spots</Text></View><GameButton title="Clear filters" tone="secondary" onPress={()=>onChange({...EMPTY_RECRUITMENT_FILTERS,query:value.query})}/></>}
 </View>;
}
const s=StyleSheet.create({root:{gap:spacing.sm},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,alignItems:'center'},grow:{flex:1,minWidth:100},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,padding:spacing.sm,color:C.text,backgroundColor:C.bg},text:{color:C.text}});
