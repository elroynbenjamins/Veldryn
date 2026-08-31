import React from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {RewardBundle} from '../core/types';
import {itemDef} from '../content/items';
import {GameButton} from './GameButton';
import {C,radii,spacing,typography} from '../theme/theme';

export function RewardPopup({reward,onClose}:{reward:RewardBundle|null;onClose:()=>void}){
  return <Modal transparent visible={reward!==null} animationType="fade" onRequestClose={onClose}>
    <Pressable accessibilityRole="button" accessibilityLabel="Close collected rewards" style={s.backdrop} onPress={onClose}>
      <Pressable accessibilityRole="none" style={s.card} onPress={()=>{}}>
        <Text style={s.eyebrow}>ACTIVITY COMPLETE</Text><Text style={s.title}>Rewards collected</Text>
        {reward&&<>
          <Text style={s.summary}>{reward.kills} {reward.kills===1?'action':'actions'} · +{reward.xp} XP · +{reward.gold} gold</Text>
          <View style={s.loot}>{reward.items.length?reward.items.map(x=><Text key={x.itemId} style={s.item}>◆ {x.quantity}× {itemDef(x.itemId).name}</Text>):<Text style={s.none}>No item drops this time.</Text>}</View>
        </>}
        <GameButton title="Continue" onPress={onClose}/>
      </Pressable>
    </Pressable>
  </Modal>;
}
const s=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(4,8,14,.82)',justifyContent:'center',padding:spacing.xl},card:{backgroundColor:C.panel,borderWidth:1,borderColor:C.accent,borderRadius:radii.lg,padding:spacing.lg,gap:spacing.md},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.hero,color:C.text},summary:{...typography.bodyStrong,color:C.good},loot:{gap:spacing.sm,paddingVertical:spacing.sm},item:{...typography.body,color:C.text},none:{...typography.body,color:C.muted}});
