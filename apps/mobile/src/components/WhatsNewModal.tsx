import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import type {ReleaseNote,ReleaseNoteMode} from '../core/release-notes';
import {compareReleaseVersions,formatReleaseNoteDate} from '../core/release-notes';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

export function WhatsNewModal({mode='highlights',onModeChange,visible,currentVersion,notes,latestVersion,updateAvailable,reduceMotion=false,onUpdate,onClose}:{
 mode?:ReleaseNoteMode;
 onModeChange?:(mode:ReleaseNoteMode)=>void;
 visible:boolean;
 currentVersion:string;
 notes:readonly ReleaseNote[];
 latestVersion?:string;
 updateAvailable:boolean;
 reduceMotion?:boolean;
 onUpdate:()=>void|Promise<void>;
 onClose:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const renderNote=(note:ReleaseNote)=>{
  const sections=note.details??[];
  if(mode==='highlights')return note.highlights.map((highlight,index)=><Text key={index} style={s.line}>• {highlight}</Text>);
  if(!sections.length)return <View style={s.legacy}><Text style={s.muted}>Detailed notes are not available for this release. Highlights:</Text>{note.highlights.map((highlight,index)=><Text key={index} style={s.line}>• {highlight}</Text>)}</View>;
  return sections.map(section=>{
   const key=note.version+':'+section.category,open=!!expanded[key];
   return <View key={key} style={s.section}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setExpanded(old=>({...old,[key]:!open}))} style={s.sectionHeader}>
     <Text style={s.sectionTitle}>{section.category}</Text><Text style={s.count}>{section.entries.length}</Text><Text style={s.count}>{open?'−':'+'}</Text>
    </Pressable>
    {open?<View style={s.entries}>{section.entries.map((entry,index)=><Text key={index} style={s.line}>• {entry}</Text>)}</View>:null}
   </View>;
  });
 };
 const installedNotes=notes.filter(note=>compareReleaseVersions(note.version,currentVersion)<=0).slice(0,8);
 const upcomingNotes=notes.filter(note=>compareReleaseVersions(note.version,currentVersion)>0).slice(0,2);
 return <GameModalSurface visible={visible} onClose={onClose} reduceMotion={reduceMotion} presentation="dialog">
  <GameModalHeader eyebrow="VELDRYN RELEASES" title={mode==='details'?'Detailed Patch Notes':"What's New"} onClose={onClose}/>
  <Text style={s.current}>Installed version {currentVersion}</Text>
  {onModeChange?<View style={s.modeRow}>{(['highlights','details'] as const).map(item=><Pressable key={item} accessibilityRole="tab" accessibilityState={{selected:mode===item}} onPress={()=>onModeChange(item)} style={[s.modeButton,mode===item&&s.modeSelected]}><Text style={[s.modeText,mode===item&&s.modeTextSelected]}>{item==='highlights'?'Highlights':'Detailed'}</Text></Pressable>)}</View>:null}
  <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   {installedNotes.length?installedNotes.map(note=>{const date=formatReleaseNoteDate(note.publishedAt);return <View key={note.version} style={s.release}>
    <View style={s.head}><Text style={s.title}>{note.title}</Text><View style={s.meta}><Text style={s.version}>v{note.version}</Text>{date?<Text style={s.date}>{date}</Text>:null}</View></View>
    {renderNote(note)}
   </View>}):<Text style={s.muted}>Release notes will appear here when the next update is published.</Text>}
   {upcomingNotes.length>0&&updateAvailable?<View style={s.release}><Text style={s.title}>Available in the latest update</Text>{upcomingNotes.map(note=>{const date=formatReleaseNoteDate(note.publishedAt);return <View key={note.version} style={s.upcoming}><View style={s.head}><Text style={s.upcomingTitle}>{note.title}</Text><View style={s.meta}><Text style={s.version}>v{note.version}</Text>{date?<Text style={s.date}>{date}</Text>:null}</View></View>{mode==='details'?renderNote(note):note.highlights.slice(0,4).map((highlight,index)=><Text key={index} style={s.line}>• {highlight}</Text>)}</View>})}</View>:null}
  </ScrollView>
  {updateAvailable?<View style={s.update}><Text style={s.updateTitle}>Update available{latestVersion?' · v'+latestVersion:''}</Text><Text style={s.muted}>A newer release is on Google Play. You can continue playing this version until the required minimum changes.</Text><GameButton title="Update on Google Play" onPress={onUpdate}/></View>:null}
  <GameButton title="Continue playing" tone="secondary" onPress={onClose}/>
 </GameModalSurface>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 modeRow:{flexDirection:'row',gap:6,marginBottom:8},
 modeButton:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.line,padding:6},
 modeSelected:{borderColor:C.info,backgroundColor:C.infoSurface},
 modeText:{fontSize:12,fontWeight:'700',color:C.muted},modeTextSelected:{color:C.info},
 section:{borderTopWidth:1,borderTopColor:C.line},
 sectionHeader:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6},
 sectionTitle:{flex:1,fontSize:13,fontWeight:'800',color:C.text},
 count:{fontSize:12,color:C.muted,fontWeight:'700'},
 entries:{gap:6,paddingBottom:8},legacy:{gap:6},
 current:{fontSize:11,color:C.muted,fontWeight:'700',marginBottom:8},
 scroll:{maxHeight:330,flexGrow:0},content:{gap:10,paddingBottom:10},
 release:{gap:6,padding:10,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 head:{flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:15,color:C.text,fontWeight:'900'},upcomingTitle:{flex:1,fontSize:12,color:C.text,fontWeight:'800'},
 meta:{alignItems:'flex-end',gap:1},version:{fontSize:11,color:C.info,fontWeight:'800'},date:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'600'},
 line:{fontSize:13,lineHeight:19,color:C.text},
 muted:{fontSize:12,lineHeight:18,color:C.muted},
 upcoming:{gap:4,paddingTop:6,borderTopColor:C.line,borderTopWidth:1},
 update:{gap:8,padding:10,borderRadius:12,backgroundColor:C.infoSurface,borderWidth:1,borderColor:C.info},
 updateTitle:{fontSize:14,color:C.info,fontWeight:'900'}
});}
