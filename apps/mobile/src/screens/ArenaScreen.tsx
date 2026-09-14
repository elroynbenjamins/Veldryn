import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {CLASSES} from '../content/classes';
import {accountCharacters} from '../core/account-roster';
import {ARENA_MIN_LEVEL,ARENA_POSITIONS,arenaSquadStatus,setArenaSquadSlot} from '../core/arena-squad';
import type {GameState} from '../core/types';
import {C,spacing,typography} from '../theme/theme';

export function ArenaScreen({state,onChange}:{state:GameState;onChange:(next:GameState)=>void}){
  const entries=accountCharacters(state),status=arenaSquadStatus(state);
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>THREE-CHARACTER MODE</Text><Text style={s.heading}>Arena</Text>
    <Panel><Text style={s.title}>Build your squad</Text><Text style={s.copy}>Choose three characters from this account for Front, Middle, and Back. Any role mix is valid. Ranked matches remain disabled until the authenticated Arena service is enabled.</Text><Text style={status.ready?s.good:s.warning}>{status.ready?'Formation ready':status.reason}</Text><Text style={s.note}>{status.selectedCount}/3 selected · minimum level {ARENA_MIN_LEVEL}</Text></Panel>
    {ARENA_POSITIONS.map((position,index)=>{const selected=entries.find(entry=>entry.character.id===status.ids[index]);return <Panel key={position}><Text style={s.position}>{index+1} · {position.toUpperCase()}</Text>{selected?<><Text style={s.member}>{selected.character.name}</Text><Text style={s.note}>{CLASSES.find(def=>def.id===selected.character.classId)?.name} · Level {selected.character.level}</Text><GameButton title="Clear slot" tone="secondary" onPress={()=>onChange(setArenaSquadSlot(state,index as 0|1|2))}/></>:<Text style={s.note}>No character selected.</Text>}<View style={s.choices}>{entries.map(entry=>{const used=status.ids.includes(entry.character.id)&&entry.character.id!==selected?.character.id;const low=entry.character.level<ARENA_MIN_LEVEL;return <GameButton key={entry.character.id} title={`${entry.character.name} · Lv ${entry.character.level}`} tone={entry.character.id===selected?.character.id?'primary':'secondary'} disabled={used||low} onPress={()=>onChange(setArenaSquadSlot(state,index as 0|1|2,entry.character.id))}/>})}</View></Panel>})}
    <Panel><Text style={s.title}>Arena integrity</Text><Text style={s.copy}>The server will freeze and verify each character’s loadout before a ranked duel. Client saves only the account-owned slot selection.</Text></Panel>
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},member:{...typography.bodyStrong,color:C.text,marginTop:spacing.xs},copy:{...typography.body,color:C.muted,lineHeight:21},note:{...typography.caption,color:C.muted,marginTop:spacing.xs},warning:{...typography.bodyStrong,color:C.warning,marginTop:spacing.sm},good:{...typography.bodyStrong,color:C.good,marginTop:spacing.sm},position:{...typography.caption,color:C.accent,fontWeight:'900'},choices:{gap:spacing.xs,marginTop:spacing.sm}});
