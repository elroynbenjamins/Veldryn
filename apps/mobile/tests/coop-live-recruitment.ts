import {COOP_LFG_TTL_MS,activeCoopLiveRecruitment,coopLiveRecruitmentTime,type CoopLiveRecruitmentPost} from '../src/core/coop-live-recruitment';

function equal(actual:unknown,expected:unknown,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
const post:CoopLiveRecruitmentPost={id:'p1',dungeonId:'EXP_001',ownerName:'Tank',role:'tank',maxTier:3,note:'Starting now',createdAtMs:0,expiresAtMs:COOP_LFG_TTL_MS,mine:false};
equal(COOP_LFG_TTL_MS,1_800_000,'Live LFG TTL must remain exactly 30 minutes');
equal(activeCoopLiveRecruitment([post],COOP_LFG_TTL_MS-1).map(row=>row.id),['p1'],'post must remain visible until the 30-minute boundary');
equal(activeCoopLiveRecruitment([post],COOP_LFG_TTL_MS),[],'post must disappear at the 30-minute boundary');
equal(coopLiveRecruitmentTime(post,COOP_LFG_TTL_MS-60_000),'1m left','one-minute countdown changed');
equal(coopLiveRecruitmentTime(post,COOP_LFG_TTL_MS),'Expired','expired label changed');
console.log('co-op Live recruitment TTL OK');
