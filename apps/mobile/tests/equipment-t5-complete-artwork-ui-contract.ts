const fs=require('fs') as {existsSync:(path:string)=>boolean;readFileSync:(path:string,encoding:string)=>string};
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}

const assets=fs.readFileSync('src/theme/equipment-assets.ts','utf8');
const expected:Record<string,string>={
 T5_001:'equipment-t5-ironwarden/T5_001-dunewood-rampart-icon-sheet.webp',
 T5_003:'equipment-t5-ironwarden/T5_003-mirage-reprisal-icon-sheet.webp',
 T5_004:'equipment-t5-bastion/T5_004-caravan-citadel-icon-sheet.webp',
 T5_006:'equipment-t5-bastion/T5_006-oasis-gate-icon-sheet.webp',
 T5_007:'equipment-t5-dreadguard/T5_007-jackalblood-covenant-icon-sheet.webp',
 T5_009:'equipment-t5-dreadguard/T5_009-glasswind-bastion-icon-sheet.webp',
 T5_010:'equipment-t5-wayfinder/T5_010-dunejackal-pursuit-icon-sheet.webp',
 T5_012:'equipment-t5-wayfinder/T5_012-mirage-tracker-icon-sheet.webp',
 T5_013:'equipment-t5-ravager/T5_013-dunestrider-assault-icon-sheet.webp',
 T5_015:'equipment-t5-ravager/T5_015-shardbreaker-colossus-icon-sheet.webp',
 T5_016:'equipment-t5-hexweaver/T5_016-saffron-hex-icon-sheet.webp',
 T5_018:'equipment-t5-hexweaver/T5_018-mirage-veil-icon-sheet.webp',
 T5_019:'equipment-t5-knifedancer/T5_019-spicewind-waltz-icon-sheet.webp',
 T5_021:'equipment-t5-knifedancer/T5_021-mirage-fang-icon-sheet.webp',
 T5_022:'equipment-t5-dawnkeeper/T5_022-oasis-grace-icon-sheet.webp',
 T5_024:'equipment-t5-dawnkeeper/T5_024-glasswind-ward-icon-sheet.webp',
 T5_025:'equipment-t5-stonecaller/T5_025-dunewood-regalia-icon-sheet.webp',
 T5_027:'equipment-t5-stonecaller/T5_027-mirage-chorus-icon-sheet.webp',
};

for(const [setId,path] of Object.entries(expected)){
 check(assets.includes(`${setId}:require('../../assets/${path}')`),`Tier 5 sheet must be registered: ${setId}`);
 check(fs.existsSync(`assets/${path}`),`Tier 5 sheet must exist: ${path}`);
}
check(Object.keys(expected).length===18,'Tier 5 must cover two sets for all nine classes');
console.log('PASS: all 18 Tier 5 equipment sheets are present and registered');
export {};
