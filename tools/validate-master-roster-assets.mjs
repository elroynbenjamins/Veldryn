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

function webpInfo(path){
  const b=readFileSync(path);
  if(b.length<20||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')fail(`Not a valid WebP: ${path}`);
  for(let offset=12;offset+8<=b.length;){
    const fourcc=b.toString('ascii',offset,offset+4);
    const size=b.readUInt32LE(offset+4);
    const data=offset+8;
    if(fourcc==='VP8X'&&data+10<=b.length){
      return {width:1+b.readUIntLE(data+4,3),height:1+b.readUIntLE(data+7,3)};
    }
    if(fourcc==='VP8L'&&data+5<=b.length){
      if(b[data]!==0x2f)fail(`Invalid lossless WebP signature: ${path}`);
      const bits=b.readUInt32LE(data+1);
      return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};
    }
    if(fourcc==='VP8 '&&data+10<=b.length){
      if(b[data+3]!==0x9d||b[data+4]!==0x01||b[data+5]!==0x2a)fail(`Invalid lossy WebP frame header: ${path}`);
      return {width:b.readUInt16LE(data+6)&0x3fff,height:b.readUInt16LE(data+8)&0x3fff};
    }
    offset=data+size+(size&1);
  }
  fail(`WebP dimensions not found: ${path}`);
}

function validateDirectory(dir,ids,label){
  const files=readdirSync(dir).filter(name=>name.toLowerCase().endsWith('.webp')).sort();
  if(files.length!==ids.length)fail(`${label}: expected ${ids.length} WebPs, found ${files.length}`);
  const matched=[];
  for(const id of ids){
    const candidates=files.filter(name=>name.startsWith(id+'_'));
    if(candidates.length!==1)fail(`${label}: ${id} must resolve to exactly one WebP, found ${candidates.length}`);
    const file=candidates[0];
    const {width,height}=webpInfo(resolve(dir,file));
    if(width!==96||height!==96)fail(`${label}: ${file} must be 96x96, got ${width}x${height}`);
    matched.push(file);
  }
  if(new Set(matched).size!==files.length)fail(`${label}: duplicate/unmatched runtime WebP detected`);
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

console.log(`PASS: master roster assets validated (${pets.length} pets + ${units.length} companions, all 96x96 WebP)`);
