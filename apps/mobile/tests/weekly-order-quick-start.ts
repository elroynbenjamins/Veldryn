import {createCharacter,newGame} from '../src/core/game';
import {weeklyOrderQuickStartPlan} from '../src/core/weekly-order-quick-start';
import type {WeeklyOrder} from '../src/core/weekly-orders-v41';
import type {GameState} from '../src/core/types';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
function order(targetId:string,kind:WeeklyOrder['kind']='hunt',regionId='GREENFIELDS'):WeeklyOrder{
 return {id:'quick-start-test',weekKey:'2026-W46',slot:0,kind,title:'Quick start',targetId,regionId,activityId:targetId,
  source:{kind:kind==='hunt'?'monster':'skill',id:targetId,label:'Test',available:true},target:15,progress:0,
  reward:{rewardRef:'test',label:'Test'},claimed:false};
}
const state=createCharacter(newGame(Date.UTC(2026,10,13)),'IRONWARDEN');
const rat=order('MOSS_RAT');
const ready=weeklyOrderQuickStartPlan(state,rat);
ok(ready.status==='ready'&&ready.kind==='combat'&&ready.targetId==='MOSS_RAT'&&ready.needsTravel===false,'An unlocked local hunt starts directly');
ok(weeklyOrderQuickStartPlan(state,{...rat,progress:15}).status==='blocked','A finished contract must not restart combat');
ok(weeklyOrderQuickStartPlan(state,order('FALLEN_KNIGHT','hunt','KINGS_ROAD')).status==='manual','Story bosses keep their manual encounter flow');

const injured:GameState={...state,character:{...state.character!,currentHp:1}};
ok(weeklyOrderQuickStartPlan(injured,rat).status==='blocked','An injured player cannot launch a hunt');

const remote:GameState={...state,character:{...state.character!,level:25},exploredRouteIds:['SCOUT_IRONWOOD'],unlockedMonsterIds:[...state.unlockedMonsterIds,'LANTERN_WRETCH']};
const remoteHunt=weeklyOrderQuickStartPlan(remote,order('LANTERN_WRETCH','hunt','KINGS_ROAD'));
ok(remoteHunt.status==='blocked','A destination behind its parent scouting route must not auto-travel');
const scouted:GameState={...remote,exploredRouteIds:['SCOUT_IRONWOOD','SCOUT_OLD_MINES']};
const scoutedHunt=weeklyOrderQuickStartPlan(scouted,order('LANTERN_WRETCH','hunt','KINGS_ROAD'));
ok(scoutedHunt.status==='ready'&&scoutedHunt.needsTravel&&scoutedHunt.regionId==='KINGS_ROAD','An unlocked remote hunt requires travel');
ok(weeklyOrderQuickStartPlan({...scouted,currentRegionId:'KINGS_ROAD'},order('LANTERN_WRETCH','hunt','KINGS_ROAD')).status==='ready','After travel, the same hunt can start');

const tree=order('IRONWOOD_TREE','profession','IRONWOOD');
ok(weeklyOrderQuickStartPlan(state,tree).status==='blocked','Gathering skill or region gates cannot be bypassed');
const gathering:GameState={...state,character:{...state.character!,level:10},skills:state.skills.map(row=>row.skillId==='woodcutting'?{...row,level:7}:row)};
const treeStart=weeklyOrderQuickStartPlan(gathering,tree);
ok(treeStart.status==='ready'&&treeStart.kind==='gathering'&&treeStart.targetId==='IRONWOOD_TREE'&&treeStart.needsTravel,'Unlocked gathering work auto-travels');
ok(weeklyOrderQuickStartPlan({...gathering,currentRegionId:'IRONWOOD'},tree).status==='ready','Gathering work starts locally after successful travel');
ok(weeklyOrderQuickStartPlan(gathering,order('GREENFIELDS','regional','GREENFIELDS')).status==='manual','Broad regional work stays manual');
console.log('Weekly contract quick-start tests passed');
