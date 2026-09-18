import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,TextInput,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {applyCharacterLoadout,CHARACTER_LOADOUT_SLOT_COUNT,deleteCharacterLoadout,normalizeCharacterLoadouts,saveCharacterLoadout} from '../core/character-loadouts';
import {itemDef} from '../content/items';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,spacing,typography} from '../theme/theme';

export function SavedLoadoutsPanel({state,onChange,onCommand}:{state:GameState;onChange:(next:GameState)=>void|Promise<void>;onCommand?:(command:GameCommand)=>Promise<void>}){
  const character=state.character!,loadouts=normalizeCharacterLoadouts(character.savedLoadouts,character.classId);
  const [slot,setSlot]=useState(0),[name,setName]=useState(loadouts[0]?.name??'Loadout 1'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const selected=loadouts.find(entry=>entry.slotIndex===slot);
  useEffect(()=>setName(selected?.name??`Loadout ${slot+1}`),[slot,selected?.name]);
  const run=async(action:()=>GameState,success:string,command?:GameCommand)=>{setBusy(true);setMessage('');try{if(onCommand&&command)await onCommand(command);else await onChange(action());setMessage(success)}catch(error){setMessage(error instanceof Error?error.message:'Loadout action failed.')}finally{setBusy(false)}};
  const equipmentNames=selected?Object.values(selected.equipment).map(id=>itemDef(id).name):[];
  const companion=selected?.companionId?COMBAT_COMPANIONS.find(def=>def.id===selected.companionId):undefined;
  return <Panel><Text style={s.title}>SAVED LOADOUTS</Text><Text style={s.note}>Character-specific presets remember gear, auto-eat food and the active Combat Companion. Recommended Build Guides remain separate.</Text>
    <View style={s.tabs}>{Array.from({length:CHARACTER_LOADOUT_SLOT_COUNT},(_,index)=>{const preset=loadouts.find(entry=>entry.slotIndex===index);return <View key={index} style={s.tab}><GameButton title={`${index+1} · ${preset?.name??'Empty'}`} tone={slot===index?'primary':'secondary'} onPress={()=>setSlot(index)}/></View>})}</View>
    <TextInput accessibilityLabel="Loadout name" style={s.input} value={name} maxLength={28} placeholder={`Loadout ${slot+1}`} placeholderTextColor={C.muted} onChangeText={setName}/>
    {selected?<><Text style={s.summary}>{equipmentNames.length}/10 gear slots · {selected.foodId?itemDef(selected.foodId).name:'No auto-eat food'} · {companion?.name??'No Combat Companion'}</Text><Text numberOfLines={2} style={s.note}>{equipmentNames.length?equipmentNames.join(' · '):'This preset has no equipped gear.'}</Text><View style={s.actions}><View style={s.flex}><GameButton title="Apply" disabled={busy} onPress={()=>void run(()=>applyCharacterLoadout(state,selected.id),`${selected.name} applied.`,{type:'loadout_apply',args:{id:selected.id}})}/></View><View style={s.flex}><GameButton title="Overwrite" disabled={busy} tone="secondary" onPress={()=>void run(()=>saveCharacterLoadout(state,slot,name),`${name||`Loadout ${slot+1}`} saved.`,{type:'loadout_save',args:{index:slot,name}})}/></View><View style={s.flex}><GameButton title="Delete" disabled={busy} tone="danger" onPress={()=>void run(()=>deleteCharacterLoadout(state,selected.id),'Loadout deleted.',{type:'loadout_delete',args:{id:selected.id}})}/></View></View></>:<GameButton title="Save current setup" disabled={busy} onPress={()=>void run(()=>saveCharacterLoadout(state,slot,name),`${name||`Loadout ${slot+1}`} saved.`,{type:'loadout_save',args:{index:slot,name}})}/>} {!!message&&<Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
  </Panel>;
}
const s=StyleSheet.create({title:{...typography.bodyStrong,color:C.accent,letterSpacing:.7},note:{...typography.caption,color:C.muted},summary:{...typography.bodyStrong,color:C.text},tabs:{flexDirection:'row',gap:spacing.xs},tab:{flex:1,minWidth:0},input:{minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:spacing.md,color:C.text,backgroundColor:C.panel2,fontSize:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},flex:{flex:1,minWidth:96},message:{...typography.bodyStrong,color:C.info,textAlign:'center'}});
