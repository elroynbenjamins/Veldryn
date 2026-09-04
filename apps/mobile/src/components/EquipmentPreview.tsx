import React from 'react';
import {Modal,ScrollView,StyleSheet,Text} from 'react-native';
import {GameState} from '../core/types';
import {previewEquipment} from '../core/equipment-layers';
import {effectiveStats} from '../core/game';
import {itemDef} from '../content/items';
import {CharacterVisual} from './CharacterVisual';
import {GameButton} from './GameButton';
import {C,spacing,typography} from '../theme/theme';

export function EquipmentPreview({state,itemId,onClose}:{state:GameState;itemId:string|null;onClose:()=>void}){
  if(!itemId)return null;
  let projected:GameState;try{projected=previewEquipment(state,itemId)}catch{return null}
  const item=itemDef(itemId),before=effectiveStats(state),after=effectiveStats(projected);
  const oldId=item.slot?state.character!.equipment[item.slot]:undefined;
  return <Modal visible animationType="none" onRequestClose={onClose}>
    <ScrollView contentContainerStyle={s.root}><GameButton title="Close preview" tone="secondary" onPress={onClose}/>
      <Text style={s.title}>Try on {item.name}</Text><Text style={s.note}>Preview only. No items, equipment or progress are changed.</Text>
      <Text style={s.note}>Would replace: {oldId?itemDef(oldId).name:'Empty slot'}</Text>
      <Text style={s.stats}>Attack {before.attack} → {after.attack} · Defense {before.defense} → {after.defense} · Max HP {before.hp} → {after.hp}</Text>
      <CharacterVisual key={itemId} state={projected} simulation/>
      <Text style={s.note}>If this combination has no matching layers, an emblem is shown. No armor is inferred from the complete-set artwork.</Text>
      <GameButton title="Back to inventory" onPress={onClose}/>
    </ScrollView>
  </Modal>;
}
const s=StyleSheet.create({root:{flexGrow:1,backgroundColor:C.bg,padding:spacing.xl,paddingTop:48,gap:spacing.md},title:{...typography.title,color:C.text},note:{...typography.body,color:C.muted},stats:{...typography.bodyStrong,color:C.accent}});
