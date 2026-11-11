import {profileT,profileText} from '../../i18n/profile';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Switch,Text,View} from 'react-native';
import type {GameState} from '../../core/types';
import type {ProfileVisibilityV43} from '../../online/profile-extension-v43';
import type {ProfileExtensionDraft} from '../../online/useProfileExtensionDraft';
import type {PlayerNameStylePreference} from '../../core/player-name-style';
import type {SavePlayerNameStyle} from '../../core/player-name-style-save';
import {radii,typography,type ThemeColors} from '../../theme/theme';
import {useGameTheme} from '../../theme/ThemeContext';
import {GameButton} from '../GameButton';
import {GameTextInput} from '../GameTextInput';
import {Panel} from '../Panel';
import {PlayerNameStyleEditor} from '../PlayerNameStyleEditor';

const visibilityLabel:Record<ProfileVisibilityV43,string>={public:'Public',guild:'Guild only',private:'Private'};
const AUDIENCES=[
 {id:'private',mark:'⊘',label:'Only me',detail:'Visible only to you'},
 {id:'guild',mark:'⚔',label:'My guild',detail:'Visible to members of your guild'},
 {id:'public',mark:'◍',label:'All players',detail:'Visible to signed-in players'},
] as const satisfies readonly {id:ProfileVisibilityV43;mark:string;label:string;detail:string}[];

/** Identity is the typed half of the profile: who may read it, what it says, and how the
 * player's name is drawn. Unlike the Look tab these commit through an explicit save. */
export function ProfileIdentityPanel({state,draft,nameStyle,onNameStyleChange,onSaveNameStyle,onNameInputDirtyChange,nameResetVersion=0,active=true}:{
 state:GameState;draft:ProfileExtensionDraft;nameStyle:PlayerNameStylePreference;onNameStyleChange:(style:PlayerNameStylePreference)=>void;
 onSaveNameStyle:SavePlayerNameStyle;onNameInputDirtyChange?:(dirty:boolean)=>void;nameResetVersion?:number;active?:boolean;
}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {value,busy,guest,dirty,error,notice}=draft;
 const nameStyleCard=<Panel style={s.card}><PlayerNameStyleEditor state={state} draft={nameStyle} onDraftChange={onNameStyleChange}
  onSaveNameStyle={onSaveNameStyle} onInputDirtyChange={onNameInputDirtyChange} resetVersion={nameResetVersion} active={active}/></Panel>;

 if(!draft.online)return <View style={s.root}>
  <Panel><Text style={s.eyebrow}>{profileT(language,"SOCIAL PROFILE")}</Text><Text style={s.title}>{profileT(language,"Identity")}</Text>
   <Text style={s.copy}>{profileT(language,"Sign in when online profile services are available to publish a biography and privacy setting.")}</Text></Panel>
  {nameStyleCard}
 </View>;
 if(!value)return <View style={s.root}>
  <Panel><Text style={s.title}>{profileT(language,"Identity")}</Text>
   {busy?<Text style={s.copy}>{profileT(language,"Loading…")}</Text>:<GameButton title={profileT(language,"Load profile settings")} tone="secondary" onPress={draft.reload}/>}
   {error?<Text style={s.error}>{profileText(language,error)}</Text>:null}</Panel>
  {nameStyleCard}
 </View>;

 return <View style={s.root}>
  {guest?<View style={s.warning}><Text style={s.warningTitle}>{profileT(language,"Secure this guest account first")}</Text>
   <Text style={s.copy}>{profileT(language,"Guest progress can continue normally, but public social-profile publishing is held until the account is linked.")}</Text></View>:null}

  <Text style={s.eyebrow}>{profileT(language,"WHO CAN SEE THIS PROFILE")}</Text>
  <View accessibilityRole="radiogroup" style={s.audiences}>
   {AUDIENCES.map(row=>{const selected=value.visibility===row.id;
    return <Pressable key={row.id} accessibilityRole="radio" accessibilityState={{checked:selected,disabled:guest||busy}} accessibilityHint={profileT(language,row.detail)}
      disabled={guest||busy} onPress={()=>draft.patch({visibility:row.id})} style={({pressed})=>[s.audience,selected&&s.audienceOn,pressed&&s.pressed,(guest||busy)&&s.disabled]}>
     <Text style={s.audienceMark}>{row.mark}</Text>
     <Text style={[s.audienceLabel,selected&&s.audienceLabelOn]}>{profileT(language,row.label)}</Text>
     <Text numberOfLines={2} style={s.audienceDetail}>{profileText(language,visibilityLabel[row.id])}</Text>
    </Pressable>})}
  </View>

  <Panel style={s.card}>
   <View style={s.head}><Text style={s.eyebrow}>{profileT(language,"BIOGRAPHY")}</Text><Text style={s.counter}>{draft.bio.length}/160</Text></View>
   <GameTextInput editable={!guest&&!busy} multiline value={draft.bio} onChangeText={draft.setBio} maxLength={160}
    placeholder={profileT(language,"Tell other players a little about your character or play style.")} placeholderTextColor={C.muted} style={s.bio}/>
  </Panel>

  {nameStyleCard}

  <Panel style={s.card}>
   <Text style={s.eyebrow}>{profileT(language,"PRIVACY")}</Text>
   <View style={s.switchRow}>
    <View style={s.flex}><Text style={s.name}>{profileT(language,"Hide me from World Milestones")}</Text>
     <Text style={s.copy}>{profileT(language,"Your underlying achievement or record remains saved; recent feed cards are removed while this is enabled.")}</Text></View>
    <Switch accessibilityLabel={profileT(language,'Hide me from World Milestones')} value={value.worldFeedOptOut} disabled={guest||busy}
     trackColor={{false:C.line,true:C.selectionLine}} thumbColor={value.worldFeedOptOut?C.accent:C.muted} onValueChange={worldFeedOptOut=>draft.patch({worldFeedOptOut})}/>
   </View>
  </Panel>

  <View style={s.saveBar}>
   <View style={s.revert}><GameButton compact title={profileT(language,"Revert")} tone="secondary" disabled={!dirty||busy} onPress={draft.revert}/></View>
   <View style={s.flex}><GameButton title={busy?profileT(language,"Saving…"):dirty?profileT(language,"Save profile"):profileT(language,"Profile saved")} loading={busy} disabled={guest||busy||!dirty} onPress={()=>void draft.save()}/></View>
  </View>
  {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{profileText(language,notice)}</Text>:null}
  {error?<Text accessibilityRole="alert" style={s.error}>{profileText(language,error)}</Text>:null}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:11},flex:{flex:1,minWidth:0},pressed:{opacity:.74},disabled:{opacity:.5},
 card:{gap:9},
 eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8,flex:1,minWidth:0},
 title:{...typography.title,color:C.text},
 copy:{...typography.caption,color:C.muted,lineHeight:18},
 head:{flexDirection:'row',alignItems:'center',gap:8},
 counter:{fontSize:9.5,color:C.muted,fontWeight:'800'},
 warning:{padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},
 warningTitle:{...typography.bodyStrong,color:C.warning},
 audiences:{flexDirection:'row',gap:7},
 audience:{flex:1,minWidth:0,minHeight:72,alignItems:'center',justifyContent:'center',gap:3,paddingVertical:8,paddingHorizontal:5,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 audienceOn:{borderColor:C.selectionLine,backgroundColor:C.selection},
 audienceMark:{fontSize:15,lineHeight:18,color:C.muted},
 audienceLabel:{fontSize:11,lineHeight:14,color:C.muted,fontWeight:'800',textAlign:'center'},
 audienceLabelOn:{color:C.text},
 audienceDetail:{fontSize:8,lineHeight:10,color:C.disabled,fontWeight:'800',textAlign:'center'},
 bio:{minHeight:88,textAlignVertical:'top'},
 switchRow:{flexDirection:'row',alignItems:'center',gap:10},
 name:{...typography.bodyStrong,color:C.text},
 saveBar:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:2},
 revert:{width:104},
 notice:{color:C.good,fontWeight:'800',textAlign:'center'},
 error:{color:C.bad,fontWeight:'800',textAlign:'center'},
});}
