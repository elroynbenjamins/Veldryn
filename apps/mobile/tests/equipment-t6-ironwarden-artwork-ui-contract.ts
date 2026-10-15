const fs=require('fs') as {existsSync(path:string):boolean;readFileSync(path:string,encoding:string):string};
const source=fs.readFileSync('src/theme/equipment-assets.ts','utf8');

const expected={
  T6_001:{
    asset:'../../assets/equipment-t6-ironwarden/T6_001-ambergate-rampart-icon-sheet.png',
    items:['T6P_946','T6P_947','T6P_948','T6P_949','T6P_950','T6P_951','T6P_952','T6X_001','T6X_002','T6X_003'],
  },
  T6_003:{
    asset:'../../assets/equipment-t6-ironwarden/T6_003-tyrant-reprisal-icon-sheet.png',
    items:['T6P_960','T6P_961','T6P_962','T6P_963','T6P_964','T6P_965','T6P_966','T6X_007','T6X_008','T6X_009'],
  },
} as const;

for(const [setId,{asset,items}] of Object.entries(expected)){
  if(!source.includes(`${setId}:require('${asset}')`))throw new Error(`Wrong artwork path for ${setId}`);
  if(!fs.existsSync(asset.replace('../../','')))throw new Error(`Missing artwork file for ${setId}`);
  for(const itemId of items){
    if(!source.includes(itemId))throw new Error(`Missing ${setId} artwork assignment for ${itemId}`);
  }
}

console.log('PASS: Ironwarden T6 equipment artwork is present and registered');

export {};
