import {Image,StyleSheet,Text,View} from 'react-native';
import type {EventReward,LiveEventDef} from '../content/live-events';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {useGameTheme} from '../theme/ThemeContext';
import {UiIcon} from './UiIcon';
import {GoldIcon} from './GoldIcon';

export const eventRewardRarity={common:'#9aa7b8',uncommon:'#70c98b',rare:'#68a9ff',epic:'#c481ff',mythic:'#ff8b8b',legendary:'#f7c55e'} as const;
/** Shared authored artwork for shop offers and personal milestone rewards. */
export function RewardArt({reward,definition,size=48}:{reward:EventReward;definition:LiveEventDef;size?:number}){
 const C=useGameTheme(),art=liveEventVisuals(definition.visualKey).rewardArt[reward.id];
 const fallback=reward.kind==='gold'?<GoldIcon size={Math.round(size*.62)}/>:<UiIcon name={reward.kind==='companion_essence'||reward.kind==='bondstones'||reward.kind==='companion'?'companions':'rewards'} size={Math.round(size*.62)}/>;
 return <View style={[s.art,{width:size,height:size,borderColor:eventRewardRarity[reward.rarity],backgroundColor:C.panel2}]}>{reward.kind==='title'?<Text accessible={false} style={{color:C.special,fontSize:Math.round(size*.52),fontWeight:'800'}}>✦</Text>:art?<Image accessible={false} source={art} resizeMode="contain" style={{width:size-8,height:size-8}}/>:fallback}</View>;
}
const s=StyleSheet.create({art:{borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center',flexShrink:0}});
