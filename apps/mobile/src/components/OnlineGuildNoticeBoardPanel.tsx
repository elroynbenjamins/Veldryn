import {useEffect,useMemo,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {LoadingState} from './LoadingState';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {guildNoticeBoardState,updateGuildNoticeBoard,type GuildNoticeBoardState} from '../online/social';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function normalized(value:string){return value.trim().slice(0,280)}
function updatedLabel(value?:string|null){
 if(!value)return 'No notice posted yet';
 const date=new Date(value);
 return Number.isFinite(date.getTime())?'Updated '+date.toLocaleString():'Updated recently';
}

export function OnlineGuildNoticeBoardPanel(){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [board,setBoard]=useState<GuildNoticeBoardState|null>(null),[draft,setDraft]=useState(''),[editing,setEditing]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const next=await guildNoticeBoardState();setBoard(next);setDraft(next?.body??'');setEditing(false)}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load the Guild Notice Board.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const clean=normalized(draft),dirty=clean!==(board?.body??'');
 const save=async()=>{if(!board?.canEdit||busy||!dirty)return;setBusy(true);setError('');try{const next=await updateGuildNoticeBoard(clean);setBoard(next);setDraft(next.body);setEditing(false)}catch(reason){const message=reason instanceof Error?reason.message:'Unable to update the Guild Notice Board.';setError(message);Alert.alert('Guild Notice Board',message)}finally{setBusy(false)}};

 if(loading&&!board)return <LoadingState label="Loading Guild Notice Board…" detail="Syncing the private member bulletin." compact/>;
 if(!board)return <Panel><Text style={s.title}>Guild Notice Board</Text><Text style={s.copy}>{error||'Join a Guild to view its member-only Notice Board.'}</Text><GameButton compact title="Retry" tone="secondary" onPress={()=>void load()}/></Panel>;

 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>MEMBER NOTICE BOARD</Text><Text style={s.title}>Guild Notice Board</Text><Text style={s.meta}>{updatedLabel(board.updatedAt)}</Text></View><StatusPill label="MEMBERS ONLY" tone="good"/></View>
  {!editing?<View style={[s.notice,!board.body&&s.noticeEmpty]}>{board.body?<Text style={s.noticeText}>{board.body}</Text>:<><Text style={s.emptyTitle}>No notice posted</Text><Text style={s.copy}>Guild leadership can post a short member-only notice here.</Text></>}</View>:<View style={s.editor}>
   <GameTextInput accessibilityLabel="Guild Notice Board text" multiline value={draft} onChangeText={value=>setDraft(value.slice(0,280))} maxLength={280} placeholder="Raid notes, weekly priorities, Guild reminders…" placeholderTextColor={C.muted} style={s.input}/>
   <View style={s.editorMeta}><Text style={s.hint}>Visible to Guild members only · blank text clears the notice.</Text><Text style={[s.counter,draft.length>=260&&s.counterWarn]}>{draft.length}/280</Text></View>
   <View style={s.actions}><View style={s.flex}><GameButton compact title={busy?'Saving…':dirty?'Save Notice':'No Changes'} disabled={busy||!dirty} onPress={()=>void save()}/></View><View style={s.cancel}><GameButton compact title="Cancel" tone="secondary" disabled={busy} onPress={()=>{setDraft(board.body);setEditing(false)}}/></View></View>
  </View>}
  {board.canEdit&&!editing?<GameButton compact title={board.body?'Edit Notice':'Post Notice'} tone="secondary" onPress={()=>setEditing(true)}/>:null}
  {!board.canEdit?<Text style={s.readOnly}>Read-only · Your Guild role cannot edit the Notice Board.</Text>:null}
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.error}>{error}</Text></View>}
 </Panel>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},meta:{fontSize:8.5,color:C.muted,marginTop:2},
 notice:{minHeight:86,justifyContent:'center',padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},noticeEmpty:{borderStyle:'dashed',alignItems:'center'},noticeText:{fontSize:11,lineHeight:17,color:C.text},emptyTitle:{fontSize:10.5,color:C.text,fontWeight:'900'},copy:{fontSize:9.5,lineHeight:13,color:C.muted,textAlign:'center'},
 editor:{gap:7},input:{minHeight:104,textAlignVertical:'top',paddingTop:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.inputBg,color:C.text},editorMeta:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8},hint:{flex:1,fontSize:8.5,lineHeight:12,color:C.muted},counter:{fontSize:8.5,color:C.muted,fontWeight:'800'},counterWarn:{color:C.warning},
 actions:{flexDirection:'row',gap:6},cancel:{width:92},readOnly:{fontSize:8.5,lineHeight:12,color:C.muted,fontStyle:'italic'},errorCard:{padding:7,borderWidth:1,borderColor:C.bad,borderRadius:radii.sm,backgroundColor:C.badSurface},error:{fontSize:9,color:C.bad,fontWeight:'800'},
});}
