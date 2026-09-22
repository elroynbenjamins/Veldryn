export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const art=fs.readFileSync('src/theme/gem-assets.ts','utf8');
const ids=['EMBER_SHARD','EMBERHEART_GEM','WARD_SHARD','WARDHEART_GEM','VITALITY_SHARD','VITALITY_HEART_GEM','SWIFT_SIGIL','BOSSBANE_SIGIL','BULWARK_SIGIL','RENEWAL_SIGIL'];
for(const id of ids)ok(art.includes(id+':'),'Legacy gem artwork mapping missing '+id);
ok(art.includes("SWIFT_SIGIL:'effect_flow'"),'Swift Sigil should reuse Flow artwork');
ok(art.includes("BOSSBANE_SIGIL:'effect_predator'"),'Bossbane Sigil should reuse Predator artwork');
ok(art.includes("BULWARK_SIGIL:'effect_bulwark'"),'Bulwark Sigil should reuse Bulwark artwork');
ok(art.includes("RENEWAL_SIGIL:'effect_renewal'"),'Renewal Sigil should reuse Renewal artwork');
console.log('PASS: legacy/migration gems resolve to canonical VELDRYN artwork');
