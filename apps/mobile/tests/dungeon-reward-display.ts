import {dungeonRewardDisplayAmount} from '../src/core/dungeon-reward-display';

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

const claimed=dungeonRewardDisplayAmount({claimed_at:'2026-11-15T05:00:00Z',reward_json:{enhanced_marks:140,marks:28}},completed,budget);
expect(claimed.amount,28,'Claimed amount always overrides pre-claim maximum');
expect(claimed.estimated,false,'Claimed amount is exact');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{marks:7}},completed,budget).amount,7,'Pre-stored fixed Echo assistance marks remain exact');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{}},completed,budget).amount,undefined,'Missing amount must never become fake zero');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{enhanced_marks:0}},completed,budget).amount,0,'True zero entitlement remains visible');
expect(dungeonRewardDisplayAmount({claimed_at:null,reward_json:{enhanced_marks:-12}},completed,budget).amount,undefined,'Invalid negative data does not render as a reward');
expect(dungeonRewardDisplayAmount(unclaimed,completed).amount,140,'Without budget use server entitled full amount as labeled estimate');

console.log('PASS dungeon reward preview displays pre-claim Marks, reduced reward, failure quota and live bonus');
