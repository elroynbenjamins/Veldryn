function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const assets=fs.readFileSync('src/theme/profile-icon-assets.ts','utf8');

for(const id of ['event:veilbreak-2026-lantern-warden','event:veilbreak-2026-pumpkin-moon']){
 check(assets.includes("'"+id+"':require("),'Veilbreak event icon must resolve to dedicated profile artwork: '+id);
}
console.log('PASS: Veilbreak event profile icons resolve to dedicated artwork');
export {};
