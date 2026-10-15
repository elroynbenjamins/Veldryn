import path from 'node:path';
import process from 'node:process';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const [file]=process.argv.slice(2);
if(!file)throw new Error('Usage: node tools/validate-equipment-atlas.mjs <atlas.webp>');

const expected={width:960,height:384,columns:5,rows:2,cell:192,edgePadding:23};
const image=sharp(path.resolve(file));
const metadata=await image.metadata();
if(metadata.width!==expected.width||metadata.height!==expected.height){
  throw new Error(`atlas_dimensions:${metadata.width}x${metadata.height}; expected ${expected.width}x${expected.height}`);
}
if(!metadata.hasAlpha)throw new Error('atlas_requires_transparent_background');
const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});
const failures=[];
for(let row=0;row<expected.rows;row++)for(let column=0;column<expected.columns;column++){
  let minX=expected.cell,minY=expected.cell,maxX=-1,maxY=-1;
  for(let y=0;y<expected.cell;y++)for(let x=0;x<expected.cell;x++){
    const alpha=data[((row*expected.cell+y)*info.width+(column*expected.cell+x))*4+3];
    if(alpha<=8)continue;
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  const cell=row*expected.columns+column;
  if(maxX<0){failures.push(`empty_cell:${cell}`);continue;}
  if(minX<expected.edgePadding||minY<expected.edgePadding||maxX>=expected.cell-expected.edgePadding||maxY>=expected.cell-expected.edgePadding){
    failures.push(`unsafe_crop:${cell}:${minX},${minY}-${maxX},${maxY}`);
  }
}
if(failures.length)throw new Error(failures.join('\n'));
console.log(`PASS: ${path.basename(file)} has 10 contained ${expected.cell}px cells with ${expected.edgePadding}px safety padding`);
