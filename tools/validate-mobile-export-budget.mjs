import fs from 'node:fs';
import path from 'node:path';

const exportDirectory=process.argv[2];
if(!exportDirectory){
  console.error('Usage: node tools/validate-mobile-export-budget.mjs <Expo export directory>');
  process.exit(1);
}

const root=path.resolve(exportDirectory);
if(!fs.existsSync(root)||!fs.statSync(root).isDirectory()){
  console.error(`Expo export directory was not found: ${root}`);
  process.exit(1);
}

const files=[];
const visit=directory=>{
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())visit(target);
    else files.push({file:path.relative(root,target).replaceAll('\\','/'),bytes:fs.statSync(target).size});
  }
};
visit(root);

const bytes=files.reduce((total,file)=>total+file.bytes,0);
const assets=files.filter(file=>file.file.startsWith('assets/'));
const assetBytes=assets.reduce((total,file)=>total+file.bytes,0);
const bundles=files.filter(file=>file.file.endsWith('.hbc')||file.file.endsWith('.js'));
const bundleBytes=bundles.reduce((total,file)=>total+file.bytes,0);
const largestAsset=[...assets].sort((left,right)=>right.bytes-left.bytes)[0];
const mib=value=>(value/1024/1024).toFixed(1);

const limits={exportBytes:200*1024*1024,bundleBytes:10*1024*1024,assetBytes:190*1024*1024,individualAssetBytes:3*1024*1024};
const issues=[];
if(bytes>limits.exportBytes)issues.push(`Android export is ${mib(bytes)} MiB (limit ${mib(limits.exportBytes)} MiB).`);
if(bundleBytes>limits.bundleBytes)issues.push(`JavaScript bundle is ${mib(bundleBytes)} MiB (limit ${mib(limits.bundleBytes)} MiB).`);
if(assetBytes>limits.assetBytes)issues.push(`Bundled assets are ${mib(assetBytes)} MiB (limit ${mib(limits.assetBytes)} MiB).`);
if(largestAsset&&largestAsset.bytes>limits.individualAssetBytes)issues.push(`Largest exported asset is ${largestAsset.file} at ${mib(largestAsset.bytes)} MiB (limit ${mib(limits.individualAssetBytes)} MiB).`);

const summary=`Android export: ${mib(bytes)} MiB total, ${mib(assetBytes)} MiB assets (${assets.length} files), ${mib(bundleBytes)} MiB JavaScript.`;
if(issues.length){
  console.error(`${summary}\n${issues.join('\n')}`);
  process.exit(1);
}
console.log(`PASS: ${summary}`);
