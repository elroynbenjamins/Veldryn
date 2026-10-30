import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const petDir=resolve(repoRoot,'apps/mobile/assets/master_roster/pets/runtime_96');
const remasteredPetDir=resolve(repoRoot,'apps/mobile/assets/master_roster/pets/runtime_256');
const petPortraitDir=resolve(repoRoot,'apps/mobile/assets/master_roster/pets/portraits_512');
const petMasterDir=resolve(repoRoot,'apps/mobile/art-review/pet-remaster/masters');
// High-resolution design masters are archived outside the production app checkout.
// Runtime artwork and shipped portraits remain mandatory for release validation.
const reviewMastersPresent=existsSync(petMasterDir);
const companionDir=resolve(repoRoot,'apps/mobile/assets/master_roster/companions/runtime_96');
const registryPath=resolve(repoRoot,'apps/mobile/src/theme/master-roster-assets.ts');
const portraitRegistryPath=resolve(repoRoot,'apps/mobile/src/theme/pet-art.ts');

const fail=(message)=>{throw new Error(message)};
const expectedPetIds=Array.from({length:33},(_,i)=>`PET_${String(i+1).padStart(3,'0')}`);
const expectedUnitIds=Array.from({length:24},(_,i)=>`UNIT_${String(i+1).padStart(3,'0')}`);

function webpInfo(path){
  const b=readFileSync(path);
  if(b.length<16||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')fail(`Not a valid WebP: ${path}`);
  let offset=12;
  while(offset+8<=b.length){
    const kind=b.toString('ascii',offset,offset+4);
    const length=b.readUInt32LE(offset+4);
    const data=offset+8;
    if(kind==='VP8X'&&data+10<=b.length)return {width:1+b.readUIntLE(data+4,3),height:1+b.readUIntLE(data+7,3)};
    if(kind==='VP8L'&&data+5<=b.length){
      const b0=b[data+1],b1=b[data+2],b2=b[data+3],b3=b[data+4];
      return {width:1+(b0|((b1&0x3f)<<8)),height:1+((b1>>6)|(b2<<2)|((b3&0xf)<<10))};
    }
    if(kind==='VP8 '){
      for(let i=data;i+7<Math.min(b.length,data+32);i++){
        if(b[i]===0x9d&&b[i+1]===0x01&&b[i+2]===0x2a)return {width:b.readUInt16LE(i+3)&0x3fff,height:b.readUInt16LE(i+5)&0x3fff};
      }
    }
    offset=data+length+(length&1);
  }
  fail(`Unsupported WebP layout: ${path}`);
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
const portraitRegistry=readFileSync(portraitRegistryPath,'utf8');

function pngInfo(path){
  const b=readFileSync(path);
  if(b.toString('hex',0,8)!=='89504e470d0a1a0a')fail(`Not a PNG: ${path}`);
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),colorType:b[25]};
}

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
  const runtime=resolve(remasteredPetDir,file);
  const {width,height}=webpInfo(runtime);
  if(width!==256||height!==256)fail(`remastered pet runtime ${file} must be 256x256`);
  if(!registry.includes(`master_roster/pets/runtime_256/${file}`))fail(`asset registry does not reference remastered pet file ${file}`);
  const png=file.replace(/\.webp$/,'.png');
  for(const [dir,size] of [[petPortraitDir,512],...(reviewMastersPresent?[[petMasterDir,1254]]:[])]){
    const info=pngInfo(resolve(dir,png));
    if(info.width!==size||info.height!==size||info.colorType!==6)fail(`pet portrait/master ${png} must be ${size}x${size} RGBA PNG`);
  }
  if(!portraitRegistry.includes(`master_roster/pets/portraits_512/${png}`))fail(`portrait registry does not reference ${png}`);
}
for(const file of units){
  if(!registry.includes(`master_roster/companions/runtime_96/${file}`))fail(`asset registry does not reference companion file ${file}`);
}

console.log(`PASS: master roster assets validated (${pets.length} remastered pets with 256px runtime, 512px portraits${reviewMastersPresent?', 1254px archived RGBA masters':' (design masters not bundled with app)'}; ${units.length} companions)`);
