import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import type {ReleaseNote} from '../core/release-notes';
import {compareReleaseVersions} from '../core/release-notes';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

export function WhatsNewModal({visible,currentVersion,notes,latestVersion,updateAvailable,reduceMotion=false,onUpdate,onClose}:{
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
 const installedNotes=notes.filter(note=>compareReleaseVersions(note.version,currentVersion)<=0).slice(0,4);
 const upcomingNotes=notes.filter(note=>compareReleaseVersions(note.version,currentVersion)>0).slice(0,2);
 return <GameModalSurface visible={visible} onClose={onClose} reduceMotion={reduceMotion} presentation="dialog">
  <GameModalHeader eyebrow="VELDRYN RELEASES" title="What's New" onClose={onClose}/>
  <Text style={s.current}>Installed version {currentVersion}</Text>
  <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   {installedNotes.length?installedNotes.map(note=><View key={note.version} style={s.release}>
    <View style={s.head}><Text style={s.title}>{note.title}</Text><Text style={s.version}>v{note.version}</Text></View>
    {note.highlights.map((highlight,index)=><Text key={index} style={s.line}>• {highlight}</Text>)}
   </View>):<Text style={s.muted}>Release notes will appear here when the next update is published.</Text>}
   {upcomingNotes.length>0&&updateAvailable?<View style={s.release}><Text style={s.title}>Available in the latest update</Text>{upcomingNotes.map(note=><View key={note.version} style={s.upcoming}><Text style={s.version}>v{note.version} · {note.title}</Text>{note.highlights.slice(0,4).map((highlight,index)=><Text key={index} style={s.line}>• {highlight}</Text>)}</View>)}</View>:null}
  </ScrollView>
  {updateAvailable?<View style={s.update}><Text style={s.updateTitle}>Update available{latestVersion?' · v'+latestVersion:''}</Text><Text style={s.muted}>A newer release is on Google Play. You can continue playing this version until the required minimum changes.</Text><GameButton title="Update on Google Play" onPress={onUpdate}/></View>:null}
  <GameButton title="Continue playing" tone="secondary" onPress={onClose}/>
 </GameModalSurface>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 current:{fontSize:11,color:C.muted,fontWeight:'700',marginBottom:8},
 scroll:{maxHeight:330,flexGrow:0},content:{gap:10,paddingBottom:10},
 release:{gap:6,padding:10,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 head:{flexDirection:'row',alignItems:'center',gap:8},title:{flex:1,fontSize:15,color:C.text,fontWeight:'900'},version:{fontSize:11,color:C.info,fontWeight:'800'},
 line:{fontSize:13,lineHeight:19,color:C.text},
 muted:{fontSize:12,lineHeight:18,color:C.muted},
 upcoming:{gap:4,paddingTop:6,borderTopColor:C.line,borderTopWidth:1},
 update:{gap:8,padding:10,borderRadius:12,backgroundColor:C.infoSurface,borderWidth:1,borderColor:C.info},
 updateTitle:{fontSize:14,color:C.info,fontWeight:'900'}
});}
