import {coopSyncIntervalMs,COOP_CHAT_REFRESH_MS} from '../src/core/coop-sync-policy';

function check(value:boolean,message:string){if(!value)throw new Error(message);}

check(coopSyncIntervalMs('live','decision',true)===3500,'live votes must have a short realtime watchdog');
check(coopSyncIntervalMs('live','decision',false)===2000,'unavailable realtime must not delay short votes');
check(coopSyncIntervalMs('event','decision',false)===2000,'event dungeon votes must retain fast fallback');
check(coopSyncIntervalMs('live','combat',true)===6000,'combat needs a bounded realtime watchdog');
check(coopSyncIntervalMs('event','combat',false)===2500,'event combat must recover promptly without realtime');
check(coopSyncIntervalMs('live','idle',true)===12000,'live idle polling must not repeat every 2.5 seconds');
check(coopSyncIntervalMs('qmode','idle',true)===20000,'realtime qmode should avoid redundant reads');
check(coopSyncIntervalMs('qmode','idle',false)===6000,'qmode must still synchronize without realtime');
check(COOP_CHAT_REFRESH_MS===5000,'party chat must remain responsive without riding on every dungeon frame refresh');
console.log('PASS dungeon realtime watchdog intervals, vote fallback and decoupled chat cadence');
