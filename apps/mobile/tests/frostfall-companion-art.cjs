'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');

const base=path.resolve(__dirname,'../assets/event_collectibles/frostfall_festival/companions');
const assets=[
 ['EVT_UNIT_012_Rimeshard_Wolverine.png','EVT_UNIT_012'],
 ['EVT_UNIT_013_Hearthguard_Ram.png','EVT_UNIT_013'],
];
const registry=fs.readFileSync(path.resolve(__dirname,'../src/theme/event-collectible-assets-active.ts'),'utf8');
const signature=Buffer.from([137,80,78,71,13,10,26,10]);

function analyze(file){
 const png=fs.readFileSync(file);
 assert.ok(png.subarray(0,8).equals(signature),'PNG signature: '+file);
 let cursor=8,header=null,transparency=null;
 const data=[];
 while(cursor+12<=png.length){
  const length=png.readUInt32BE(cursor),type=png.toString('ascii',cursor+4,cursor+8);
  const chunk=png.subarray(cursor+8,cursor+8+length);
  assert.ok(cursor+12+length<=png.length,'Complete PNG chunk: '+type);
  if(type==='IHDR')header={width:chunk.readUInt32BE(0),height:chunk.readUInt32BE(4),depth:chunk[8],color:chunk[9],interlace:chunk[12]};
  if(type==='tRNS')transparency=chunk;
  if(type==='IDAT')data.push(chunk);
  cursor+=length+12;
  if(type==='IEND')break;
 }
 assert.deepEqual(header,{width:96,height:96,depth:8,color:3,interlace:0},'96x96 indexed PNG portrait format');
 assert.ok(transparency&&transparency.includes(0),'Transparent background is required');
 assert.ok(data.length,'PNG image data is required');
 const raw=zlib.inflateSync(Buffer.concat(data)),stride=header.width,alpha=(index)=>transparency[index]??255;
 const previous=Buffer.alloc(stride),bbox={minX:stride,minY:stride,maxX:-1,maxY:-1};
 let pos=0,visible=0;
 for(let y=0;y<96;y++){
  const filter=raw[pos++],row=Buffer.alloc(stride);
  for(let x=0;x<stride;x++){
   const value=raw[pos++],a=x?row[x-1]:0,b=previous[x],c=x?previous[x-1]:0;
   let predictor=0;
   if(filter===1)predictor=a;
   if(filter===2)predictor=b;
   if(filter===3)predictor=Math.floor((a+b)/2);
   if(filter===4){
    const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
    predictor=da<=db&&da<=dc?a:db<=dc?b:c;
   }
   assert.ok(filter<=4,'Supported PNG scanline filter');
   row[x]=(value+predictor)&255;
   if(alpha(row[x])>0){
    visible++;
    bbox.minX=Math.min(bbox.minX,x);bbox.maxX=Math.max(bbox.maxX,x);
    bbox.minY=Math.min(bbox.minY,y);bbox.maxY=Math.max(bbox.maxY,y);
   }
  }
  row.copy(previous);
 }
 assert.ok(visible>=300,'Sprite contains enough visible art pixels');
 assert.ok(bbox.minX>=6&&bbox.minY>=6&&bbox.maxX<=89&&bbox.maxY<=89,'At least 6px safe padding on every side: '+JSON.stringify(bbox));
 return {visible,bbox,bytes:png.length};
}
for(const [filename,id] of assets){
 assert.ok(registry.includes("['"+id+"',require('../../assets/event_collectibles/frostfall_festival/companions/"+filename+"')]"),'Runtime companion portrait mapping for '+id);
 const check=analyze(path.join(base,filename));
 console.log('PASS',id,filename,JSON.stringify(check));
}
console.log('PASS: Frostfall companion PNG assets are registered, transparent, correctly sized and unclipped');

// Dedicated ability icons are compact indexed PNGs, separate from portrait art.
const abilityNames=["rimeshard_mark","aurora_pursuit","shattering_trail","hearthguard_aegis","woolen_bulwark","hearthbound_vow","frostbell_cycle","winter_cadence","grand_bell"];
const abilityRegistry=fs.readFileSync(path.resolve(__dirname,'../src/theme/frostfall-companion-ability-art.ts'),'utf8');
const abilityHashes=new Set();
for(const name of abilityNames){
 const filename=name+'.png',png=fs.readFileSync(path.join(base,'../abilities',filename));
 assert.ok(abilityRegistry.includes('/abilities/'+filename),'Ability asset registration: '+name);
 assert.ok(png.subarray(0,8).equals(signature),'Ability PNG signature: '+name);
 assert.equal(png.readUInt32BE(16),96);assert.equal(png.readUInt32BE(20),96);
 assert.equal(png[24],4);assert.equal(png[25],3);
 assert.ok(png.length<4096,'Compact ability icon: '+name);
 const chunks=[];let alpha;for(let p=8;p+12<=png.length;){const n=png.readUInt32BE(p),type=png.toString('ascii',p+4,p+8);assert.ok(p+n+12<=png.length,'Complete chunk '+name);const data=png.subarray(p+8,p+8+n);if(type==='tRNS')alpha=data;if(type==='IDAT')chunks.push(data);p+=12+n;if(type==='IEND')break;}
 assert.ok(alpha&&alpha.includes(0),'Transparent icon: '+name);assert.equal(zlib.inflateSync(Buffer.concat(chunks)).length,96*49,'Decodable 4-bit PNG: '+name);
 abilityHashes.add(require('node:crypto').createHash('sha256').update(png).digest('hex'));
}
assert.equal(abilityHashes.size,9,'All nine ability icons are distinct');
console.log('PASS: Frostfall ability icons are registered, transparent, compact and distinct');
