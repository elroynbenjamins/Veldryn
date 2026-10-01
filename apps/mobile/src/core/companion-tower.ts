import {COMPANION_TRIAL_BOSS_INTERVAL,COMPANION_TRIAL_FLOOR_COUNT} from '../../../../backend/src/server/companions/content';

/** Presentation only. Browsing a chamber never changes the run/checkpoint. */
export function companionTowerFloors(chamber:number,currentFloor:number,highestFloor:number){
 const count=Math.ceil(COMPANION_TRIAL_FLOOR_COUNT/COMPANION_TRIAL_BOSS_INTERVAL);
 const page=Math.max(0,Math.min(count-1,Math.floor(chamber)||0));
 return Array.from({length:COMPANION_TRIAL_BOSS_INTERVAL},(_,index)=>{
  const floor=page*COMPANION_TRIAL_BOSS_INTERVAL+index+1;
  return {floor,boss:floor%COMPANION_TRIAL_BOSS_INTERVAL===0,current:floor===currentFloor,cleared:floor<=highestFloor};
 }).filter(row=>row.floor<=COMPANION_TRIAL_FLOOR_COUNT).reverse();
}
