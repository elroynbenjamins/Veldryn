const fs=require('fs') as {existsSync:(path:string)=>boolean;readFileSync:(path:string,encoding:string)=>string};
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const assets=fs.readFileSync('src/theme/equipment-assets.ts','utf8');
for(const setId of ['T5_001','T5_003']){
 check(assets.includes(setId+':require('),'Ironwarden T5 icon sheet must be registered: '+setId);
 check(assets.includes(setId+':['),'Ironwarden T5 pieces must be mapped to their icon sheet: '+setId);
}
check(fs.existsSync('assets/equipment-t5-ironwarden/T5_001-dunewood-rampart-icon-sheet.png'),'Dunewood Rampart icon sheet must exist');
check(fs.existsSync('assets/equipment-t5-ironwarden/T5_003-mirage-reprisal-icon-sheet.png'),'Mirage Reprisal icon sheet must exist');
console.log('PASS: Ironwarden T5 equipment artwork is present and registered');
export {};
