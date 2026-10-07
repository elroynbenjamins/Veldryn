import {View} from 'react-native';
import type {QuestDef} from '../content/quests';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {useGameTheme} from '../theme/ThemeContext';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {ItemArtwork} from './ItemArtwork';
import {ActivityArtwork} from './ActivityArtwork';
import {UiIcon} from './UiIcon';

/** Objective art describes the work, never the reward for completing it. */
export function QuestObjectiveArtwork({quest,size=56}:{quest:QuestDef;size?:number}){
 const C=useGameTheme();
 const monster=(quest.kind==='kills'||quest.kind==='boss')?MONSTERS.find(row=>row.id===quest.targetId):undefined;
 const resource=quest.kind==='item'?quest.targetId:quest.kind==='craft'?RECIPES.find(row=>row.id===quest.targetId)?.output.itemId:quest.kind==='skillLevel'?GATHERING.find(row=>row.id===quest.targetId)?.itemId:undefined;
 return <View style={{width:size,height:size,borderRadius:12,backgroundColor:C.infoSurface,alignItems:'center',justifyContent:'center',flexShrink:0}}>
  {monster?<MonsterPortraitFrame monster={monster} size={size} framed={false} reduceMotion/>:resource?<ItemArtwork itemId={resource} size={size-12}/>:quest.skillId?<ActivityArtwork id={quest.skillId} size={size-16}/>:<UiIcon name={quest.kind==='equip'?'inventory':quest.kind==='level'?'character':quest.kind==='skillLevel'||quest.kind==='craft'?'skills':'quests'} size={size-16}/>}
 </View>;
}
