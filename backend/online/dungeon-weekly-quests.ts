import {validateDungeonWeeklyQuestSnapshot,type DungeonWeeklyQuestSnapshot} from '../../apps/mobile/src/core/dungeon-weekly-quests';
import {GameplayError,type GameplayServices} from './gameplay';

/** Dedicated dungeon-only weekly reward. No gameplay-state or quest-journal writes.
 * The service-role RPC checks committed room progress and atomically credits Marks. */
export function makeDungeonWeeklyQuestController(services:Pick<GameplayServices,'rpc'>){
 return {
  async snapshot(accountId:string):Promise<DungeonWeeklyQuestSnapshot>{
   const raw=await services.rpc<unknown>('coop_dungeon_weekly_quest_snapshot_server_v1',{p_account_id:accountId});
   return validateDungeonWeeklyQuestSnapshot(raw);
  },
  async claim(accountId:string,weekKey:string,requestId:string):Promise<DungeonWeeklyQuestSnapshot>{
   if(!/^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/.test(weekKey)||
      !/^[A-Za-z0-9_-]{8,128}$/.test(requestId))throw new GameplayError('invalid_dungeon_weekly_request');
   const raw=await services.rpc<unknown>('coop_dungeon_weekly_quest_claim_server_v1',{
    p_account_id:accountId,p_week_key:weekKey,p_request_id:requestId,
   });
   return validateDungeonWeeklyQuestSnapshot(raw);
  },
 };
}
