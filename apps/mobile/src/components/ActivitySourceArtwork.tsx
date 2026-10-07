import {View} from 'react-native';
import type {ActivitySourceDestination} from '../core/activity-source-navigation';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {ActivityArtwork} from './ActivityArtwork';
import {ItemArtwork} from './ItemArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {UiIcon} from './UiIcon';
import {useGameTheme} from '../theme/ThemeContext';

/** Identify the activity that supplies an item, rather than repeating the requested item. */
export function ActivitySourceArtwork({source,size=36}:{source?:ActivitySourceDestination;size?:number}){
 const C=useGameTheme();
 let artwork;
 if(source?.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===source.monsterId);
  if(monster)artwork=<MonsterPortraitFrame monster={monster} size={size} framed={false} reduceMotion/>;
 }else if(source?.kind==='skills'){
  const node=[...GATHERING,...HERB_NODES].find(row=>row.id===source.actionId);
  const recipe=RECIPES.find(row=>row.id===source.recipeId);
  if(node)artwork=node.id==='DEWLEAF_PATCH'?<ActivityArtwork id={node.skillId} size={size}/>:<ItemArtwork itemId={node.itemId} size={size}/>;
  else if(recipe)artwork=<ItemArtwork itemId={recipe.output.itemId} size={size}/>;
  else if(source.skillId)artwork=<ActivityArtwork id={source.skillId} size={size}/>;
 }
 return <View accessible={false} style={{width:size+8,height:size+8,flexShrink:0,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderRadius:10,borderWidth:1,borderColor:C.line}}>{artwork??<UiIcon name={source?.kind==='world'||source?.kind==='dungeon'?'world':'inventory'} size={size}/>}</View>;
}
