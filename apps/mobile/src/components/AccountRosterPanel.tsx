import React,{useMemo,useState} from 'react';
import {Text,TextInput,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {accountCharacters,accountSkillLevel,unlockedCharacterSlots} from '../core/account-roster';
import {characterDeleteConfirmation} from '../core/account-actions';
import type {GameCommand} from '../core/game-commands';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {Language,t} from '../i18n';

export function AccountRosterPanel({state,language,onCommand,onCreate}:{state:GameState;language:Language;onCommand:(command:GameCommand)=>Promise<void>;onCreate:()=>void}){
 const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const entries=accountCharacters(state),slots=unlockedCharacterSlots(state);
 const [managingId,setManagingId]=useState<string>(),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const target=entries.find(entry=>entry.character.id===managingId)?.character;
 const targetStored=target?.id===state.character?.id?{activity:state.activity}:(state.otherCharacters??[]).find(entry=>entry.character.id===target?.id);
 const inactiveActivity=!!target&&target.id!==state.character?.id&&!!targetStored?.activity;
 const required=target?characterDeleteConfirmation(target.name):'';
 const confirmed=!!target&&confirmation===required;
 const close=()=>{if(busy)return;setManagingId(undefined);setConfirmation('');setError('')};
 const open=(id:string)=>{setManagingId(id);setConfirmation('');setError('')};
 const remove=async(recreate:boolean)=>{
  if(!target||!confirmed||inactiveActivity||busy)return;
  setBusy(true);setError('');
  try{
   await onCommand({type:'roster_delete',args:{id:target.id,confirmation}});
   setManagingId(undefined);setConfirmation('');
   if(recreate)onCreate();
  }catch(e){setError(e instanceof Error?e.message:'Character could not be deleted.');}
  finally{setBusy(false);}
 };
 return <><Panel>
  <Text style={s.title}>{t(language,'roster.title')}</Text>
  <Text style={s.body}>{t(language,'roster.skillsSlots')} {accountSkillLevel(state)} · slots {entries.length}/{slots}</Text>
  <Text style={s.note}>Character slots, account unlocks, premium currency, collectibles, companions and Guild membership are account-wide. Deleting a character removes that character's levels, skills, class progress, appearance unlocks and Gold.</Text>
  {entries.map(entry=>{const active=entry.character.id===state.character?.id;return <View key={entry.character.id} style={s.row}><View style={s.copy}><Text style={s.name}>{entry.character.name}</Text><Text style={s.meta}>{entry.character.classId} · Level {entry.character.level}</Text>{active&&<View style={s.activeBadge}><Text style={s.active}>{t(language,'roster.active')}</Text></View>}</View><View style={s.actions}>{!active&&<GameButton compact title={t(language,'roster.switch')} onPress={()=>void onCommand({type:'roster_switch',args:{id:entry.character.id}})}/>}<GameButton compact title="Manage" tone="secondary" onPress={()=>open(entry.character.id)}/></View></View>})}
  {entries.length<slots&&<GameButton title={t(language,'roster.create')} tone="secondary" onPress={onCreate}/>}
 </Panel>
 <GameModalSurface visible={!!target} presentation="dialog" reduceMotion={state.settings.reduceMotion} onClose={close} backdropLabel="Close character management">
  <GameModalHeader eyebrow="CHARACTER MANAGEMENT" title={target?target.name:'Character'} onClose={close} closeDisabled={busy}/>
  {target&&<View style={s.modalBody}>
   <View style={s.warning}><Text style={s.warningTitle}>Permanent character reset</Text><Text style={s.warningText}>Inventory, equipped gear, tools, food and socketed gems are recovered to the shared Bank first, then Overflow if Bank is full. Temper ranks and all character-bound progression are removed with this character.</Text></View>
   {inactiveActivity?<Text style={s.blocked}>This character is still running an activity. Switch to it and stop or claim the activity before deleting.</Text>:null}
   <Text style={s.confirmLabel}>Type <Text style={s.confirmCode}>{required}</Text> to continue.</Text>
   <TextInput accessibilityLabel="Character deletion confirmation" autoCapitalize="characters" autoCorrect={false} editable={!busy&&!inactiveActivity} value={confirmation} onChangeText={value=>{setConfirmation(value);setError('')}} placeholder={required} placeholderTextColor={C.muted} style={s.input}/>
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
   <GameButton title={busy?'Deleting…':'Delete & recreate'} disabled={!confirmed||inactiveActivity||busy} tone="danger" onPress={()=>void remove(true)}/>
   {entries.length>1?<GameButton title="Delete character" disabled={!confirmed||inactiveActivity||busy} tone="secondary" onPress={()=>void remove(false)}/>:null}
   <Text style={s.footnote}>{entries.length===1?'This is your only character, so deletion returns you directly to class creation.':'Delete & recreate frees this slot and opens class creation immediately. Plain Delete keeps your remaining roster.'}</Text>
  </View>}
 </GameModalSurface>
 </>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},note:{...typography.caption,color:C.muted,lineHeight:18,marginTop:spacing.xs},
 copy:{flex:1,minWidth:0,gap:2},name:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},actions:{flexDirection:'row',alignItems:'center',gap:spacing.xs,flexWrap:'wrap',justifyContent:'flex-end'},
 activeBadge:{alignSelf:'flex-start',paddingHorizontal:spacing.xs,paddingVertical:2,borderWidth:1,borderColor:equipmentColors.goldSoft,borderRadius:99,backgroundColor:C.panel2},active:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:C.line},
 modalBody:{gap:spacing.md,paddingBottom:spacing.lg},warning:{borderWidth:1,borderColor:C.warning,backgroundColor:C.warningSurface,padding:spacing.md,borderRadius:10,gap:4},warningTitle:{...typography.bodyStrong,color:C.warning},warningText:{...typography.caption,color:C.text,lineHeight:18},
 blocked:{...typography.bodyStrong,color:C.bad},confirmLabel:{...typography.body,color:C.text},confirmCode:{fontWeight:'900',color:C.bad},
 input:{minHeight:48,borderWidth:1,borderColor:C.lineStrong,borderRadius:8,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel2,...typography.body},error:{...typography.caption,color:C.bad},footnote:{...typography.caption,color:C.muted,lineHeight:18}
});}
