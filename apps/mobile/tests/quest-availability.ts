import {createCharacter,newGame} from '../src/core/game';
import {weeklyOrderLockReason} from '../src/core/quest-availability';
import type {WeeklyOrder} from '../src/core/weekly-orders-v41';
import {GATHERING} from '../src/content/skills';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const state=createCharacter(newGame(1000),'IRONWARDEN');
function order(targetId:string,kind:WeeklyOrder['kind']='hunt',regionId='GREENFIELDS'):WeeklyOrder{
 return {id:'test',weekKey:'2026-W40',slot:0,kind,title:'Test',targetId,regionId,activityId:targetId,source:{kind:'monster',id:targetId,label:'Test',available:true},target:10,progress:0,reward:{rewardRef:'test',label:'Test'},claimed:false};
}
ok(!weeklyOrderLockReason(state,order('MOSS_RAT')),'Unlocked hunt stays available');
state.character!.level=25;
const hunt=order('LANTERN_WRETCH','hunt','KINGS_ROAD');
ok(weeklyOrderLockReason(state,hunt)?.includes('scouting'),'Level alone does not unlock a route');
state.exploredRouteIds=[...(state.exploredRouteIds??[]),'SCOUT_OLD_MINES'];
ok(weeklyOrderLockReason(state,hunt)?.includes('Discover'),'Level alone does not discover encounters');
state.unlockedMonsterIds.push('LANTERN_WRETCH');
ok(!weeklyOrderLockReason(state,hunt),'Unlocked destination in another region is not locked');
state.unlockedMonsterIds=[];
ok(!weeklyOrderLockReason(state,{...hunt,progress:10}),'Completed rewards are not blocked');
ok(!weeklyOrderLockReason(state,{...hunt,claimed:true}),'Claimed orders are not blocked');
ok(weeklyOrderLockReason(state,order('FALLEN_KNIGHT','hunt','KINGS_ROAD'))?.includes('story'),'Weekly boss needs story clear');
state.defeatedBossIds.push('FALLEN_KNIGHT');
ok(!weeklyOrderLockReason(state,order('FALLEN_KNIGHT','hunt','KINGS_ROAD')),'Cleared weekly boss available');
const gather=GATHERING.find(row=>row.id==='IRONWOOD_TREE')!;
ok(gather,'Gathering fixture exists');
ok(weeklyOrderLockReason(state,order(gather.id,'profession',gather.zoneId)),'Skill requirement blocks work');
state.skills.find(row=>row.skillId===gather.skillId)!.level=gather.unlockLevel;
ok(!weeklyOrderLockReason(state,order(gather.id,'profession',gather.zoneId)),'Work unlocks at required skill level');
ok(weeklyOrderLockReason(state,order('SUNSCAR','regional','SUNSCAR')),'Regional job respects travel requirements');
console.log('Quest availability tests passed');
