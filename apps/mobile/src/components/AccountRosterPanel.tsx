import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {ClassId,GameState} from '../core/types';
import {accountCharacters,accountSkillLevel,unlockedCharacterSlots} from '../core/account-roster';
import type {GameCommand} from '../core/game-commands';
import {CLASSES} from '../content/classes';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {C,equipmentColors,spacing,typography} from '../theme/theme';
import {Language,t} from '../i18n';

export function AccountRosterPanel({state,language,onCommand,onCreate}:{state:GameState;language:Language;onCommand:(command:GameCommand)=>Promise<void>;onCreate:()=>void}){
 const entries=accountCharacters(state),slots=unlockedCharacterSlots(state),active=state.character!;
 const [mode,setMode]=useState<'none'|'reroll'|'delete'>('none'),[classId,setClassId]=useState<ClassId>(active.classId),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const close=()=>{setMode('none');setConfirmation('');setClassId(active.classId);setMessage('');};
 const run=async(command:GameCommand)=>{if(busy)return;setBusy(true);setMessage('');try{await onCommand(command);close();}catch(error){setMessage(error instanceof Error?error.message:'Character action failed.');}finally{setBusy(false);}};
 const confirmed=confirmation===active.name;
 return <Panel>
  <Text style={s.title}>{t(language,'roster.title')}</Text>
  <Text style={s.body}>{t(language,'roster.skillsSlots')} {accountSkillLevel(state)} · slots {entries.length}/{slots}</Text>
  {entries.map(entry=>{const isActive=entry.character.id===active.id;return <View key={entry.character.id} style={s.row}><View style={s.copy}><Text style={s.name}>{entry.character.name}</Text><Text style={s.meta}>{CLASSES.find(item=>item.id===entry.character.classId)?.name??entry.character.classId} · Lv. {entry.character.level}</Text>{isActive&&<View style={s.activeBadge}><Text style={s.active}>{t(language,'roster.active')}</Text></View>}</View>{!isActive&&<GameButton compact title={t(language,'roster.switch')} disabled={busy} onPress={()=>void onCommand({type:'roster_switch',args:{id:entry.character.id}})}/>}</View>})}
  {entries.length<slots&&<GameButton title={t(language,'roster.create')} tone="secondary" disabled={busy} onPress={onCreate}/>}
  <View style={s.management}>
   <View style={s.managementHead}><View style={s.copy}><Text style={s.managementTitle}>Character management</Text><Text style={s.meta}>Reset the active slot to another class, or permanently remove it.</Text></View></View>
   <View style={s.actions}><GameButton compact title={mode==='reroll'?'Close reroll':'Reroll class'} tone="secondary" disabled={busy} onPress={()=>{if(mode==='reroll')close();else{setMode('reroll');setClassId(active.classId);setConfirmation('');setMessage('');}}}/><GameButton compact title={mode==='delete'?'Close delete':'Delete character'} tone="secondary" disabled={busy||entries.length<=1} onPress={()=>{if(mode==='delete')close();else{setMode('delete');setConfirmation('');setMessage('');}}}/></View>
   {entries.length<=1&&<Text style={s.safeNote}>Your final character cannot be deleted. Use reroll if you want to choose a different class.</Text>}
   {mode==='reroll'&&<View style={s.dangerBox}>
    <Text style={s.warningTitle}>REROLL {active.name.toUpperCase()}</Text>
    <Text style={s.body}>Keeps the character slot, name, body presentation, account unlocks, bank, premium currency, collections and entitlements. Character level, skills, inventory, quests, equipment, gems, loadouts and other character-bound progress restart from the beginning.</Text>
    <Text style={s.label}>New class</Text>
    <View style={s.classGrid}>{CLASSES.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:classId===item.id,disabled:item.id===active.classId}} disabled={item.id===active.classId||busy} onPress={()=>setClassId(item.id)} style={[s.classChip,classId===item.id&&s.classChipOn,item.id===active.classId&&s.classChipDisabled]}><Text style={[s.classChipText,classId===item.id&&s.classChipTextOn]}>{item.name}</Text></Pressable>)}</View>
    <Text style={s.label}>Type {active.name} to confirm</Text><GameTextInput value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="none" autoCorrect={false} style={s.input}/>
    <GameButton title={busy?'Rerolling…':'Confirm class reroll'} disabled={busy||!confirmed||classId===active.classId} onPress={()=>void run({type:'roster_reroll',args:{classId,confirmationName:confirmation}})}/>
   </View>}
   {mode==='delete'&&<View style={s.dangerBox}>
    <Text style={s.warningTitle}>DELETE {active.name.toUpperCase()}</Text>
    <Text style={s.body}>Permanent. Character-bound progression and inventory are removed. Account-wide unlocks, shared bank, premium currency, entitlements and permanently earned character slots stay on the account.</Text>
    <Text style={s.label}>Type {active.name} to confirm</Text><GameTextInput value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="none" autoCorrect={false} style={s.input}/>
    <GameButton title={busy?'Deleting…':'Permanently delete character'} disabled={busy||!confirmed||entries.length<=1} onPress={()=>void run({type:'roster_delete',args:{confirmationName:confirmation}})}/>
   </View>}
   {!!message&&<Text accessibilityLiveRegion="polite" style={s.error}>{message}</Text>}
  </View>
 </Panel>;
}
const s=StyleSheet.create({title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},name:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},copy:{flex:1,minWidth:0,gap:3},activeBadge:{alignSelf:'flex-start',paddingHorizontal:spacing.xs,paddingVertical:2,borderWidth:1,borderColor:equipmentColors.goldSoft,borderRadius:99,backgroundColor:'#27241b'},active:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:C.line},management:{gap:spacing.sm,marginTop:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},managementHead:{flexDirection:'row',alignItems:'center'},managementTitle:{...typography.bodyStrong,color:C.text},actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},safeNote:{...typography.caption,color:C.info},dangerBox:{gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.warning,backgroundColor:C.panel2},warningTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},label:{...typography.caption,color:C.text,fontWeight:'800'},input:{minHeight:44,borderWidth:1,borderColor:C.line,color:C.text,paddingHorizontal:spacing.sm},classGrid:{flexDirection:'row',flexWrap:'wrap',gap:6},classChip:{minHeight:36,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},classChipOn:{borderColor:equipmentColors.selectedLine,backgroundColor:C.selection},classChipDisabled:{opacity:.4},classChipText:{...typography.caption,color:C.muted,fontWeight:'800'},classChipTextOn:{color:C.text},error:{...typography.caption,color:C.bad}});
