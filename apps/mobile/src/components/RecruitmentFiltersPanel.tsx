import {useMemo,useState,type ReactNode} from 'react';
import {SearchField} from './SearchField';
import {GameTextInput as TextInput} from './GameTextInput';
import {Pressable,Text,View,StyleSheet,Switch} from 'react-native';
import {radii,spacing,touchTargetMin,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EMPTY_RECRUITMENT_FILTERS} from '../core/party-social';
import type {RecruitmentClientFilters,RecruitmentPostType,RecruitmentActivityLevel} from '../core/party-social';

export const recruitmentTags=(text:string)=>text.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
const tagFieldLabel={activityTags:'Activities',playstyleTags:'Playstyle',availabilityTags:'Availability',guildInterestTags:'Guild interests'} as const;

export function RecruitmentFiltersPanel({value,onChange,hidePostType=false}:{value:RecruitmentClientFilters;onChange:(value:RecruitmentClientFilters)=>void;hidePostType?:boolean}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [expanded,setExpanded]=useState(false);
 const count=Object.entries(value).filter(([key,v])=>key!=='query'&&(Array.isArray(v)?v.length>0:!!v)).length;
 const update=(patch:Partial<RecruitmentClientFilters>)=>onChange({...value,...patch});
 const toggle=<T,>(items:T[],item:T)=>items.includes(item)?items.filter(x=>x!==item):[...items,item];
 return <View style={s.root}>
  <View style={s.searchRow}><View style={s.search}><SearchField accessibilityLabel="Search recruitment" placeholder="Search adverts" placeholderTextColor={C.muted} value={value.query} onChangeText={query=>update({query})}/></View><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={({pressed})=>[s.filterToggle,expanded&&s.filterToggleActive,pressed&&s.pressed]}><Text style={s.filterToggleText}>{expanded?'Hide filters':'Filters'}</Text>{count>0?<View style={s.countBadge}><Text style={s.count}>{count}</Text></View>:null}</Pressable></View>
  {expanded?<View style={s.filterBody}>
   <View style={s.filterHead}><Text style={s.filterTitle}>RECRUITMENT FILTERS</Text>{count>0?<Pressable accessibilityRole="button" onPress={()=>onChange({...EMPTY_RECRUITMENT_FILTERS,query:value.query})} style={({pressed})=>[s.clear,pressed&&s.pressed]}><Text style={s.clearText}>Clear {count}</Text></Pressable>:null}</View>
   {!hidePostType?<FilterGroup label="POST TYPE">{(['looking_for_party','party_recruiting','looking_for_guild','guild_recruiting'] as RecruitmentPostType[]).map(type=><FilterChip key={type} label={type==='looking_for_party'?'LFG':type==='party_recruiting'?'LFM':type==='looking_for_guild'?'Guild seeker':'Guild recruiting'} selected={value.postTypes.includes(type)} onPress={()=>update({postTypes:toggle(value.postTypes,type)})}/>)}</FilterGroup>:null}
   <FilterGroup label="FOCUS">{(['combat','skilling','mixed'] as const).map(focus=><FilterChip key={focus} label={focus} selected={value.focuses.includes(focus)} onPress={()=>update({focuses:toggle(value.focuses,focus)})}/>)}</FilterGroup>
   <FilterGroup label="ROLE">{(['tank','damage','support'] as const).map(role=><FilterChip key={role} label={role} selected={value.roles.includes(role)} onPress={()=>update({roles:toggle(value.roles,role)})}/>)}</FilterGroup>
   <FilterGroup label="PACE">{(['casual','regular','active','hardcore'] as RecruitmentActivityLevel[]).map(level=><FilterChip key={level} label={level} selected={value.activityLevels?.includes(level)??false} onPress={()=>update({activityLevels:toggle(value.activityLevels??[],level)})}/>)}</FilterGroup>
   {(['activityTags','playstyleTags','availabilityTags','guildInterestTags'] as const).map(key=><TextInput key={key} accessibilityLabel={tagFieldLabel[key]} placeholder={tagFieldLabel[key]+' · comma separated'} placeholderTextColor={C.muted} style={s.input} defaultValue={value[key]?.join(', ')} onEndEditing={event=>update({[key]:recruitmentTags(event.nativeEvent.text)})}/>)}
   <View style={s.row}>{(['language','region'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='language'?'Language':'Region'} placeholderTextColor={C.muted} style={[s.input,s.grow]} value={value[key]??''} maxLength={40} onChangeText={text=>update({[key]:text})}/>)}</View>
   <View style={s.row}>{(['maxMinCombatLevel','maxMinTotalLevel'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key==='maxMinCombatLevel'?'My Combat level':'My Total level'} placeholderTextColor={C.muted} style={[s.input,s.grow]} keyboardType="number-pad" value={value[key]?.toString()??''} onChangeText={text=>update({[key]:text?Math.max(0,parseInt(text,10)||0):undefined})}/>)}</View>
   <View style={s.switchRow}><View style={s.switchCopy}><Text style={s.switchTitle}>Open Party spots only</Text><Text style={s.switchHint}>Hide full LFM posts.</Text></View><Switch accessibilityLabel="Only Parties with open spots" value={value.requireOpenPartySpot??false} trackColor={{false:C.line,true:C.selectionLine}} thumbColor={value.requireOpenPartySpot?C.accent:C.muted} onValueChange={requireOpenPartySpot=>update({requireOpenPartySpot})}/></View>
  </View>:null}
 </View>;
}

function FilterGroup({label,children}:{label:string;children:ReactNode}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.group}><Text style={s.groupLabel}>{label}</Text><View accessibilityRole="tablist" style={s.row}>{children}</View></View>}
function FilterChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm},
 searchRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},search:{flex:1,minWidth:0},
 filterToggle:{minHeight:44,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
 filterToggleActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
 filterToggleText:{fontSize:11,fontWeight:'900',color:C.text},
 countBadge:{minWidth:19,height:19,paddingHorizontal:4,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:C.accent},
 count:{fontSize:10,color:C.dark?C.bg:C.primaryButtonText,fontWeight:'900'},
 filterBody:{gap:8,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 filterHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 filterTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 clear:{minHeight:32,justifyContent:'center',paddingHorizontal:4},clearText:{fontSize:9,color:C.info,fontWeight:'900'},
 group:{gap:5},groupLabel:{fontSize:8.5,color:C.accentSoft,fontWeight:'900',letterSpacing:.75},
 row:{flexDirection:'row',flexWrap:'wrap',gap:5,alignItems:'center'},
 chip:{minHeight:36,paddingHorizontal:10,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
 chipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 chipText:{fontSize:10.5,color:C.muted,fontWeight:'800',textTransform:'capitalize'},chipTextSelected:{color:C.text},
 grow:{flex:1,minWidth:110},
 input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,paddingHorizontal:spacing.sm,color:C.text,backgroundColor:C.inputBg},
 switchRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 switchCopy:{flex:1,minWidth:0},switchTitle:{fontSize:10.5,color:C.text,fontWeight:'800'},switchHint:{fontSize:8.5,color:C.muted,marginTop:1},
 pressed:{opacity:.72},
});}
