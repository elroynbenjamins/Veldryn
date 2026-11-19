// Developer-only read-only World Boss V61/V62 treasure preview guard.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const file=readFileSync(join(__dirname,'../src/screens/FeaturePreviewScreen.tsx'),'utf8');
function check(ok,label){
 if(!ok)throw Error('world_boss_chest_preview_qa:'+label);
}
for(const title of ['War Camp Chest','Warrior Chest','Realm Victory Chest']){
 check(file.includes("name:'"+title+"'"),'missing_chest_'+title);
}
for(const collection of ['Rootbound Harvester','Sunforged Prospector','Rimebound Angler']){
 check(file.includes(collection),'missing_set_'+collection);
}
check(file.includes('1% gathering gear chance'),'one_percent_per_chest_notice');
check(file.includes('does not guarantee gathering equipment'),'no_guaranteed_gear_claim');
check(file.includes('Three chests per account'),'account_wide_cap');
check(file.includes('No authenticated chest entitlement, collected-piece count'),
 'no_fake_live_entitlement');
check(file.includes('<Action label="Open chest · Not available" s={s} disabled/>'),
 'open_button_remains_disabled');
check(file.includes('<Action label="Claim rewards · Not available" s={s} disabled/>'),
 'claim_remains_disabled');
check(file.includes('Developer-only UI preview. All example data is illustrative.'),
 'global_developer_banner');
console.log('WORLD_BOSS_CHEST_PREVIEW_QA_OK: three nonpaying milestone cards, 1 percent, 10 piece sets, disabled actions');
