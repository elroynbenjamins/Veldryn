import type {GameState} from './types';
import type {WeeklyOrder} from './weekly-orders-v41';
import {weeklyOrderQueueActivity} from './weekly-order-integrations-v41';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {WORLD_ZONES} from '../content/world-map';
import {regionalArea} from '../content/regional-areas';
import {encounterLockRequirement,regionTravelAvailability,regionTravelLockReason} from './world-navigation';

/** Contracts are shortcuts to normal, server-validated gameplay commands.
 * Never use an order's display label as an activity ID or bypass its region gate.
 * Bosses, recipes and broad regional jobs deliberately retain manual navigation.
 */
export type WeeklyOrderQuickStartPlan =
 |{status:'manual'}
 |{status:'blocked';reason:string}
 |{status:'ready';kind:'combat'|'gathering';targetId:string;regionId:string;needsTravel:boolean};

export function weeklyOrderQuickStartPlan(state:GameState,order:WeeklyOrder):WeeklyOrderQuickStartPlan{
 const queued=weeklyOrderQueueActivity(order);
 if(!queued||queued.kind!=='combat'&&queued.kind!=='gathering')return {status:'manual'};
 if(order.claimed||order.progress>=order.target)return {status:'blocked',reason:'This contract is already complete.'};
 if(!state.character)return {status:'blocked',reason:'Create a character before starting a contract.'};

 let regionId:string;
 if(queued.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===queued.targetId);
  if(!monster)return {status:'blocked',reason:'This enemy is no longer available.'};
  if(monster.boss)return {status:'manual'};
  const region=WORLD_ZONES.find(row=>row.name===monster.zone);
  if(!region)return {status:'blocked',reason:'The enemy region is not available.'};
  regionId=region.id;
  const lock=encounterLockRequirement(state,monster);
  if(lock){
   const reason=lock.kind==='level'?`Reach Level ${lock.level} to fight ${monster.name}.`
    :lock.kind==='exploration'?`Explore ${lock.routeName} to unlock ${monster.name}.`
    :lock.kind==='story'?`Complete the story requirement for ${monster.name} first.`
    :`${monster.name} is not unlocked yet.`;
   return {status:'blocked',reason};
  }
  if(state.character.currentHp<=1)return {status:'blocked',reason:'Too injured to fight. Heal before starting this hunt.'};
 }else{
  const node=[...GATHERING,...HERB_NODES].find(row=>row.id===queued.targetId);
  if(!node)return {status:'blocked',reason:'This gathering activity is no longer available.'};
  regionId=node.zoneId;
  const skillLevel=state.skills.find(row=>row.skillId===node.skillId)?.level??0;
  if(skillLevel<node.unlockLevel)return {status:'blocked',reason:`Requires ${node.skillId} Level ${node.unlockLevel}.`};
  const area=regionalArea(node.zoneId,node.areaId);
  if(area&&state.character.level<area.minLevel)return {status:'blocked',reason:`Reach Level ${area.minLevel} to access ${area.name}.`};
 }
 const region=WORLD_ZONES.find(row=>row.id===regionId);
 if(!region)return {status:'blocked',reason:'This contract region is not available.'};
 if(regionTravelAvailability(state,region)!=='available')return {status:'blocked',reason:regionTravelLockReason(state,region)??'This region is locked.'};
 return {status:'ready',kind:queued.kind,targetId:queued.targetId,regionId,needsTravel:regionId!==state.currentRegionId};
}
