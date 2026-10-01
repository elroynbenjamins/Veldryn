import {profileIconCollection} from '../core/profile-icons';
import {profileT,profileText,profileError} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Keyboard,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {useAuthSession} from '../online/AuthSessionProvider';
import {onlineConfigured} from '../online/supabase';
import {selfProfileExtensionV43,updateProfileExtensionV43,type ProfileCollectionRefV43,type ProfileExtensionSelfV43,type ProfileVisibilityV43} from '../online/profile-extension-v43';
import {JOURNAL_ACHIEVEMENTS_V42} from '../core/adventurers-journal-v42';
import {personalRecordDefinition} from '../core/personal-records-v43';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import type {GameState} from '../core/types';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {profileCollectionLabel} from '../core/profile-presentation';
import {professionMasteryMasteredRecords,skillIdentity} from '../core/profession-mastery-presentation';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Picker='visibility'|'character'|'skill'|'companion'|'achievements'|'records'|'collections'|'mastery'|null;
const visibilityLabel:Record<ProfileVisibilityV43,string>={public:'Public',guild:'Guild only',private:'Private'};
const refKey=(ref:ProfileCollectionRefV43)=>ref.kind+':'+ref.id;

export function OnlineProfileExtensionPanel({state,onSaved,onDirtyChange,onDraftChange}:{state:GameState;onSaved?:()=>void|Promise<void>;onDirtyChange?:(dirty:boolean)=>void;onDraftChange?:(draft:ProfileExtensionSelfV43|null)=>void}){
 const language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {session}=useAuthSession();
 const guest=!!session?.user.is_anonymous;
 const [value,setValue]=useState<ProfileExtensionSelfV43|null>(null),[savedValue,setSavedValue]=useState<ProfileExtensionSelfV43|null>(null),[bio,setBio]=useState(''),[picker,setPicker]=useState<Picker>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const openPicker=(next:Exclude<Picker,null>)=>{Keyboard.dismiss();setPicker(next)};
 const load=async()=>{if(!onlineConfigured||!session)return;setBusy(true);setError('');try{const row=await selfProfileExtensionV43();setValue(row);setSavedValue(row);setBio(row.bio);}catch(reason){setError('Unable to load profile settings.')}finally{setBusy(false)}};
 useEffect(()=>{setValue(null);setSavedValue(null);setBio('');setPicker(null);setNotice('');setError('');void load()},[session?.user.id]);
 const characters=[...(state.character?[state.character]:[]),...(state.otherCharacters??[]).map(row=>row.character)];
 const skills=state.skills.map(row=>({id:row.skillId,label:profileText(language,row.skillId)}));
 const companions=(state.account.unlockedCombatCompanionIds??[]).map(id=>({id,label:COMBAT_COMPANIONS.find(row=>row.id===id)?.name??id.replace(/_/g,' ')}));
 const achievements=Object.keys(state.account.journalState?.unlockedAchievements??{}).map(id=>({id,label:JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id)?.title??id.replace(/_/g,' ')}));
 const records=Object.keys(state.account.journalState?.records??{}).map(id=>({id,label:profileText(language,personalRecordDefinition(id)?.label??id.replace(/_/g,' '))}));
 const masteries=professionMasteryMasteredRecords(state).map(row=>({id:row.actionId,label:row.name,meta:profileText(language,skillIdentity(row.skillId).label)+' · R50'}));
 const collections=useMemo(()=>{
  const refs:ProfileCollectionRefV43[]=[];
  const add=(kind:ProfileCollectionRefV43['kind'],id?:string)=>{if(id&&!refs.some(row=>row.kind===kind&&row.id===id))refs.push({kind,id})};
  for(const id of state.account.unlockedCosmeticPetIds??[])add('pet',id);
  for(const id of state.account.unlockedCombatCompanionIds??[])add('companion',id);
  for(const icon of profileIconCollection(state).filter(row=>row.unlocked))add('profile_icon',icon.id);
  for(const id of state.account.unlockedProfileBackgroundIds??[])add('background',id);
  add('background',state.character?.profileBackgroundId);
  for(const id of state.account.unlockedProfileBorderIds??[])add('border',id);
  add('border',state.character?.profileBorderId);
  for(const id of Object.values(state.character?.equipment??{}))add('item',id);
  for(const stack of state.inventory.stacks.filter(row=>row.quantity>0).slice(0,30))add('item',stack.itemId);
  for(const other of state.otherCharacters??[]){
   add('background',other.character.profileBackgroundId);add('border',other.character.profileBorderId);add('pet',other.character.selectedCosmeticPetId);
   for(const id of Object.values(other.character.equipment??{}))add('item',id);
   for(const stack of [...other.inventory.stacks,...other.overflow.stacks].filter(row=>row.quantity>0).slice(0,20))add('item',stack.itemId);
  }
  return refs.slice(0,100);
 },[state]);
 const labelRef=(ref:ProfileCollectionRefV43)=>profileCollectionLabel(ref);
 const patch=(next:Partial<ProfileExtensionSelfV43>)=>{setNotice('');setError('');if(value)setValue({...value,...next});};
 const toggle=(list:string[],id:string)=>list.includes(id)?list.filter(value=>value!==id):list.length<3?[...list,id]:list;
 const toggleCollection=(list:ProfileCollectionRefV43[],ref:ProfileCollectionRefV43)=>{const key=refKey(ref);return list.some(row=>refKey(row)===key)?list.filter(row=>refKey(row)!==key):list.length<3?[...list,ref]:list};
 const editableSnapshot=(row:ProfileExtensionSelfV43,bioText:string)=>({visibility:row.visibility,worldFeedOptOut:row.worldFeedOptOut,selectedCharacterId:row.selectedCharacterId??null,bio:bioText,favoriteSkillId:row.favoriteSkillId??null,favoriteCompanionId:row.favoriteCompanionId??null,achievementShowcaseIds:row.achievementShowcaseIds,collectionShowcase:row.collectionShowcase,recordShowcaseIds:row.recordShowcaseIds,masteryShowcaseActionIds:row.masteryShowcaseActionIds});
 const dirty=!!value&&!!savedValue&&JSON.stringify(editableSnapshot(value,bio))!==JSON.stringify(editableSnapshot(savedValue,savedValue.bio));
 useEffect(()=>{onDirtyChange?.(dirty)},[dirty,onDirtyChange]);
 useEffect(()=>{onDraftChange?.(value?{...value,bio}:null)},[value,bio,onDraftChange]);
 const save=async()=>{if(!value||busy||guest)return;setBusy(true);setError('');setNotice('');try{const row=await updateProfileExtensionV43({visibility:value.visibility,worldFeedOptOut:value.worldFeedOptOut,selectedCharacterId:value.selectedCharacterId??state.character?.id??null,bio, favoriteSkillId:value.favoriteSkillId,favoriteCompanionId:value.favoriteCompanionId,achievementShowcaseIds:value.achievementShowcaseIds,collectionShowcase:value.collectionShowcase,recordShowcaseIds:value.recordShowcaseIds,masteryShowcaseActionIds:value.masteryShowcaseActionIds});setValue(row);setSavedValue(row);setBio(row.bio);setNotice('Profile saved.');await onSaved?.();}catch(reason){setError('Unable to save profile settings.')}finally{setBusy(false)}};
 if(!onlineConfigured||!session)return <Panel><Text style={s.eyebrow}>{profileT(language,"SOCIAL PROFILE")}</Text><Text style={s.title}>{profileT(language,"Identity & Showcases")}</Text><Text style={s.copy}>{profileT(language,"Sign in when online profile services are available to publish a biography, privacy setting, showcase character, favorites and featured achievements, records and collectibles.")}</Text></Panel>;
 if(!value)return <Panel><Text style={s.title}>{profileT(language,"Identity & Showcases")}</Text>{busy?<ActivityIndicator color={C.accent}/>:<GameButton title={profileT(language,"Load profile settings")} tone="secondary" onPress={()=>void load()}/>} {error?<Text style={s.error}>{profileText(language,error)}</Text>:null}</Panel>;
 const selectedCharacter=characters.find(row=>row.id===(value.selectedCharacterId??state.character?.id)),selectedSkill=skills.find(row=>row.id===value.favoriteSkillId),selectedCompanion=companions.find(row=>row.id===value.favoriteCompanionId);
 const pickerTitle=picker==='visibility'?'Profile visibility':picker==='character'?'Showcase character':picker==='skill'?'Favorite skill':picker==='companion'?'Favorite companion':picker==='achievements'?'Achievement showcase':picker==='records'?'Personal Record showcase':picker==='collections'?'Collection showcase':picker==='mastery'?'Mastery showcase':'Profile settings';
 const multiPicker=picker==='achievements'||picker==='records'||picker==='collections'||picker==='mastery';
 const pickerCount=picker==='achievements'?value.achievementShowcaseIds.length:picker==='records'?value.recordShowcaseIds.length:picker==='collections'?value.collectionShowcase.length:picker==='mastery'?value.masteryShowcaseActionIds.length:0;
 const pickerMaxed=multiPicker&&pickerCount>=3;
 return <><Panel>
  <View style={s.heading}><View style={s.flex}><Text style={s.eyebrow}>{profileT(language,"SOCIAL PROFILE")}</Text><Text style={s.title}>{profileT(language,"Identity & Showcases")}</Text></View><View style={[s.saveState,dirty&&s.saveStateDirty]}><Text style={[s.saveStateText,dirty&&s.saveStateTextDirty]}>{dirty?profileT(language,"UNSAVED"):profileT(language,"SAVED")}</Text></View></View>
  <Text style={s.copy}>{profileT(language,"These settings control the profile opened from chat, Friends, guild rosters and other supported social surfaces.")}</Text>
  {guest?<View style={s.warning}><Text style={s.warningTitle}>{profileT(language,"Secure this guest account first")}</Text><Text style={s.copy}>{profileT(language,"Guest progress can continue normally, but public social-profile publishing is held until the account is linked.")}</Text></View>:null}
  <Text style={s.label}>{profileT(language,"Biography")}</Text><GameTextInput editable={!guest&&!busy} multiline value={bio} onChangeText={text=>{setNotice('');setError('');setBio(text.slice(0,160))}} maxLength={160} placeholder={profileT(language,"Tell other players a little about your character or play style.")} placeholderTextColor={C.muted} style={s.bio}/><Text style={s.counter}>{bio.length}/160</Text>
  <View style={s.sectionHead}><Text style={s.sectionLabel}>{profileT(language,"PRESENTATION")}</Text><Text style={s.sectionHint}>{profileT(language,"What players see first")}</Text></View>
  <View style={s.settings}>
   <GameButton title={profileT(language,'Showcase character: {name} ▾',{name:selectedCharacter?.name??profileT(language,'Current character')})} tone="secondary" disabled={guest||busy||characters.length<2} onPress={()=>openPicker('character')}/>
   <GameButton title={profileT(language,'Favorite skill: {name} ▾',{name:selectedSkill?.label??profileT(language,'None')})} tone="secondary" disabled={guest||busy} onPress={()=>openPicker('skill')}/>
   <GameButton title={profileT(language,'Favorite companion: {name} ▾',{name:selectedCompanion?.label??profileT(language,'None')})} tone="secondary" disabled={guest||busy} onPress={()=>openPicker('companion')}/>
  </View>
  <View style={s.sectionHead}><Text style={s.sectionLabel}>{profileT(language,"FEATURED SHOWCASES")}</Text><Text style={s.sectionHint}>{profileT(language,"Up to 3 per row")}</Text></View>
  <View style={s.settings}>
   <GameButton title={profileT(language,'{label} {count}/3 ▾',{label:profileT(language,'Achievements'),count:value.achievementShowcaseIds.length})} tone="secondary" disabled={guest||busy} onPress={()=>openPicker('achievements')}/>
   <GameButton title={profileT(language,'{label} {count}/3 ▾',{label:profileT(language,'Personal records'),count:value.recordShowcaseIds.length})} tone="secondary" disabled={guest||busy} onPress={()=>openPicker('records')}/>
   <GameButton title={profileT(language,'{label} {count}/3 ▾',{label:profileT(language,'Collection'),count:value.collectionShowcase.length})} tone="secondary" disabled={guest||busy} onPress={()=>openPicker('collections')}/>
   <GameButton title={profileT(language,'{label} {count}/3 ▾',{label:profileT(language,'Mastery'),count:value.masteryShowcaseActionIds.length})} tone="secondary" disabled={guest||busy||!masteries.length} onPress={()=>openPicker('mastery')}/>
  </View>
  <View style={s.sectionHead}><Text style={s.sectionLabel}>{profileT(language,"PRIVACY")}</Text><Text style={s.sectionHint}>{profileText(language,visibilityLabel[value.visibility])}</Text></View>
  <View style={s.settings}><GameButton title={profileT(language,'Visibility: {visibility} ▾',{visibility:profileText(language,visibilityLabel[value.visibility])})} tone="secondary" disabled={guest||busy} onPress={()=>openPicker('visibility')}/></View>
  <View style={s.switchRow}><View style={s.flex}><Text style={s.name}>{profileT(language,"Hide me from World Milestones")}</Text><Text style={s.copy}>{profileT(language,"Your underlying achievement or record remains saved; recent feed cards are removed while this is enabled.")}</Text></View><Switch accessibilityLabel={profileT(language,'Hide me from World Milestones')} value={value.worldFeedOptOut} disabled={guest||busy} trackColor={{false:C.line,true:C.selectionLine}} thumbColor={value.worldFeedOptOut?C.accent:C.muted} onValueChange={worldFeedOptOut=>patch({worldFeedOptOut})}/></View>
  <GameButton title={busy?profileT(language,"Saving…"):dirty?profileT(language,"Save Profile"):profileT(language,"Profile Saved")} disabled={guest||busy||!dirty} onPress={()=>void save()}/>{notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{profileText(language,notice)}</Text>:null}{error?<Text accessibilityRole="alert" style={s.error}>{profileText(language,error)}</Text>:null}
 </Panel>
 <GameModalSurface visible={picker!==null} reduceMotion={state.settings.reduceMotion} onClose={()=>setPicker(null)} backdropLabel={profileT(language,"Close profile picker")} surfaceStyle={s.pickerSheet}><GameModalHeader eyebrow={profileT(language,"SOCIAL PROFILE")} title={profileText(language,pickerTitle)} onClose={()=>setPicker(null)}/><Text style={s.copy}>{multiPicker?profileT(language,'{count}/3 selected · tap a selected item to remove it.',{count:pickerCount}):profileT(language,"Choose one option.")}</Text><ScrollView style={s.pickerList} contentContainerStyle={s.pickerContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  {picker==='visibility'?(['public','guild','private'] as ProfileVisibilityV43[]).map(id=><Pressable key={id} onPress={()=>{patch({visibility:id});setPicker(null)}} style={[s.option,value.visibility===id&&s.optionActive]}><Text style={s.optionText}>{value.visibility===id?'✓ ':''}{profileText(language,visibilityLabel[id])}</Text><Text style={s.optionSub}>{id==='public'?profileT(language,"Visible to signed-in players"):id==='guild'?profileT(language,"Visible to members of your guild"):profileT(language,"Visible only to you")}</Text></Pressable>):null}
  {picker==='character'?characters.map(row=>{const selected=(value.selectedCharacterId??state.character?.id)===row.id;return <Pressable key={row.id} onPress={()=>{patch({selectedCharacterId:row.id});setPicker(null)}} style={[s.option,selected&&s.optionActive]}><Text style={s.optionText}>{selected?'✓ ':''}{row.name}</Text><Text style={s.optionSub}>{row.classId.replace(/_/g,' ')} · {profileT(language,'Level {level}',{level:row.level})}{row.id===state.character?.id?' · '+profileT(language,'currently active'):''}</Text></Pressable>}):null}
  {picker==='skill'?<><Pressable onPress={()=>{patch({favoriteSkillId:null});setPicker(null)}} style={s.option}><Text style={s.optionText}>{!value.favoriteSkillId?'✓ ':''}{profileT(language,"None")}</Text></Pressable>{skills.map(row=><Pressable key={row.id} onPress={()=>{patch({favoriteSkillId:row.id});setPicker(null)}} style={[s.option,value.favoriteSkillId===row.id&&s.optionActive]}><Text style={s.optionText}>{value.favoriteSkillId===row.id?'✓ ':''}{row.label}</Text></Pressable>)}</>:null}
  {picker==='companion'?<><Pressable onPress={()=>{patch({favoriteCompanionId:null});setPicker(null)}} style={s.option}><Text style={s.optionText}>{!value.favoriteCompanionId?'✓ ':''}{profileT(language,"None")}</Text></Pressable>{companions.map(row=><Pressable key={row.id} onPress={()=>{patch({favoriteCompanionId:row.id});setPicker(null)}} style={[s.option,value.favoriteCompanionId===row.id&&s.optionActive]}><Text style={s.optionText}>{value.favoriteCompanionId===row.id?'✓ ':''}{row.label}</Text></Pressable>)}</>:null}
  {picker==='achievements'?achievements.map(row=>{const selected=value.achievementShowcaseIds.includes(row.id),disabled=pickerMaxed&&!selected;return <Pressable key={row.id} disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({achievementShowcaseIds:toggle(value.achievementShowcaseIds,row.id)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text></Pressable>}):null}
  {picker==='records'?records.map(row=>{const selected=value.recordShowcaseIds.includes(row.id),disabled=pickerMaxed&&!selected;return <Pressable key={row.id} disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({recordShowcaseIds:toggle(value.recordShowcaseIds,row.id)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text></Pressable>}):null}
  {picker==='collections'?collections.map(ref=>{const selected=value.collectionShowcase.some(row=>refKey(row)===refKey(ref)),disabled=pickerMaxed&&!selected;return <Pressable key={refKey(ref)} disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({collectionShowcase:toggleCollection(value.collectionShowcase,ref)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}><Text style={s.optionText}>{selected?'✓ ':''}{labelRef(ref)}</Text><Text style={s.optionSub}>{profileText(language,ref.kind).toUpperCase()}</Text></Pressable>}):null}
  {picker==='mastery'?masteries.map(row=>{const selected=value.masteryShowcaseActionIds.includes(row.id),disabled=pickerMaxed&&!selected;return <Pressable key={row.id} disabled={disabled} accessibilityState={{selected,disabled}} onPress={()=>patch({masteryShowcaseActionIds:toggle(value.masteryShowcaseActionIds,row.id)})} style={[s.option,selected&&s.optionActive,disabled&&s.optionDisabled]}><View style={s.optionRow}><View style={s.flex}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text><Text style={s.optionSub}>{row.meta}</Text></View><Text style={s.masteredMark}>{profileT(language,"MASTERED")}</Text></View></Pressable>}):null}
 </ScrollView><GameButton compact title={profileT(language,"Done")} onPress={()=>setPicker(null)}/></GameModalSurface></>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({heading:{flexWrap:'wrap',flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},saveState:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.panel},saveStateDirty:{borderColor:C.warning,backgroundColor:C.warningSurface},saveStateText:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.6},saveStateTextDirty:{color:C.warning},copy:{...typography.caption,color:C.muted,lineHeight:18},sectionHead:{flexWrap:'wrap',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:7},sectionLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.75},sectionHint:{fontSize:9,color:C.muted,fontWeight:'800'},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:8},bio:{minHeight:88,textAlignVertical:'top'},counter:{color:C.muted,fontSize:10,textAlign:'right'},settings:{gap:6,marginTop:6},switchRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},name:{...typography.bodyStrong,color:C.text},warning:{padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},warningTitle:{...typography.bodyStrong,color:C.warning},notice:{color:C.good,fontWeight:'800',textAlign:'center'},error:{color:C.bad,fontWeight:'800',textAlign:'center'},pickerSheet:{maxHeight:'88%',paddingHorizontal:spacing.lg,backgroundColor:C.bg,borderColor:C.line,gap:8},pickerList:{maxHeight:520},pickerContent:{gap:5,paddingBottom:8},option:{paddingVertical:10,minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.selectionLine,backgroundColor:C.selection},optionDisabled:{opacity:.4},optionRow:{flexDirection:'row',alignItems:'center',gap:8},optionText:{color:C.text,fontWeight:'800'},optionSub:{color:C.muted,fontSize:9,marginTop:2},masteredMark:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.55}});}
