import {useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {SearchField} from './SearchField';
import {GameTextInput as TextInput} from './GameTextInput';
import {GameButton} from './GameButton';
import {C,radii,spacing,touchTargetMin} from '../theme/theme';
import {EMPTY_RECRUITMENT_FILTERS} from '../core/party-social';
import type {RecruitmentActivityLevel,RecruitmentClientFilters,RecruitmentPostType} from '../core/party-social';

export const recruitmentTags=(text:string)=>text.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);

type SectionId='postType'|'focus'|'role'|'tags'|'activity'|'location'|'levels'|'party';
function labelForType(type:RecruitmentPostType){return type.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());}

export function RecruitmentFiltersPanel({value,onChange,hidePostType=false}:{value:RecruitmentClientFilters;onChange:(value:RecruitmentClientFilters)=>void;hidePostType?:boolean}){
 const [visible,setVisible]=useState(false);
 const [open,setOpen]=useState<SectionId>();
 const count=useMemo(()=>Object.entries(value).filter(([key,v])=>key!=='query'&&(Array.isArray(v)?v.length>0:!!v)).length,[value]);
 const update=(patch:Partial<RecruitmentClientFilters>)=>onChange({...value,...patch});
 const toggle=<T,>(items:T[],item:T)=>items.includes(item)?items.filter(x=>x!==item):[...items,item];
 const reset=()=>onChange({...EMPTY_RECRUITMENT_FILTERS,query:value.query});
 const section=(id:SectionId,title:string,summary:string,body:React.ReactNode)=>{
   const isOpen=open===id;
   return <View style={s.section} key={id}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:isOpen}} onPress={()=>setOpen(isOpen?undefined:id)} style={s.sectionHeader}>
       <View style={s.flex}><Text style={s.sectionTitle}>{title}</Text><Text numberOfLines={1} style={s.summary}>{summary||'Any'}</Text></View>
       <Text style={s.chevron}>{isOpen?'⌃':'⌄'}</Text>
     </Pressable>
     {isOpen?<View style={s.sectionBody}>{body}</View>:null}
   </View>;
 };
 return <View style={s.root}>
   <View style={s.toolbar}>
     <View style={s.search}><SearchField accessibilityLabel="Search recruitment" placeholder="Search adverts" placeholderTextColor={C.muted} value={value.query} onChangeText={query=>update({query})}/></View>
     <GameButton title={`Filters${count?` · ${count}`:''} ▾`} tone={count?'primary':'secondary'} onPress={()=>setVisible(true)}/>
   </View>
   <Modal visible={visible} transparent animationType="slide" onRequestClose={()=>setVisible(false)}>
     <View style={s.backdrop}><View style={s.sheet}>
       <View style={s.sheetHeader}><View style={s.flex}><Text style={s.title}>Recruitment Filters</Text><Text style={s.helper}>Filters stay here so the recruitment board remains clean.</Text></View><View style={s.count}><Text style={s.countText}>{count}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={()=>setVisible(false)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
       <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
         {!hidePostType?section('postType','Post Type',value.postTypes.map(labelForType).join(', '),<View style={s.options}>{(['looking_for_party','party_recruiting','looking_for_guild','guild_recruiting'] as RecruitmentPostType[]).map(type=><GameButton key={type} title={`${value.postTypes.includes(type)?'✓ ':''}${labelForType(type)}`} tone="secondary" onPress={()=>update({postTypes:toggle(value.postTypes,type)})}/>)}</View>):null}
         {section('focus','Focus',value.focuses.join(', '),<View style={s.options}>{(['combat','skilling','mixed'] as const).map(focus=><GameButton key={focus} title={`${value.focuses.includes(focus)?'✓ ':''}${focus[0].toUpperCase()+focus.slice(1)}`} tone="secondary" onPress={()=>update({focuses:toggle(value.focuses,focus)})}/>)}</View>)}
         {section('role','Role',value.roles.join(', '),<View style={s.options}>{(['tank','damage','support'] as const).map(role=><GameButton key={role} title={`${value.roles.includes(role)?'✓ ':''}${role[0].toUpperCase()+role.slice(1)}`} tone="secondary" onPress={()=>update({roles:toggle(value.roles,role)})}/>)}</View>)}
         {section('tags','Tags',[...(value.activityTags??[]),...(value.playstyleTags??[]),...(value.availabilityTags??[]),...(value.guildInterestTags??[])].join(', '),<View style={s.stack}>{(['activityTags','playstyleTags','availabilityTags','guildInterestTags'] as const).map(key=><TextInput key={key} accessibilityLabel={key} placeholder={key.replace('Tags','').replace(/([A-Z])/g,' $1').trim()} placeholderTextColor={C.muted} style={s.input} defaultValue={value[key]?.join(', ')} onEndEditing={event=>update({[key]:recruitmentTags(event.nativeEvent.text)})}/>)}</View>)}
         {section('activity','Activity Level',(value.activityLevels??[]).join(', '),<View style={s.options}>{(['casual','regular','active','hardcore'] as RecruitmentActivityLevel[]).map(level=><GameButton key={level} title={`${value.activityLevels?.includes(level)?'✓ ':''}${level[0].toUpperCase()+level.slice(1)}`} tone="secondary" onPress={()=>update({activityLevels:toggle(value.activityLevels??[],level)})}/>)}</View>)}
         {section('location','Language & Region',[value.language,value.region].filter(Boolean).join(' · '),<View style={s.stack}><TextInput accessibilityLabel="language" placeholder="Language" placeholderTextColor={C.muted} style={s.input} value={value.language??''} maxLength={40} onChangeText={language=>update({language})}/><TextInput accessibilityLabel="region" placeholder="Region / timezone" placeholderTextColor={C.muted} style={s.input} value={value.region??''} maxLength={40} onChangeText={region=>update({region})}/></View>)}
         {section('levels','My Levels',[value.maxMinCombatLevel!=null?`Combat ${value.maxMinCombatLevel}`:'',value.maxMinTotalLevel!=null?`Total ${value.maxMinTotalLevel}`:''].filter(Boolean).join(' · '),<View style={s.stack}><TextInput accessibilityLabel="My Combat level" placeholder="My Combat level" placeholderTextColor={C.muted} style={s.input} keyboardType="number-pad" value={value.maxMinCombatLevel?.toString()??''} onChangeText={text=>update({maxMinCombatLevel:text?Math.max(0,parseInt(text,10)||0):undefined})}/><TextInput accessibilityLabel="My Total level" placeholder="My Total level" placeholderTextColor={C.muted} style={s.input} keyboardType="number-pad" value={value.maxMinTotalLevel?.toString()??''} onChangeText={text=>update({maxMinTotalLevel:text?Math.max(0,parseInt(text,10)||0):undefined})}/></View>)}
         {section('party','Party Availability',value.requireOpenPartySpot?'Open spots only':'Any',<View style={s.switchRow}><Switch accessibilityLabel="Only Parties with open spots" value={value.requireOpenPartySpot??false} onValueChange={requireOpenPartySpot=>update({requireOpenPartySpot})}/><Text style={s.text}>Only parties with open spots</Text></View>)}
       </ScrollView>
       <View style={s.footer}><View style={s.flex}><GameButton title="Reset" tone="secondary" onPress={reset}/></View><View style={s.flex}><GameButton title="Apply Filters" onPress={()=>setVisible(false)}/></View></View>
     </View></View>
   </Modal>
 </View>;
}

const s=StyleSheet.create({
 root:{gap:spacing.sm},toolbar:{flexDirection:'row',gap:spacing.sm,alignItems:'center',flexWrap:'wrap'},search:{flex:1,minWidth:190},
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0009'},sheet:{maxHeight:'88%',backgroundColor:C.bg,borderTopLeftRadius:20,borderTopRightRadius:20,borderWidth:1,borderColor:C.line,paddingBottom:12},
 sheetHeader:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},title:{color:C.text,fontSize:19,fontWeight:'900'},helper:{color:C.muted,fontSize:12,lineHeight:17},
 count:{minWidth:28,height:28,borderRadius:14,backgroundColor:C.accent,alignItems:'center',justifyContent:'center'},countText:{color:C.bg,fontWeight:'900'},close:{width:44,height:44,borderRadius:radii.md,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},closeText:{color:C.text,fontSize:24},
 content:{padding:spacing.md,gap:spacing.sm},section:{borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},sectionHeader:{minHeight:58,paddingHorizontal:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.sm},sectionTitle:{color:C.text,fontWeight:'900'},summary:{color:C.muted,fontSize:12},chevron:{color:C.accent,fontSize:20,fontWeight:'900'},sectionBody:{padding:spacing.sm,borderTopWidth:1,borderTopColor:C.line,backgroundColor:C.panel2},
 options:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},stack:{gap:spacing.sm},input:{minHeight:touchTargetMin,borderWidth:1,borderColor:C.line,padding:spacing.sm,color:C.text,backgroundColor:C.bg},switchRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},text:{color:C.text},footer:{paddingHorizontal:spacing.md,paddingTop:spacing.sm,flexDirection:'row',gap:spacing.sm,borderTopWidth:1,borderTopColor:C.line},flex:{flex:1}
});
