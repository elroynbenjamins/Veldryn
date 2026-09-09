import React from 'react';
import {Modal,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {previewEquipment} from '../core/equipment-preview';
import {effectiveStats} from '../core/game';
import {itemDef} from '../content/items';
import {GameButton} from './GameButton';
import {C,spacing,typography} from '../theme/theme';
import {itemRarity,rarityMeta} from '../core/item-rarity';

export function EquipmentPreview({state,itemId,onClose}:{state:GameState;itemId:string|null;onClose:()=>void}){
  if(!itemId)return null;
  let projected:GameState;try{projected=previewEquipment(state,itemId)}catch{return null}
  const item=itemDef(itemId),before=effectiveStats(state),after=effectiveStats(projected);
  const rarity=rarityMeta(itemRarity(item));
  const oldId=item.slot?state.character!.equipment[item.slot]:undefined;
  return <Modal visible animationType="none" onRequestClose={onClose}>
    <ScrollView contentContainerStyle={s.root}><GameButton title="Close preview" tone="secondary" onPress={onClose}/>
      <View style={[s.itemFrame,{borderColor:rarity.color,backgroundColor:rarity.surface,shadowColor:rarity.color,shadowOpacity:rarity.glowOpacity}]}><Text style={[s.rarity,{color:rarity.color}]}>{rarity.symbol} {rarity.label.toUpperCase()} {item.slot?.toUpperCase()}</Text><Text style={s.title}>Compare {item.name}</Text></View><Text style={s.note}>Comparison only. No items, equipment or progress are changed.</Text>
      <Text style={s.note}>Would replace: {oldId?itemDef(oldId).name:'Empty slot'}</Text>
      <Text style={s.stats}>Attack {before.attack} → {after.attack} · Defense {before.defense} → {after.defense} · Max HP {before.hp} → {after.hp}</Text>
      <Text style={s.note}>Individual pieces do not change appearance. Equip every required piece from one set to unlock its full skin.</Text>
      <GameButton title="Back to inventory" onPress={onClose}/>
    </ScrollView>
  </Modal>;
}
const s=StyleSheet.create({root:{flexGrow:1,backgroundColor:C.bg,padding:spacing.xl,paddingTop:48,gap:spacing.md},itemFrame:{borderWidth:2,borderRadius:12,padding:spacing.md,shadowRadius:8,shadowOffset:{width:0,height:0}},rarity:{...typography.caption,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},note:{...typography.body,color:C.muted},stats:{...typography.bodyStrong,color:C.accent}});
