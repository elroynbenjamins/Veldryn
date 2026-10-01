import {useGameplayText} from '../i18n/gameplay';
import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {applyCharacterLoadout,characterLoadoutSlotCount,deleteCharacterLoadout,normalizeCharacterLoadouts,saveCharacterLoadout} from '../core/character-loadouts';
import {itemDef} from '../content/items';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,equipmentColors,spacing,typography} from '../theme/theme';

export function SavedLoadoutsPanel({state,onChange,onCommand}:{state:GameState;onChange:(next:GameState)=>void|Promise<void>;onCommand?:(command:GameCommand)=>void|Promise<void>}){
 const {gt,gl,language}=useGameplayText();
  const character=state.character!,slotCount=characterLoadoutSlotCount(state),loadouts=normalizeCharacterLoadouts(character.savedLoadouts,character.classId,slotCount);
  const [slot,setSlot]=useState(0),[name,setName]=useState(loadouts[0]?.name??gt('Loadout {number}',{number:1})),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const selected=loadouts.find(entry=>entry.slotIndex===slot);
  useEffect(()=>setName(selected?.name??gt('Loadout {number}',{number:slot+1})),[slot,selected?.name]);
  const run=async(action:()=>GameState,command:GameCommand,success:string)=>{setBusy(true);setMessage('');try{if(onCommand)await onCommand(command);else await onChange(action());setMessage(success)}catch(error){setMessage(error instanceof Error?error.message:gt("Loadout action failed."))}finally{setBusy(false)}};
  const equipmentNames=selected?Object.values(selected.equipment).map(id=>itemDef(id).name):[];
  const companion=selected?.companionId?COMBAT_COMPANIONS.find(def=>def.id===selected.companionId):undefined;
  return <Panel><Text style={s.title}>{gt("SAVED LOADOUTS")}</Text><Text style={s.note}>{gt("Character-specific presets remember gear, auto-eat food and the active Combat Companion. Recommended Build Guides remain separate.")}</Text>
    <View accessibilityRole="tablist" style={s.tabs}>{Array.from({length:slotCount},(_,index)=>{const preset=loadouts.find(entry=>entry.slotIndex===index);return <LoadoutChip key={index} label={`${index+1} · ${preset?.name??gt("Empty")}`} selected={slot===index} onPress={()=>setSlot(index)}/>})}</View>
    <TextInput accessibilityLabel={gt("Loadout name")} style={s.input} value={name} maxLength={28} placeholder={gt('Loadout {number}',{number:slot+1})} placeholderTextColor={C.muted} onChangeText={setName}/>
    {selected?<><Text style={s.summary}>{gt("{count}/10 gear slots",{count:equipmentNames.length})} · {selected.foodId?itemDef(selected.foodId).name:gt("No auto-eat food")} · {companion?.name??gt("No Combat Companion")}</Text><Text numberOfLines={2} style={s.note}>{equipmentNames.length?equipmentNames.join(' · '):gt("This preset has no equipped gear.")}</Text><View style={s.actions}><View style={s.flex}><GameButton title={gt("Apply")} disabled={busy} onPress={()=>void run(()=>applyCharacterLoadout(state,selected.id),{type:'loadout_apply',args:{id:selected.id}},gt('{name} applied.',{name:selected.name}))}/></View><View style={s.flex}><GameButton title={gt("Overwrite")} disabled={busy} tone="secondary" onPress={()=>void run(()=>saveCharacterLoadout(state,slot,name),{type:'loadout_save',args:{index:slot,name}},gt('{name} saved.',{name:name||gt('Loadout {number}',{number:slot+1})}))}/></View><View style={s.flex}><GameButton title={gt("Delete")} disabled={busy} tone="danger" onPress={()=>void run(()=>deleteCharacterLoadout(state,selected.id),{type:'loadout_delete',args:{id:selected.id}},gt("Loadout deleted."))}/></View></View></>:<GameButton title={gt("Save current setup")} disabled={busy} onPress={()=>void run(()=>saveCharacterLoadout(state,slot,name),{type:'loadout_save',args:{index:slot,name}},gt('{name} saved.',{name:name||gt('Loadout {number}',{number:slot+1})}))}/>} {!!message&&<View accessibilityLiveRegion="polite" style={s.messageCard}><Text style={s.messageLabel}>{gt("LOADOUT UPDATE")}</Text><Text style={s.message}>{gl(message)}</Text></View>}
  </Panel>;
}
function LoadoutChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text numberOfLines={1} style={[s.chipText,selected&&s.chipTextSelected]}>{label}</Text></Pressable>}
const s=StyleSheet.create({title:{...typography.bodyStrong,color:C.accent,letterSpacing:.7},note:{...typography.caption,color:C.muted},summary:{...typography.bodyStrong,color:C.text},tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{flex:1,minWidth:88,minHeight:40,paddingHorizontal:10,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:11,color:C.muted,fontWeight:'700'},chipTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel2,fontSize:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},flex:{flex:1,minWidth:96},messageCard:{gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.info,borderRadius:8,backgroundColor:'#102536'},messageLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:1},message:{...typography.body,color:C.text}});
