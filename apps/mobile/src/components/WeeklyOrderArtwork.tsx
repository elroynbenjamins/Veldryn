import {View} from 'react-native';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {ItemArtwork} from './ItemArtwork';
import {UiIcon} from './UiIcon';
import {useGameTheme} from '../theme/ThemeContext';

export function WeeklyOrderArtwork({order,size=52}:{order:WeeklyOrder;size?:number}){
 const C=useGameTheme();
 const monster=order.kind==='hunt'?MONSTERS.find(row=>row.id===order.targetId):undefined;
 const itemId=order.kind==='profession'?([...GATHERING,...HERB_NODES].find(row=>row.id===order.targetId)?.itemId??RECIPES.find(row=>row.id===order.targetId)?.output.itemId):undefined;
 return <View style={{width:size,height:size,borderRadius:12,backgroundColor:C.infoSurface,alignItems:'center',justifyContent:'center',flexShrink:0}}>{monster?<MonsterPortraitFrame monster={monster} size={size} framed={false} reduceMotion/>:itemId?<ItemArtwork itemId={itemId} size={size-10}/>:<UiIcon name={order.kind==='regional'?'world':order.kind==='hunt'?'quests':'skills'} size={size-20}/>}</View>;
}
