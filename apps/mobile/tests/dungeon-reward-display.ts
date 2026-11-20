import {dungeonRewardDisplayAmount,dungeonRunMarksBreakdown,parseDungeonCombatMarks} from '../src/core/dungeon-reward-display';

function expect(actual:unknown,expected:unknown,description:string){
 if(actual!==expected)throw new Error(`${description}: expected ${String(expected)}, got ${String(actual)}`);
}
const unclaimed={claimed_at:null,reward_json:{enhanced_marks:140}};
const completed={phase:'completed',mode:'qmode'};
const budget={charges:2,weeklyRemaining:8,failureConsolationRemaining:4};

const enhanced=dungeonRewardDisplayAmount(unclaimed,completed,budget);
expect(enhanced.amount,140,'Pre-claim enhanced dungeon reward must show actual entitlement base, not zero');
expect(enhanced.estimated,true,'Pre-claim reward remains an estimate until committed');

expect(dungeonRewardDisplayAmount(unclaimed,completed,{...budget,charges:0}).amount,28,'Empty enhanced charges reduce marks to 20 percent');
expect(dungeonRewardDisplayAmount(unclaimed,completed,{...budget,weeklyRemaining:0}).amount,28,'Weekly cap reduces marks to 20 percent');
expect(dungeonRewardDisplayAmount(unclaimed,{phase:'completed',mode:'live'},budget,2).amount,175,'Live bonus adds 25 percent of full Marks');
expect(dungeonRewardDisplayAmount(unclaimed,{phase:'completed',mode:'live'}, {...budget,charges:0},1).amount,63,'Reduced base and live bonus combine correctly');
expect(dungeonRewardDisplayAmount(unclaimed,{phase:'completed',mode:'live'},budget,0).amount,140,'Expired live bonus does not appear');
expect(dungeonRewardDisplayAmount(unclaimed,{phase:'failed',mode:'qmode'},budget).amount,12,'Failure consolation is capped at twelve Marks');
expect(dungeonRewardDisplayAmount(unclaimed,{phase:'failed',mode:'qmode'},{...budget,failureConsolationRemaining:0}).amount,0,'Exhausted consolation limit must show genuine zero');

const claimedReceipt={claimed_at:'2026-11-15T05:00:00Z',reward_json:{enhanced_marks:140,marks:28}};
const claimed=dungeonRewardDisplayAmount(claimedReceipt,completed,budget);
expect(claimed.amount,28,'Claimed amount always overrides pre-claim maximum');
expect(claimed.estimated,false,'Claimed amount is exact');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{marks:7}},completed,budget).amount,7,'Pre-stored fixed Echo assistance marks remain exact');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{}},completed,budget).amount,undefined,'Missing amount must never become fake zero');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{enhanced_marks:0}},completed,budget).amount,0,'True zero entitlement remains visible');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{enhanced_marks:-12}},completed,budget).amount,undefined,'Invalid negative data does not render as a reward');
expect(dungeonRewardDisplayAmount(unclaimed,completed).amount,140,'Without budget use server entitled full amount as labeled estimate');


const combat=parseDungeonCombatMarks({normal:2,elite:1,total:11});
if(!combat)throw new Error('Expected valid credited combat Mark receipt');
expect(combat.total,11,'Combat credits come from the ledger');
expect(parseDungeonCombatMarks({normal:2,elite:1,total:14}),undefined,'Mismatched totals must not be shown');
expect(parseDungeonCombatMarks({normal:1,elite:0,total:-3}),undefined,'Negative totals must be rejected');
expect(parseDungeonCombatMarks(null),undefined,'Missing ledger receipt must not become a fake zero');
const capped=parseDungeonCombatMarks({normal:3,elite:3,partial:1,total:25,cap:25});
if(!capped)throw new Error('Capped combat receipt should decode');
expect(capped.partial,1,'The final room can pay a partial capped reward');
expect(capped.cap,25,'New Endurance rooms have one server-authored cap');
expect(parseDungeonCombatMarks({normal:4,elite:3,partial:0,total:27,cap:25}),undefined,'Over-cap receipts must fail closed');
const legacy=parseDungeonCombatMarks({normal:8,elite:2,total:34,cap:null});
if(!legacy)throw new Error('Legacy run Mark receipts remain readable');
expect(legacy.cap,undefined,'Legacy runs should never show an invented 25 Mark cap');
expect(dungeonRunMarksBreakdown([unclaimed],completed,combat,budget).total,151,'Unclaimed completion and already credited combat total are shown together');
expect(dungeonRunMarksBreakdown([unclaimed],completed,combat,budget).estimated,true,'Pending total must be flagged as estimated');
expect(dungeonRunMarksBreakdown([claimedReceipt],completed,combat,budget).total,39,'Claimed completion is added to combat exactly once');
expect(dungeonRunMarksBreakdown([claimedReceipt],completed,combat,budget).estimated,false,'Claimed total is exact');
expect(dungeonRunMarksBreakdown([claimedReceipt],completed,undefined,budget).total,undefined,'No total when actual combat receipt is missing');
expect(dungeonRunMarksBreakdown([],completed,combat,budget).total,undefined,'No total without completion receipt');

console.log('PASS dungeon reward preview displays pre-claim Marks, reduced reward, failure quota and live bonus');
