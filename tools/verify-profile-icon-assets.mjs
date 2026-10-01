import {readFileSync,readdirSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const directory=fileURLToPath(new URL('../apps/mobile/assets/profile-icons-v1/',import.meta.url));
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
const results=[];
for(const name of readdirSync(directory).filter(name=>name.endsWith('.png'))){
 const png=readFileSync(join(directory,name));
 let width,height,depth,type,interlace;const chunks=[];
 for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+length);if(kind==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];type=data[9];interlace=data[12];}if(kind==='IDAT')chunks.push(data);offset+=length+12;}
 if(type!==6||depth!==8||interlace!==0)throw Error(name+': expected non-interlaced 8-bit RGBA PNG');
 const bytes=inflateSync(Buffer.concat(chunks)),stride=width*4;let previous=new Uint8Array(stride),offset=0,clear=0,partial=0,solid=0,edgeOpaque=0;
 for(let y=0;y<height;y++){const filter=bytes[offset++],row=new Uint8Array(stride);for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=previous[x],c=x>=4?previous[x-4]:0;const prediction=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN;if(!Number.isFinite(prediction))throw Error('Unknown PNG filter');row[x]=(bytes[offset++]+prediction)&255;}
  for(let x=0;x<width;x++){const alpha=row[x*4+3];if(alpha===0)clear++;else if(alpha===255)solid++;else partial++;if((x===0||y===0||x===width-1||y===height-1)&&alpha>16)edgeOpaque++;}previous=row;
 }
 if(clear<width*height*.1||!solid)throw Error(name+': genuine transparency check failed '+JSON.stringify({width,height,clear,solid,partial}));
 const emblem=/^(ironwarden|bastion|dreadguard|dawnkeeper|wayfinder|ravager|hexweaver|knife_dancer|stonecaller)\.png$/.test(name);
 if(emblem&&edgeOpaque)throw Error(name+': emblem reaches the canvas edge');
 results.push({name,width,height,transparentPercent:Math.round(clear/(width*height)*100),portraitTouchesEdge:!emblem&&edgeOpaque>0});
}
console.table(results);
console.log(`PASS: ${results.length} icons have genuine alpha. Emblems have transparent outer margins; portrait crops are reported above.`);

