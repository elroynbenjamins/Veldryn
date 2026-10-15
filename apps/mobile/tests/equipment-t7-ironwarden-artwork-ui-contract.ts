const fs=require('fs') as {existsSync(path:string):boolean;readFileSync(path:string,encoding:string):string};
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}

const assets=fs.readFileSync('src/theme/equipment-assets.ts','utf8');
for(const setId of ['T7_001','T7_003']){
  check(assets.includes(setId+':require('),'Ironwarden T7 icon sheet must be registered: '+setId);
  check(assets.includes(setId+':['),'Ironwarden T7 pieces must be mapped to their icon sheet: '+setId);
}
check(fs.existsSync('assets/equipment-t7-ironwarden/T7_001-frostiron-rampart-icon-sheet.png'),'Frostiron Rampart icon sheet must exist');
check(fs.existsSync('assets/equipment-t7-ironwarden/T7_003-bellguard-reprisal-icon-sheet.png'),'Bellguard Reprisal icon sheet must exist');
console.log('PASS: Ironwarden T7 equipment artwork is present and registered');

export {};
