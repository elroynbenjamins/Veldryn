'use strict';
// EAS / Metro native-build guard. The two checked-in Frostfall currency PNGs have
// corrupted IDAT integrity (and Aurora's source is truncated). Do not disable
// Android resource validation: safely restore Frostbell's exact pixels and supply
// a valid replacement Aurora Chime pixel-art icon before Metro packages assets.
// This is restricted to known historical Git blob identities; future valid art
// is never overwritten. Keep until both binary replacements are committed.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');

const root=path.resolve(__dirname,'..');
const sig=Buffer.from('89504e470d0a1a0a','hex');
const originalFrostbell='c03ec0d7c968c20cf45cd701a5f79fcd8904bf25';
const originalAurora='978f96833746e7c86c7ea31f47dd3adbffd16d4f';
const auroraReplacementBase64=[
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAADg0lEQVR42u3dTUgUYRzH8ZnoEBQbRbWLEYGExR56ZQt2RTC3MOnQ',
  'C5YdooKQDKLAAoWNCBcSSmgRTDsVRC90qEOohCbY6mG36AWJlBAikl07RIuHOk3XnkmfaZrZ2Zmd7+f2OLvjzPrz/7zszqyiAAAA',
  'AAAAAAAAAACAcqOW+wkGdzZof7ZQ2eljw/Fe4R2PtNf1q/RIv4H/I0AEAAQABAAEAAQALAOUGRt+RlNtr0zWGHpmPTz/vFzSywdb',
  '7T7p3RdYEybE35fTF2mUgFAAEAA4AGL3XZAXutT7T6+3YW0dIz0IlCtUgFAAEAA4MYxQGwia2me32lx3p97fMDW88nViO1q6LJ1g',
  'X0Ln39IH09rq8Nq1QAEAAQAPhxHSBR+CTtI5OBDaqf/iB2z/OpACAAIABYQMn7V7NjALvf77fK6PMCRuIfh4XzGdpUJ33+Xe2H9P',
  'U6oS5XqQAgACAAcOM6wLa0+H53uc/z3f75BioAXQAIABgDFMuWjtualee7bd6vpz+eaHdDUft8s/N8KgAIAAgA3LIOUGrDB1PS7X',
  'VPzpf0+NZfuyWMIT63t6hUABAAEACUwxjgTbX8M29G8/7Kmnrp/guTGUvHtyq4Urq9L5U2WBcIS9cF9J8X0L//rx8DUAFAAEAAwD',
  'rA/2ndcUb8wa+89PEZ3eO7XvdSAUAAQADAGMADHkWviH34+FVb96ek9lABQABAAMAYwIWOWuzzjfbXRwUAAQABAGMAVxjovSe0k3',
  'svCO2TkYil/d/JZoV2YvOU0J54P0sFAAEAAQBjgHm8u9xc0uvh9X24291vOy60Y+0tVAAQABAAsA6gKMr06KB0e+L5TUeP53BT2N',
  'b9OX0PISoAXQAIAHzL8Tm6/r55h3YdEbb/9Z0/Kyq8/Qp/nxGaocanQtvsvYWpACAAIADwyjpAfXZA6PM7Xr201IeCCgACAAIAb4',
  'wBzNLPk/2m6ctb6T2CHq7byr2CQQBAAOCJMcBgZJ+pPqt25IG0DxypPSb9HkG91tXTlo6/61uldLvRWn5iakz+vYhV/VQAEAAQAL',
  'AOME8f73XJqpip87F7nk8FAAEAAcACVL+dsFZ4Jp2Xq4H9KhUABAAEAKwDOO/U3Ki0jz69dLvQNnstXSje4+j5XJyclZ7PjY1ruC',
  '4ABAAEAIwB/oHV6+dLfS0eFQAEAAQAAAAAAAAAAAAADvgNWgvTBmSpB+IAAAAASUVORK5CYII='
].join('');
const assets=[
 {name:'Frostbell Token',file:'assets/events/frostfall/currency_frostbell_token.png',original:originalFrostbell},
 {name:'Aurora Chime',file:'assets/events/frostfall/currency_aurora_chime.png',original:originalAurora},
];
function crc32(data){
 let c=0xffffffff;
 for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
}
function chunk(tag,payload){
 const name=Buffer.from(tag,'ascii'),data=Buffer.alloc(12+payload.length);
 data.writeUInt32BE(payload.length,0);name.copy(data,4);payload.copy(data,8);
 data.writeUInt32BE(crc32(Buffer.concat([name,payload])),8+payload.length);
 return data;
}
function parseChunks(data,allowInvalid=false){
 if(data.length<8||!data.subarray(0,8).equals(sig))throw Error('Invalid PNG signature');
 const chunks=[];let offset=8,ended=false;
 while(offset+12<=data.length){
  const length=data.readUInt32BE(offset),end=offset+12+length;
  if(length>5000000||end>data.length)throw Error('Truncated PNG chunk');
  const name=data.toString('ascii',offset+4,offset+8),value=data.subarray(offset+8,offset+8+length);
  const saved=data.readUInt32BE(offset+8+length);
  const actual=crc32(data.subarray(offset+4,offset+8+length));
  if(!allowInvalid&&saved!==actual)throw Error('PNG '+name+' checksum mismatch');
  chunks.push({name,value});offset=end;
  if(name==='IEND'){ended=true;break;}
 }
 if(!ended||offset!==data.length)throw Error('Missing or trailing PNG IEND');
 return chunks;
}
function assertPng(data,label){
 const chunks=parseChunks(data),header=chunks.find(c=>c.name==='IHDR');
 if(!header||header.value.length!==13||header.value.readUInt32BE(0)!==128||header.value.readUInt32BE(4)!==128||header.value[8]!==8||header.value[9]!==6||header.value[12]!==0)throw Error(label+': expected 128x128 RGBA PNG');
 const ids=chunks.filter(c=>c.name==='IDAT').map(c=>c.value);
 if(!ids.length)throw Error(label+': missing IDAT');
 const decoded=zlib.inflateSync(Buffer.concat(ids));
 if(decoded.length!==128*(1+128*4))throw Error(label+': wrong decoded pixel count');
 for(let i=0;i<128;i++)if(decoded[i*513]>4)throw Error(label+': invalid PNG row filter');
 return true;
}
function gitSha(data){
 const h=crypto.createHash('sha1');
 h.update('blob '+data.length+'\0');h.update(data);
 return h.digest('hex');
}
function restoreFrostbell(data){
 // The original deflate block is sound but its zlib Adler32 and PNG CRC are not.
 const header=data.subarray(16,29);
 if(header.length!==13||header.readUInt32BE(0)!==128||header.readUInt32BE(4)!==128)throw Error('Unexpected Frostbell dimensions');
 const length=data.readUInt32BE(33);
 if(data.toString('ascii',37,41)!=='IDAT'||length<6||41+length>data.length)throw Error('Unexpected Frostbell layout');
 const idat=data.subarray(41,41+length);
 const pixels=zlib.inflateRawSync(idat.subarray(2,-4));
 if(pixels.length!==128*513)throw Error('Frostbell pixel restoration failed');
 for(let i=0;i<128;i++)if(pixels[i*513]>4)throw Error('Invalid Frostbell row filter');
 return Buffer.concat([sig,chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function repairFrostfallCurrencyImages(options={}){
 let repaired=0;
 for(const asset of assets){
  const filename=path.join(root,asset.file);
  const bytes=fs.readFileSync(filename);
  try{assertPng(bytes,asset.name);continue;}catch(_error){}
  if(options.verify)throw Error(asset.name+': corrupt PNG; run Frostfall currency prebuild repair');
  const oldSha=gitSha(bytes);
  if(oldSha!==asset.original)throw Error(asset.name+': unknown corrupt source '+oldSha+'; refusing to overwrite art');
  const fixed=asset.name==='Frostbell Token'?restoreFrostbell(bytes):Buffer.from(auroraReplacementBase64,'base64');
  assertPng(fixed,asset.name);
  const temp=filename+'.png-validation-tmp';
  fs.writeFileSync(temp,fixed);fs.renameSync(temp,filename);repaired++;
 }
 return repaired;
}
if(require.main===module){
 const repaired=repairFrostfallCurrencyImages({verify:process.argv.includes('--verify')});
 console.log('[Frostfall PNG] valid native resources; repaired '+repaired+' image(s)');
}
module.exports={repairFrostfallCurrencyImages,assertPng};
