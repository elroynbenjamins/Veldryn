function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const assets=fs.readFileSync('src/theme/profile-icon-assets.ts','utf8');

for(const id of ['event:veilbreak-2026-lantern-warden','event:veilbreak-2026-pumpkin-moon']){
 check(assets.includes("'"+id+"':require("),'Veilbreak event icon must resolve to dedicated profile artwork: '+id);
}
for(const id of ['ascendant-celestial-crown-icon','ascendant-draconic-ruby-icon'])check(assets.includes("'"+id+"':require("),'Private icon must resolve to dedicated crest artwork: '+id);
console.log('PASS: Veilbreak event profile icons resolve to dedicated artwork');
export {};

const atlasSource=fs.readFileSync('src/theme/profile-icon-assets.ts','utf8');
const profileIcon=fs.readFileSync('src/components/ProfileIcon.tsx','utf8');
check(atlasSource.includes('standard-set-portraits-atlas.webp'),'approved standard-set portrait atlas must be bundled');
check((atlasSource.match(/cosmetic:[^']+:portrait-[^']+'/g)??[]).length>=8,'all eight standard-set portrait IDs must have atlas cells');
check(profileIcon.includes('profileCosmeticPortraitAtlasCell')&&profileIcon.includes('overflow:\'hidden\''),'ProfileIcon must crop the shared portrait atlas instead of showing the full sheet');

check(profileIcon.includes("width:'400%'")&&profileIcon.includes("height:'200%'")&&profileIcon.includes('cell.column*100')&&profileIcon.includes('cell.row*100'),'atlas crop must scale with the actual styled icon viewport rather than the default size prop');
