import {readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const petDir=resolve(repoRoot,'apps/mobile/assets/master_roster/pets/runtime_96');
const companionDir=resolve(repoRoot,'apps/mobile/assets/master_roster/companions/runtime_96');
const registryPath=resolve(repoRoot,'apps/mobile/src/theme/master-roster-assets.ts');

const fail=(message)=>{throw new Error(message)};
const expectedPetIds=Array.from({length:33},(_,i)=>`PET_${String(i+1).padStart(3,'0')}`);
const expectedUnitIds=Array.from({length:24},(_,i)=>`UNIT_${String(i+1).padStart(3,'0')}`);

function pngInfo(path){
  const b=readFileSync(path);
  const sig=[137,80,78,71,13,10,26,10];
  if(b.length<24||!sig.every((v,i)=>b[i]===v))fail(`Not a valid PNG: ${path}`);
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
}

function validateDirectory(dir,ids,label){
  const files=readdirSync(dir).filter(name=>name.toLowerCase().endsWith('.png')).sort();
  if(files.length!==ids.length)fail(`${label}: expected ${ids.length} PNGs, found ${files.length}`);
  const matched=[];
  for(const id of ids){
    const candidates=files.filter(name=>name.startsWith(id+'_'));
    if(candidates.length!==1)fail(`${label}: ${id} must resolve to exactly one PNG, found ${candidates.length}`);
    const file=candidates[0];
    const {width,height}=pngInfo(resolve(dir,file));
    if(width!==96||height!==96)fail(`${label}: ${file} must be 96x96, got ${width}x${height}`);
    matched.push(file);
  }
  if(new Set(matched).size!==files.length)fail(`${label}: duplicate/unmatched runtime PNG detected`);
  return files;
}

const pets=validateDirectory(petDir,expectedPetIds,'pets');
const units=validateDirectory(companionDir,expectedUnitIds,'companions');
const registry=readFileSync(registryPath,'utf8');

function validateRegistry(ids,kind){
  for(const id of ids){
    const count=registry.split(`['${id}'`).length-1;
    if(count!==1)fail(`asset registry: ${id} expected once, found ${count}`);
  }
  const pattern=kind==='pet'?/\['PET_\d{3}'/g:/\['UNIT_\d{3}'/g;
  const count=registry.match(pattern)?.length??0;
  if(count!==ids.length)fail(`asset registry: expected ${ids.length} ${kind} entries, found ${count}`);
}
validateRegistry(expectedPetIds,'pet');
validateRegistry(expectedUnitIds,'companion');

for(const file of pets){
  if(!registry.includes(`master_roster/pets/runtime_96/${file}`))fail(`asset registry does not reference pet file ${file}`);
}
for(const file of units){
  if(!registry.includes(`master_roster/companions/runtime_96/${file}`))fail(`asset registry does not reference companion file ${file}`);
}

console.log(`PASS: master roster assets validated (${pets.length} pets + ${units.length} companions, all 96x96)`);
