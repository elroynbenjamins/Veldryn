import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import type {GameState} from '../core/types';
import {applyCharacterLoadout,CHARACTER_LOADOUT_SLOT_COUNT,deleteCharacterLoadout,normalizeCharacterLoadouts,saveCharacterLoadout} from '../core/character-loadouts';
import {itemDef} from '../content/items';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,equipmentColors,spacing,typography} from '../theme/theme';

export function SavedLoadoutsPanel({state,onChange}:{state:GameState;onChange:(next:GameState)=>void|Promise<void>}){
  const character=state.character!,loadouts=normalizeCharacterLoadouts(character.savedLoadouts,character.classId);
  const [slot,setSlot]=useState(0),[name,setName]=useState(loadouts[0]?.name??'Loadout 1'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const selected=loadouts.find(entry=>entry.slotIndex===slot);
  useEffect(()=>setName(selected?.name??`Loadout ${slot+1}`),[slot,selected?.name]);
  const run=async(action:()=>GameState,success:string)=>{setBusy(true);setMessage('');try{await onChange(action());setMessage(success)}catch(error){setMessage(error instanceof Error?error.message:'Loadout action failed.')}finally{setBusy(false)}};
  const equipmentNames=selected?Object.values(selected.equipment).map(id=>itemDef(id).name):[];
  const companion=selected?.companionId?COMBAT_COMPANIONS.find(def=>def.id===selected.companionId):undefined;
  return <Panel><Text style={s.title}>SAVED LOADOUTS</Text><Text style={s.note}>Character-specific presets remember gear, auto-eat food and the active Combat Companion. Recommended Build Guides remain separate.</Text>
    <View accessibilityRole="tablist" style={s.tabs}>{Array.from({length:CHARACTER_LOADOUT_SLOT_COUNT},(_,index)=>{const preset=loadouts.find(entry=>entry.slotIndex===index);return <LoadoutChip key={index} label={`${index+1} · ${preset?.name??'Empty'}`} selected={slot===index} onPress={()=>setSlot(index)}/>})}</View>
    <TextInput accessibilityLabel="Loadout name" style={s.input} value={name} maxLength={28} placeholder={`Loadout ${slot+1}`} placeholderTextColor={C.muted} onChangeText={setName}/>
    {selected?<><Text style={s.summary}>{equipmentNames.length}/10 gear slots · {selected.foodId?itemDef(selected.foodId).name:'No auto-eat food'} · {companion?.name??'No Combat Companion'}</Text><Text numberOfLines={2} style={s.note}>{equipmentNames.length?equipmentNames.join(' · '):'This preset has no equipped gear.'}</Text><View style={s.actions}><View style={s.flex}><GameButton title="Apply" disabled={busy} onPress={()=>void run(()=>applyCharacterLoadout(state,selected.id),`${selected.name} applied.`)}/></View><View style={s.flex}><GameButton title="Overwrite" disabled={busy} tone="secondary" onPress={()=>void run(()=>saveCharacterLoadout(state,slot,name),`${name||`Loadout ${slot+1}`} saved.`)}/></View><View style={s.flex}><GameButton title="Delete" disabled={busy} tone="danger" onPress={()=>void run(()=>deleteCharacterLoadout(state,selected.id),'Loadout deleted.')}/></View></View></>:<GameButton title="Save current setup" disabled={busy} onPress={()=>void run(()=>saveCharacterLoadout(state,slot,name),`${name||`Loadout ${slot+1}`} saved.`)}/>} {!!message&&<View accessibilityLiveRegion="polite" style={s.messageCard}><Text style={s.messageLabel}>LOADOUT UPDATE</Text><Text style={s.message}>{message}</Text></View>}
  </Panel>;
}
function LoadoutChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text numberOfLines={1} style={[s.chipText,selected&&s.chipTextSelected]}>{label}</Text></Pressable>}
const s=StyleSheet.create({title:{...typography.bodyStrong,color:C.accent,letterSpacing:.7},note:{...typography.caption,color:C.muted},summary:{...typography.bodyStrong,color:C.text},tabs:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{flex:1,minWidth:88,minHeight:40,paddingHorizontal:10,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:11,color:C.muted,fontWeight:'700'},chipTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel2,fontSize:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},flex:{flex:1,minWidth:96},messageCard:{gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.info,borderRadius:8,backgroundColor:'#102536'},messageLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:1},message:{...typography.body,color:C.text}});
