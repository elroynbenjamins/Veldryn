import {useState} from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {PERSONAL_RECORDS_V43,type PersonalRecordCategory,type PersonalRecordDefinition} from '../core/personal-records-v43';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,radii,spacing,typography} from '../theme/theme';

type Filter='all'|PersonalRecordCategory;
const categories:Filter[]=['all','combat','dungeon','raid','profession','activity','companion','party','guild'];
function formatValue(def:PersonalRecordDefinition,value:number){
 if(def.unit==='milliseconds'){const seconds=value/1000;return seconds>=60?`${Math.floor(seconds/60)}m ${Math.round(seconds%60)}s`:`${seconds.toFixed(seconds<10?2:1)}s`;}
 if(def.unit==='seconds'){const h=Math.floor(value/3600),m=Math.floor((value%3600)/60);return h?`${h}h ${m}m`:m?`${m}m ${Math.floor(value%60)}s`:`${Math.floor(value)}s`;}
 return Math.floor(value).toLocaleString();
}
const title=(value:Filter)=>value==='all'?'All categories':value[0].toUpperCase()+value.slice(1);

export function PersonalRecordsPanel({state}:{state:GameState}){
 const [filter,setFilter]=useState<Filter>('all'),[open,setOpen]=useState(false);
 const records=state.account.journalState?.records??{};
 const rows=PERSONAL_RECORDS_V43.filter(row=>filter==='all'||row.category===filter);
 const earned=PERSONAL_RECORDS_V43.filter(row=>records[row.id]).length;
 return <><Panel>
   <View style={s.heading}><View style={s.flex}><Text style={s.eyebrow}>PERSONAL RECORDS</Text><Text style={s.title}>Best Performances</Text></View><Text style={s.count}>{earned}/{PERSONAL_RECORDS_V43.length}</Text></View>
   <Text style={s.copy}>Trusted best-performance records. Lifetime totals remain in Achievements and statistics.</Text>
   <View style={s.filterRow}><View style={s.flex}><GameButton title={`Category: ${title(filter)} ▾`} tone={filter==='all'?'secondary':'primary'} onPress={()=>setOpen(true)}/></View></View>
   {rows.map(def=>{const record=records[def.id];return <View key={def.id} style={[s.row,!record&&s.locked]}><View style={s.flex}><Text style={s.name}>{def.label}</Text><Text style={s.meta}>{def.category.toUpperCase()} · {def.description}</Text>{record?.contextLabel?<Text style={s.context}>{record.contextLabel}</Text>:null}</View><View style={s.valueCol}><Text style={record?s.value:s.empty}>{record?formatValue(def,record.value):'—'}</Text>{record?<Text style={s.date}>{new Date(record.achievedAtMs).toLocaleDateString()}</Text>:null}</View></View>})}
 </Panel>
 <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setOpen(false)}/><View style={s.sheet}><Text style={s.title}>Record Category</Text><Text style={s.copy}>Choose which records to show.</Text>{categories.map(value=><Pressable key={value} onPress={()=>{setFilter(value);setOpen(false)}} style={[s.option,filter===value&&s.optionActive]}><Text style={[s.optionText,filter===value&&s.optionTextActive]}>{filter===value?'✓ ':''}{title(value)}</Text><Text style={s.optionCount}>{PERSONAL_RECORDS_V43.filter(row=>value==='all'||row.category===value).length}</Text></Pressable>)}<GameButton title="Close" tone="secondary" onPress={()=>setOpen(false)}/></View></View></Modal></>;
}
const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},count:{color:C.accent,fontWeight:'900',fontSize:16},copy:{...typography.caption,color:C.muted,lineHeight:18,marginTop:4},filterRow:{flexDirection:'row',marginTop:8},row:{minHeight:64,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},locked:{opacity:.55},name:{...typography.bodyStrong,color:C.text},meta:{color:C.muted,fontSize:9,lineHeight:13},context:{color:C.info,fontSize:9,marginTop:2},valueCol:{alignItems:'flex-end',maxWidth:100},value:{color:C.good,fontSize:15,fontWeight:'900'},empty:{color:C.muted,fontSize:16,fontWeight:'900'},date:{color:C.muted,fontSize:9,marginTop:2},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{maxHeight:'82%',backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,padding:spacing.lg,gap:6},option:{minHeight:48,flexDirection:'row',alignItems:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.accent,backgroundColor:C.panel2},optionText:{flex:1,color:C.text,fontWeight:'800'},optionTextActive:{color:C.accent},optionCount:{color:C.muted,fontSize:11,fontWeight:'800'}});
