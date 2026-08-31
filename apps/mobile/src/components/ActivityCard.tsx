import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {RewardBundle} from '../core/types';
import {itemDef} from '../content/items';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {C,spacing,typography} from '../theme/theme';

function duration(seconds:number){
  if(seconds<60)return `${seconds}s`;
  const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
  return hours?`${hours}h ${minutes}m`:`${minutes}m`;
}

export function ActivityCard({title,kind,preview,onClaim,onStop}:{title:string;kind:'combat'|'gathering';preview:RewardBundle;onClaim:()=>void;onStop:()=>void}){
  const hasRewards=preview.kills>0;
  const loot=preview.items.map(stack=>`${stack.quantity}× ${itemDef(stack.itemId).name}`).join(' · ');
  const capped=preview.elapsedSeconds>=8*60*60;
  return <Panel>
    <View style={s.heading}>
      <View style={s.headingCopy}>
        <Text style={s.eyebrow}>{kind==='combat'?'HUNTING':'GATHERING'}</Text>
        <Text style={s.title}>{title}</Text>
      </View>
      <View style={[s.status,capped&&s.statusCapped]}><Text style={s.statusText}>{capped?'8H CAP':'ACTIVE'}</Text></View>
    </View>
    <Text style={s.detail}>{duration(preview.elapsedSeconds)} accumulated · progress continues while closed</Text>
    <View style={s.rewardRow}>
      <View><Text style={s.rewardNumber}>{preview.kills}</Text><Text style={s.rewardLabel}>{kind==='combat'?'kills ready':'actions ready'}</Text></View>
      <View style={s.totals}><Text style={s.xp}>+{preview.xp} XP</Text>{preview.gold>0&&<Text style={s.gold}>+{preview.gold} gold</Text>}</View>
    </View>
    <Text style={loot?s.loot:s.emptyLoot}>{loot||'Keep this activity running to earn your first reward.'}</Text>
    {capped&&<Text style={s.capNotice}>Offline storage is full. Collect now to resume earning.</Text>}
    <GameButton title={hasRewards?'Collect Rewards':'Rewards building…'} onPress={onClaim} disabled={!hasRewards}/>
    <GameButton title="Stop Activity" onPress={onStop}/>
  </Panel>;
}

const s=StyleSheet.create({
  heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:spacing.md},
  headingCopy:{flex:1},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},
  title:{...typography.title,color:C.text},detail:{...typography.body,color:C.muted},
  status:{borderWidth:1,borderColor:C.good,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},
  statusCapped:{borderColor:C.warning},statusText:{...typography.caption,color:C.text,fontWeight:'900'},
  rewardRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:spacing.sm},
  rewardNumber:{fontSize:42,lineHeight:46,color:C.text,fontWeight:'900'},rewardLabel:{...typography.caption,color:C.muted},
  totals:{alignItems:'flex-end'},xp:{...typography.bodyStrong,color:C.good},gold:{...typography.bodyStrong,color:C.accent},
  loot:{...typography.body,color:C.text},emptyLoot:{...typography.body,color:C.muted},
  capNotice:{...typography.bodyStrong,color:C.warning},
});
