import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {Panel} from '../components/Panel';
import {ProfileScenePreview} from '../components/ProfileScenePreview';
import type {GameState} from '../core/types';
import {JOURNAL_TITLES_V42} from '../core/adventurers-journal-v42';
import {PERSONAL_RECORDS_V43,personalRecordDefinition} from '../core/personal-records-v43';
import {C,spacing,typography} from '../theme/theme';

function formatRecord(id:string,value:number){const def=personalRecordDefinition(id);if(!def)return String(value);if(def.unit==='milliseconds')return `${(value/1000).toFixed(value<10000?2:1)}s`;if(def.unit==='seconds'){const h=Math.floor(value/3600),m=Math.floor((value%3600)/60);return h?`${h}h ${m}m`:m?`${m}m`:`${Math.floor(value)}s`;}return Math.floor(value).toLocaleString();}

export function ProfileScreen({state}:{state:GameState}){
 const c=state.character,account=state.account;
 const selectedTitleId=c?account.journalState?.selectedTitleByCharacter[c.id]:undefined;
 const journalTitle=JOURNAL_TITLES_V42.find(row=>row.id===selectedTitleId)?.name;
 const title=journalTitle??c?.profileTitle??'Adventurer';
 const records=Object.values(account.journalState?.records??{}).sort((a,b)=>b.achievedAtMs-a.achievedAtMs).slice(0,3);
 return <ScrollView contentContainerStyle={s.root}>
  <Text style={s.kicker}>PUBLIC IDENTITY</Text><Text accessibilityRole="header" style={s.heading}>Profile</Text><Text style={s.copy}>Your selected character appearance, profile scene and earned identity are used wherever other players open your profile.</Text>
  {c?<ProfileScenePreview state={{...state,character:{...c,profileTitle:title}}} backgroundId={c.profileBackgroundId??'asterfall-night'}/>:<Panel><Text style={s.copy}>Create a character to build your profile.</Text></Panel>}
  <Panel><Text style={s.section}>PROFILE APPEARANCE</Text><View style={s.row}><Text style={s.label}>Character skin</Text><Text style={s.value}>{c?.selectedSkinId??'starting'}</Text></View><View style={s.row}><Text style={s.label}>Title</Text><Text style={s.value}>{title}</Text></View><View style={s.row}><Text style={s.label}>Background</Text><Text style={s.value}>{c?.profileBackgroundId??'asterfall-night'}</Text></View><View style={s.row}><Text style={s.label}>Border</Text><Text style={s.value}>{c?.profileBorderId??'Default'}</Text></View><View style={s.row}><Text style={s.label}>Active pet</Text><Text style={s.value}>{c?.selectedCosmeticPetId??'None'}</Text></View></Panel>
  <Panel><Text style={s.section}>PERSONAL RECORD SHOWCASE</Text><Text style={s.copy}>The extended V43 profile supports up to three selected record showcase slots. Until a saved showcase is configured, your three most recently improved records are previewed here locally.</Text>{records.length?records.map(record=>{const def=personalRecordDefinition(record.recordId);return <View key={record.recordId} style={s.record}><View style={s.flex}><Text style={s.recordName}>{def?.label??record.recordId}</Text><Text style={s.recordMeta}>{def?.category.toUpperCase()??'RECORD'} · {new Date(record.achievedAtMs).toLocaleDateString()}</Text></View><Text style={s.recordValue}>{formatRecord(record.recordId,record.value)}</Text></View>}):<Text style={s.empty}>No trusted Personal Records have been recorded yet.</Text>}</Panel>
  <Panel><Text style={s.section}>OWNED IDENTITY</Text><Text style={s.copy}>Journal titles: {Object.keys(account.journalState?.unlockedTitles??{}).length}/{JOURNAL_TITLES_V42.length} · Personal Records: {Object.keys(account.journalState?.records??{}).length}/{PERSONAL_RECORDS_V43.length}</Text><Text style={s.copy}>Profile cosmetics: {(account.unlockedProfileBackgroundIds?.length??0)+(account.unlockedProfileBorderIds?.length??0)+(account.unlockedCosmeticPetIds?.length??0)}</Text></Panel>
 </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},copy:{...typography.body,color:C.muted,lineHeight:21},row:{flexDirection:'row',justifyContent:'space-between',gap:spacing.md,paddingVertical:spacing.xs,borderBottomWidth:1,borderBottomColor:C.line},label:{...typography.caption,color:C.muted},value:{...typography.bodyStrong,color:C.text,textAlign:'right',maxWidth:'60%'},record:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line,paddingVertical:8},flex:{flex:1,minWidth:0},recordName:{color:C.text,fontWeight:'900'},recordMeta:{color:C.muted,fontSize:9,marginTop:2},recordValue:{color:C.good,fontSize:15,fontWeight:'900'},empty:{color:C.muted,paddingVertical:8}});
