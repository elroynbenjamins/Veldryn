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
check(file.includes('10% gathering gear chance'),'ten_percent_per_chest_notice');
check(file.includes('Each earned chest independently has a 10% gear chance'),'no_guaranteed_gear_claim');
check(file.includes('Up to six chests per account'),'account_wide_cap');
check(file.includes('No authenticated entitlement or opening is available'),
 'no_fake_live_entitlement');
check(file.includes('<Action label="Open chest · Not available" s={s} disabled/>'),
 'open_button_remains_disabled');
check(file.includes('<Action label="Claim rewards · Not available" s={s} disabled/>'),
 'claim_remains_disabled');
check(file.includes('Developer-only UI preview. All example data is illustrative.'),
 'global_developer_banner');
const modal=readFileSync(join(__dirname,'../src/components/WorldBossChestOpeningPreview.tsx'),'utf8');
check(file.includes('<WorldBossChestOpeningPreview reduceMotion={reduceMotion}/>'),'hidden_demo_mount');
check(modal.includes('DEVELOPER PREVIEW')&&modal.includes('fixed illustrative loot, no rewards granted'),'explicit_demo_label');
check(modal.includes("button('Preview one'")&&modal.includes("button('Preview all (6)'"),'single_bulk_preview');
check(modal.includes('buildWorldBossChestOpeningReviewV97(DEMO_ACCOUNT,DEMO.slice(0,count))'),'fixed_receipt_only');
check(modal.includes("button('Skip reveal'")&&modal.includes("if(reduceMotion)")&&modal.includes('clearTimeout(timer)'),'accessible_reveal');
check(!/\b(fetch|supabase|claimChest|openChest)\s*\(/.test(modal),'no_claim_transport');
console.log('WORLD_BOSS_CHEST_PREVIEW_QA_OK: 10 percent, six chest cap, demo-only single/bulk, disabled real actions');
