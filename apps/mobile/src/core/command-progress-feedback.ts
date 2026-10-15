import type {GameCommand,GameCommandResult} from './game-commands';
import type {GameState,RewardBundle} from './types';
import {rewardHasProgress} from './playability';
import {masteryRankProgressionMoments,rewardProgressionMoments,type RewardProgressionMoment} from './reward-game-feel';

export interface CommandProgressFeedback{
 collected:{reward:RewardBundle;activity:GameState['activity'];progressionMoments:RewardProgressionMoment[]}|null;
 masteryNotices:RewardProgressionMoment[];
}

/** Settlement always commits progress; only an explicit activity claim opens its modal. */
export function commandProgressFeedback(
 command:Pick<GameCommand,'type'>,
 before:GameState|null|undefined,
 result:Pick<GameCommandResult,'state'|'reward'>&{activity?:GameState['activity']},
):CommandProgressFeedback{
 if(command.type==='profile'||command.type==='profile_icon'||command.type==='settings')return {collected:null,masteryNotices:[]};
 // Event claims and shop purchases already confirm in their own screen. Do not interrupt
 // them with the activity-reward modal (an unrelated activity may have settled first).
 if(command.type.startsWith('event_'))return {collected:null,masteryNotices:[]};
 if(command.type!=='claim')return {collected:null,masteryNotices:masteryRankProgressionMoments(before,result.state)};
 if(!result.reward)return {collected:null,masteryNotices:masteryRankProgressionMoments(before,result.state)};
 const progressionMoments=rewardProgressionMoments(before,result.state);
 return {
  collected:rewardHasProgress(result.reward)||progressionMoments.length
   ?{reward:result.reward,activity:result.activity??null,progressionMoments}:null,
  masteryNotices:[],
 };
}
