import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {useAuthSession} from '../online/AuthSessionProvider';
import {onlineConfigured} from '../online/supabase';
import {selfProfileExtensionV43,updateProfileExtensionV43,type ProfileCollectionRefV43,type ProfileExtensionSelfV43,type ProfileVisibilityV43} from '../online/profile-extension-v43';
import {JOURNAL_ACHIEVEMENTS_V42} from '../core/adventurers-journal-v42';
import {personalRecordDefinition} from '../core/personal-records-v43';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {ITEMS} from '../content/items';
import type {GameState} from '../core/types';
import {C,radii,spacing,typography} from '../theme/theme';

type Picker='visibility'|'skill'|'companion'|'achievements'|'records'|'collections'|null;
const visibilityLabel:Record<ProfileVisibilityV43,string>={public:'Public',guild:'Guild only',private:'Private'};
const refKey=(ref:ProfileCollectionRefV43)=>ref.kind+':'+ref.id;

export function OnlineProfileExtensionPanel({state,onSaved}:{state:GameState;onSaved?:()=>void|Promise<void>}){
 const {session}=useAuthSession();
 const guest=!!session?.user.is_anonymous;
 const [value,setValue]=useState<ProfileExtensionSelfV43|null>(null),[bio,setBio]=useState(''),[picker,setPicker]=useState<Picker>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=async()=>{if(!onlineConfigured||!session)return;setBusy(true);setError('');try{const row=await selfProfileExtensionV43();setValue(row);setBio(row.bio);}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load profile settings.')}finally{setBusy(false)}};
 useEffect(()=>{void load()},[session?.user.id]);
 const skills=state.skills.map(row=>({id:row.skillId,label:row.skillId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}));
 const companions=(state.account.unlockedCombatCompanionIds??[]).map(id=>({id,label:COMBAT_COMPANIONS.find(row=>row.id===id)?.name??id.replace(/_/g,' ')}));
 const achievements=Object.keys(state.account.journalState?.unlockedAchievements??{}).map(id=>({id,label:JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id)?.title??id.replace(/_/g,' ')}));
 const records=Object.keys(state.account.journalState?.records??{}).map(id=>({id,label:personalRecordDefinition(id)?.label??id.replace(/_/g,' ')}));
 const collections=useMemo(()=>{
  const refs:ProfileCollectionRefV43[]=[];
  const add=(kind:ProfileCollectionRefV43['kind'],id?:string)=>{if(id&&!refs.some(row=>row.kind===kind&&row.id===id))refs.push({kind,id})};
  for(const id of state.account.unlockedCosmeticPetIds??[])add('pet',id);
  for(const id of state.account.unlockedCombatCompanionIds??[])add('companion',id);
  for(const id of [...(state.account.unlockedEventSkinIds??[]),...(state.character?.unlockedSkinIds??[])])add('skin',id);
  for(const id of state.account.unlockedProfileBackgroundIds??[])add('background',id);
  add('background',state.character?.profileBackgroundId);
  for(const id of state.account.unlockedProfileBorderIds??[])add('border',id);
  add('border',state.character?.profileBorderId);
  for(const id of Object.values(state.character?.equipment??{}))add('item',id);
  for(const stack of state.inventory.stacks.filter(row=>row.quantity>0).slice(0,30))add('item',stack.itemId);
  return refs.slice(0,80);
 },[state]);
 const labelRef=(ref:ProfileCollectionRefV43)=>ref.kind==='companion'?(COMBAT_COMPANIONS.find(row=>row.id===ref.id)?.name??ref.id):ref.kind==='item'?(ITEMS.find(row=>row.id===ref.id)?.name??ref.id):ref.id.replace(/^pet_|^bg_|^frame_/,'').replace(/_/g,' ');
 const patch=(next:Partial<ProfileExtensionSelfV43>)=>{if(value)setValue({...value,...next});};
 const toggle=(list:string[],id:string)=>list.includes(id)?list.filter(value=>value!==id):list.length<3?[...list,id]:list;
 const toggleCollection=(list:ProfileCollectionRefV43[],ref:ProfileCollectionRefV43)=>{const key=refKey(ref);return list.some(row=>refKey(row)===key)?list.filter(row=>refKey(row)!==key):list.length<3?[...list,ref]:list};
 const save=async()=>{if(!value||busy||guest)return;setBusy(true);setError('');setNotice('');try{const row=await updateProfileExtensionV43({visibility:value.visibility,worldFeedOptOut:value.worldFeedOptOut,selectedCharacterId:state.character?.id??value.selectedCharacterId,bio, favoriteSkillId:value.favoriteSkillId,favoriteCompanionId:value.favoriteCompanionId,achievementShowcaseIds:value.achievementShowcaseIds,collectionShowcase:value.collectionShowcase,recordShowcaseIds:value.recordShowcaseIds});setValue(row);setBio(row.bio);setNotice('Public profile settings saved.');await onSaved?.();}catch(reason){setError(reason instanceof Error?reason.message:'Unable to save profile settings.')}finally{setBusy(false)}};
 if(!onlineConfigured||!session)return null;
 if(!value)return <Panel><Text style={s.title}>Public Profile Settings</Text>{busy?<ActivityIndicator color={C.accent}/>:<GameButton title="Load profile settings" tone="secondary" onPress={()=>void load()}/>} {error?<Text style={s.error}>{error}</Text>:null}</Panel>;
 const selectedSkill=skills.find(row=>row.id===value.favoriteSkillId),selectedCompanion=companions.find(row=>row.id===value.favoriteCompanionId);
 const pickerTitle=picker==='visibility'?'Profile visibility':picker==='skill'?'Favorite skill':picker==='companion'?'Favorite companion':picker==='achievements'?'Achievement showcase':picker==='records'?'Personal Record showcase':picker==='collections'?'Collection showcase':'Profile settings';
 return <><Panel>
  <View style={s.heading}><View style={s.flex}><Text style={s.eyebrow}>ONLINE PROFILE</Text><Text style={s.title}>Privacy & Showcase</Text></View><Text style={s.revision}>r{value.revision}</Text></View>
  <Text style={s.copy}>These settings control the profile opened from chat, guilds, rankings and other social surfaces.</Text>
  {guest?<View style={s.warning}><Text style={s.warningTitle}>Secure this guest account first</Text><Text style={s.copy}>Guest progress can continue normally, but public social-profile publishing is held until the account is linked.</Text></View>:null}
  <Text style={s.label}>Biography</Text><GameTextInput editable={!guest&&!busy} multiline value={bio} onChangeText={text=>setBio(text.slice(0,160))} maxLength={160} placeholder="Tell other players a little about your character or play style." placeholderTextColor={C.muted} style={s.bio}/><Text style={s.counter}>{bio.length}/160</Text>
  <View style={s.settings}>
   <GameButton title={'Visibility: '+visibilityLabel[value.visibility]+' ▾'} tone="secondary" disabled={busy} onPress={()=>setPicker('visibility')}/>
   <GameButton title={'Favorite skill: '+(selectedSkill?.label??'None')+' ▾'} tone="secondary" disabled={busy} onPress={()=>setPicker('skill')}/>
   <GameButton title={'Favorite companion: '+(selectedCompanion?.label??'None')+' ▾'} tone="secondary" disabled={busy} onPress={()=>setPicker('companion')}/>
   <GameButton title={'Achievement showcase '+value.achievementShowcaseIds.length+'/3 ▾'} tone="secondary" disabled={busy} onPress={()=>setPicker('achievements')}/>
   <GameButton title={'Record showcase '+value.recordShowcaseIds.length+'/3 ▾'} tone="secondary" disabled={busy} onPress={()=>setPicker('records')}/>
   <GameButton title={'Collection showcase '+value.collectionShowcase.length+'/3 ▾'} tone="secondary" disabled={busy} onPress={()=>setPicker('collections')}/>
  </View>
  <View style={s.switchRow}><View style={s.flex}><Text style={s.name}>Hide me from World Milestones</Text><Text style={s.copy}>Your underlying achievement/record remains saved; recent feed cards are removed when this is enabled.</Text></View><Switch value={value.worldFeedOptOut} disabled={guest||busy} onValueChange={worldFeedOptOut=>patch({worldFeedOptOut})}/></View>
  <GameButton title={busy?'Saving…':'Save Public Profile'} disabled={guest||busy} onPress={()=>void save()}/>{notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 </Panel>
 <Modal visible={picker!==null} transparent animationType="slide" onRequestClose={()=>setPicker(null)}><View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setPicker(null)}/><View style={s.sheet}><Text style={s.title}>{pickerTitle}</Text><Text style={s.copy}>{picker==='achievements'||picker==='records'||picker==='collections'?'Choose up to three.':'Choose one option.'}</Text><ScrollView style={s.pickerList} contentContainerStyle={s.pickerContent}>
  {picker==='visibility'?(['public','guild','private'] as ProfileVisibilityV43[]).map(id=><Pressable key={id} onPress={()=>{patch({visibility:id});setPicker(null)}} style={[s.option,value.visibility===id&&s.optionActive]}><Text style={s.optionText}>{value.visibility===id?'✓ ':''}{visibilityLabel[id]}</Text><Text style={s.optionSub}>{id==='public'?'Visible to signed-in players':id==='guild'?'Visible to members of your guild':'Visible only to you'}</Text></Pressable>):null}
  {picker==='skill'?<><Pressable onPress={()=>{patch({favoriteSkillId:null});setPicker(null)}} style={s.option}><Text style={s.optionText}>{!value.favoriteSkillId?'✓ ':''}None</Text></Pressable>{skills.map(row=><Pressable key={row.id} onPress={()=>{patch({favoriteSkillId:row.id});setPicker(null)}} style={[s.option,value.favoriteSkillId===row.id&&s.optionActive]}><Text style={s.optionText}>{value.favoriteSkillId===row.id?'✓ ':''}{row.label}</Text></Pressable>)}</>:null}
  {picker==='companion'?<><Pressable onPress={()=>{patch({favoriteCompanionId:null});setPicker(null)}} style={s.option}><Text style={s.optionText}>{!value.favoriteCompanionId?'✓ ':''}None</Text></Pressable>{companions.map(row=><Pressable key={row.id} onPress={()=>{patch({favoriteCompanionId:row.id});setPicker(null)}} style={[s.option,value.favoriteCompanionId===row.id&&s.optionActive]}><Text style={s.optionText}>{value.favoriteCompanionId===row.id?'✓ ':''}{row.label}</Text></Pressable>)}</>:null}
  {picker==='achievements'?achievements.map(row=>{const selected=value.achievementShowcaseIds.includes(row.id);return <Pressable key={row.id} onPress={()=>patch({achievementShowcaseIds:toggle(value.achievementShowcaseIds,row.id)})} style={[s.option,selected&&s.optionActive]}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text></Pressable>}):null}
  {picker==='records'?records.map(row=>{const selected=value.recordShowcaseIds.includes(row.id);return <Pressable key={row.id} onPress={()=>patch({recordShowcaseIds:toggle(value.recordShowcaseIds,row.id)})} style={[s.option,selected&&s.optionActive]}><Text style={s.optionText}>{selected?'✓ ':''}{row.label}</Text></Pressable>}):null}
  {picker==='collections'?collections.map(ref=>{const selected=value.collectionShowcase.some(row=>refKey(row)===refKey(ref));return <Pressable key={refKey(ref)} onPress={()=>patch({collectionShowcase:toggleCollection(value.collectionShowcase,ref)})} style={[s.option,selected&&s.optionActive]}><Text style={s.optionText}>{selected?'✓ ':''}{labelRef(ref)}</Text><Text style={s.optionSub}>{ref.kind.toUpperCase()}</Text></Pressable>}):null}
 </ScrollView><GameButton title="Done" onPress={()=>setPicker(null)}/></View></View></Modal></>;
}
const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},revision:{color:C.muted,fontSize:10,fontWeight:'900'},copy:{...typography.caption,color:C.muted,lineHeight:18},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:8},bio:{minHeight:88,textAlignVertical:'top'},counter:{color:C.muted,fontSize:10,textAlign:'right'},settings:{gap:6,marginTop:6},switchRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderTopWidth:1,borderTopColor:C.line},name:{...typography.bodyStrong,color:C.text},warning:{padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:'#332515'},warningTitle:{...typography.bodyStrong,color:C.warning},notice:{color:C.good,fontWeight:'800',textAlign:'center'},error:{color:C.bad,fontWeight:'800',textAlign:'center'},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{maxHeight:'88%',backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,padding:spacing.lg,gap:8},pickerList:{maxHeight:520},pickerContent:{gap:5,paddingBottom:8},option:{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.accent,backgroundColor:C.panel2},optionText:{color:C.text,fontWeight:'800'},optionSub:{color:C.muted,fontSize:9,marginTop:2}});
