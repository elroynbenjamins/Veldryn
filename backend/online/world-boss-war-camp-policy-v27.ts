/**
 * Hidden private event-creation helper. Server staff/event scheduler may
 * preinitialize War Camp ONLY for a future DRAFT World Boss event.
 * Cannot be called by players or the public REST API. No live deployment.
 */
import {WORLD_BOSS_V27_RECIPES,validateWorldBossV27Recipes,
 type WorldBossWarCampTrackV27} from './world-boss-war-camp-service-v27';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V27_POLICY_INITIALIZER_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface WorldBossWarCampGoalsV27 {
 fortifications:{tier1At:number;tier2At:number};
 fieldProvisions:{tier1At:number;tier2At:number};
 siegecraft:{tier1At:number;tier2At:number};
}
export type WorldBossWarCampGoalInputV27={
 eventId:string;
 /** Server-counted eligible accounts, not unverified client-supplied data. */
 eligibleAccounts:number;
 /** Approved from event forecasting, not editable once installed. */
 expectedBundleRate:number;
};
export function proposeWorldBossWarCampGoalsV27(
 input:WorldBossWarCampGoalInputV27,
):WorldBossWarCampGoalsV27{
 if(!input||!UUID.test(input.eventId)||
  !Number.isSafeInteger(input.eligibleAccounts)||
  input.eligibleAccounts<1||input.eligibleAccounts>200000||
  !Number.isFinite(input.expectedBundleRate)||
  input.expectedBundleRate<.1||input.expectedBundleRate>2)
  throw Error('world_boss_v27_invalid_private_goal_cohort');
 const predictedBundles=Math.ceil(input.eligibleAccounts*input.expectedBundleRate);
 const perTrack=Math.max(1,Math.ceil(predictedBundles/3));
 const tier1At=Math.max(1,Math.ceil(perTrack*.25));
 const tier2At=Math.max(tier1At+1,Math.ceil(perTrack*.5));
 return {
  fortifications:{tier1At,tier2At},
  fieldProvisions:{tier1At,tier2At},
  siegecraft:{tier1At,tier2At},
 };
}
/** This is deliberately a separate ADMIN-ONLY call. The SQL function
 * rejects post-start events and an already-created War Camp. It locks
 * the event and installs all twelve recipes + frozen goals atomically.
 */
export async function initializeWorldBossWarCampV27(
 pg:WorldBossPgExecutorV19,input:WorldBossWarCampGoalInputV27,
):Promise<{eventId:string;recipesInstalled:12;policyLocked:true}>{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v27_private_admin_pg_required');
 validateWorldBossV27Recipes();
 const goals=proposeWorldBossWarCampGoalsV27(input);
 const result=await pg.query<{
  receipt:{eventId:string;recipesInstalled:number;policyLocked:boolean}
 }>('SELECT private.world_boss_v27_initialize($1::uuid,$2::jsonb,$3::jsonb) AS receipt',
 [input.eventId,JSON.stringify(goals),JSON.stringify(WORLD_BOSS_V27_RECIPES)]);
 if(result.rows.length!==1||!result.rows[0].receipt||
  result.rows[0].receipt.eventId!==input.eventId||
  result.rows[0].receipt.recipesInstalled!==12||
  result.rows[0].receipt.policyLocked!==true)
  throw Error('world_boss_v27_admin_policy_init_receipt_invalid');
 return result.rows[0].receipt as {
  eventId:string;recipesInstalled:12;policyLocked:true;
 };
}
