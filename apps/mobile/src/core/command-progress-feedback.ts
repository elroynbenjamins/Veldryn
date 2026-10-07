import type {GameCommand,GameCommandResult} from './game-commands';
import type {GameState,RewardBundle} from './types';
import {rewardHasProgress} from './playability';
import {masteryRankProgressionMoments,rewardProgressionMoments,type RewardProgressionMoment} from './reward-game-feel';

export interface CommandProgressFeedback{
 collected:{reward:RewardBundle;activity:GameState['activity'];progressionMoments:RewardProgressionMoment[]}|null;
 masteryNotices:RewardProgressionMoment[];
}

/** Profile/settings saves can settle earned activity before changing presentation state.
 * Keep that authoritative result, while leaving non-gameplay editing uninterrupted.
 * Actual cosmetic unlocks are detected separately from this reward presentation.
 */
export function commandProgressFeedback(
 command:Pick<GameCommand,'type'>,
 before:GameState|null|undefined,
 result:Pick<GameCommandResult,'state'|'reward'>&{activity?:GameState['activity']},
):CommandProgressFeedback{
 if(command.type==='profile'||command.type==='profile_icon'||command.type==='settings')return {collected:null,masteryNotices:[]};
 if(!result.reward)return {collected:null,masteryNotices:masteryRankProgressionMoments(before,result.state)};
 const progressionMoments=rewardProgressionMoments(before,result.state);
 return {
  collected:rewardHasProgress(result.reward)||progressionMoments.length
   ?{reward:result.reward,activity:result.activity??null,progressionMoments}:null,
  masteryNotices:[],
 };
}
