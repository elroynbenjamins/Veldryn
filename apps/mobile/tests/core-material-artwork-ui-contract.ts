export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const resources=read('src/theme/resource-assets.ts');
const core=read('src/theme/core-material-assets.ts');
const itemArtwork=read('src/components/ItemArtwork.tsx');
for(const id of ['TEMPERING_DUST','TEMPERING_CORE','HOLY_WATER']){
  ok(core.includes(id),'Missing core material art mapping for '+id);
}
ok(resources.includes('...coreMaterialIconSourceById'),'Core material art must feed the shared resource resolver');
ok(itemArtwork.includes('hasResourceArtwork(itemId)'),'Shared ItemArtwork must render resource art');
console.log('PASS: Holy Water and tempering materials have shared production artwork');
