import {useMemo} from 'react';
import type {StyleProp,ViewStyle} from 'react-native';
import type {GameState} from '../core/types';
import {activeGatheringRuntimeProjection} from '../core/balance-projection';
import {offlineCapBreakdown,previewActivityReward} from '../core/game';
import {isGatheringSceneKind} from '../core/gathering-scene';
import {bucketedMs} from '../core/use-delayed-busy';
import {GatheringScene} from './GatheringScene';

/**
 * The gathering scene for whatever the player is gathering right now, or nothing.
 * `skillId` limits it to one skill so a skill page only shows its own activity.
 * The scene keeps working only while the activity can still progress.
 */
export function ActiveGatheringScene({state,nowMs,skillId,style}:{state:GameState;nowMs:number;skillId?:string;style?:StyleProp<ViewStyle>}){
  const activity=state.activity;
  const runtime=useMemo(()=>activeGatheringRuntimeProjection(state),[state]);
  const visible=!!activity&&!!runtime&&isGatheringSceneKind(activity.kind)&&(!skillId||activity.kind===skillId);
  // Gathering previews are cheap, but a 5s bucket is plenty to notice a stop or a full reserve.
  const checkedAtMs=bucketedMs(nowMs,5_000);
  const working=useMemo(()=>{
    if(!visible)return false;
    const preview=previewActivityReward(state,checkedAtMs);
    return !preview.stoppedReason&&preview.elapsedSeconds<offlineCapBreakdown(state).hours*3600;
  },[visible,state,checkedAtMs]);
  if(!visible||!activity||!runtime)return null;
  return <GatheringScene activity={activity} cycleSeconds={runtime.cycleSeconds} reduceMotion={state.settings.reduceMotion} working={working} style={style}/>;
}
