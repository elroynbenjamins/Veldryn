const fs=require('fs') as {existsSync(path:string):boolean;readFileSync(path:string,encoding:string):string};
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}

const assets=fs.readFileSync('src/theme/equipment-assets.ts','utf8');
check(assets.includes("T5_007:require('../../assets/equipment-t5-dreadguard/T5_007-jackalblood-covenant-icon-sheet.png')"),'Jackalblood Covenant icon sheet must be registered');
for(const itemId of ['T5P_799','T5P_800','T5P_801','T5P_802','T5P_803','T5P_804','T5P_805','T5X_019','T5X_020','T5X_021']){
  check(assets.includes(itemId),'Jackalblood Covenant item must map to its artwork: '+itemId);
}
check(fs.existsSync('assets/equipment-t5-dreadguard/T5_007-jackalblood-covenant-icon-sheet.png'),'Jackalblood Covenant icon sheet must exist');
check(assets.includes("T5_009:require('../../assets/equipment-t5-dreadguard/T5_009-glasswind-bastion-icon-sheet.png')"),'Glasswind Bastion icon sheet must be registered');
for(const itemId of ['T5P_813','T5P_814','T5P_815','T5P_816','T5P_817','T5P_818','T5P_819','T5X_025','T5X_026','T5X_027']){
  check(assets.includes(itemId),'Glasswind Bastion item must map to its artwork: '+itemId);
}
check(fs.existsSync('assets/equipment-t5-dreadguard/T5_009-glasswind-bastion-icon-sheet.png'),'Glasswind Bastion icon sheet must exist');
console.log('PASS: Dreadguard T5 Jackalblood Covenant artwork is present and registered');

export {};
