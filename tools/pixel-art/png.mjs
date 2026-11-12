// Dependency-free PNG writer for generated pixel art (RGBA8, adaptive None/Up filtering).
// Nearest-neighbour scaled sprites are mostly repeated rows, which the Up filter turns into zeros.
import zlib from 'node:zlib';

const CRC_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;
    table[n]=c>>>0;
  }
  return table;
})();

function crc32(buffer){
  let c=0xffffffff;
  for(let i=0;i<buffer.length;i++)c=CRC_TABLE[(c^buffer[i])&0xff]^(c>>>8);
  return (c^0xffffffff)>>>0;
}

function chunk(type,data){
  const length=Buffer.alloc(4);length.writeUInt32BE(data.length,0);
  const body=Buffer.concat([Buffer.from(type,'ascii'),data]);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body),0);
  return Buffer.concat([length,body,crc]);
}

/** @param {number} width @param {number} height @param {Uint8Array} rgba row-major RGBA8 */
export function encodePng(width,height,rgba){
  if(rgba.length!==width*height*4)throw new Error(`PNG data size mismatch: ${rgba.length} for ${width}x${height}`);
  const stride=width*4,raw=Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++){
    const row=y*stride,out=y*(stride+1);
    let noneCost=0,upCost=0;
    for(let x=0;x<stride;x++){
      const value=rgba[row+x],above=y?rgba[row-stride+x]:0;
      noneCost+=value?1:0;upCost+=((value-above)&0xff)?1:0;
    }
    if(upCost<noneCost){
      raw[out]=2;
      for(let x=0;x<stride;x++)raw[out+1+x]=(rgba[row+x]-(y?rgba[row-stride+x]:0))&0xff;
    }else{
      raw[out]=0;
      for(let x=0;x<stride;x++)raw[out+1+x]=rgba[row+x];
    }
  }
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6;header[10]=0;header[11]=0;header[12]=0;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR',header),
    chunk('IDAT',zlib.deflateSync(raw,{level:9})),
    chunk('IEND',Buffer.alloc(0)),
  ]);
}
