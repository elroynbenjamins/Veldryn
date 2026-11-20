import {Image} from 'react-native';
import type {CoopRouteOptionView} from './coop-presentation';
import {dungeonEnemyPortraitSource,dungeonEnemyRegionalPortraitCell} from '../theme/dungeon-enemy-art';
import {regionalMonsterPortraitAtlas} from '../theme/monster-assets';
import {dungeonCombatPortraitSource} from '../theme/dungeon-combat-art';
import type {CoopRunView} from './coop-presentation';

// Assets are already bundled; this opportunistically asks native image caches
// to resolve/decode them while the player is considering their route. No server
// call, combat roll or hidden-room information is involved.
const warmed=new Set<string>();
function warm(source:Parameters<typeof Image.resolveAssetSource>[0]|undefined):void{
 // Prewarming is optional: some renderer/test hosts have no native asset-cache APIs.
 // Never let a missing cache method interrupt an actual dungeon choice or replay.
 if(!source||typeof Image.resolveAssetSource!=='function'||typeof Image.prefetch!=='function')return;
 try{
  const uri=Image.resolveAssetSource(source)?.uri;
  if(!uri||warmed.has(uri))return;
  if(warmed.size>100)warmed.clear();
  warmed.add(uri);
  void Promise.resolve(Image.prefetch(uri)).catch(()=>{}); // Bundled assets are not always remotely prefetchable.
 }catch{
  // Asset warming is a best-effort presentation optimization only.
 }
}
export function preloadDungeonCombatArt(options:readonly CoopRouteOptionView[],roleSlots:CoopRunView['roleSlots']):void{
 for(const slot of roleSlots)warm(dungeonCombatPortraitSource(slot.classId,slot.bodyPresentation??'male'));
 for(const option of options){
  for(const enemy of option.encounterPreview?.enemies??[]){
   const source=dungeonEnemyPortraitSource(enemy.name);
   warm(source??(dungeonEnemyRegionalPortraitCell(enemy.name)?regionalMonsterPortraitAtlas:undefined));
  }
 }
}
