import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const manifest=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
/** Bake an exact target pixel size with nearest-neighbor sampling and fixed caps. */
export async function bake(id,width,height,scale=1){
  const a=manifest.assets.find(x=>x.id===id);
  if(!a)throw new Error(`Unknown asset ${id}`);
  for(const n of [width,height,scale])if(!Number.isInteger(n)||n<1)throw new Error('Use positive integer dimensions/scale');
  if(a.mode==='fixed'){
    if(width!==a.width*scale||height!==a.height*scale)throw new Error('Fixed asset dimensions must match scale');
    return sharp(path.join(root,a.file)).resize(width,height,{kernel:'nearest'}).png().toBuffer();
  }
  const cap=a.insets;
  if(width<(cap.left+cap.right+8)*scale||height<a.minimumSize.height*scale)throw new Error('Dimensions smaller than protected caps');
  if(a.mode==='3slice'&&height!==a.height*scale)throw new Error('Three-slice height must equal native height × scale');
  const xs=[0,cap.left*scale,width-cap.right*scale,width],ys=a.mode==='9slice'?[0,cap.top*scale,height-cap.bottom*scale,height]:[0,height];
  const layers=[];
  for(const s of a.slices){
    const col=s.left===0?0:s.left===a.width-cap.right?2:1;
    const row=a.mode==='3slice'?0:s.top===0?0:s.top===a.height-cap.bottom?2:1;
    const buffer=await sharp(path.join(root,s.files[0].file)).resize(xs[col+1]-xs[col],ys[row+1]-ys[row],{fit:'fill',kernel:'nearest'}).png().toBuffer();
    layers.push({input:buffer,left:xs[col],top:ys[row]});
  }
  return sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [id,w,h,out,scale='1']=process.argv.slice(2);
  if(!out)throw new Error('Usage: node tools/bake.mjs ASSET_ID WIDTH HEIGHT RELATIVE_OUTPUT.png [ART_SCALE]');
  const dest=path.resolve(root,out);
  if(!dest.startsWith(root+path.sep)||path.extname(dest)!=='.png')throw new Error('Output must be a PNG inside this pack');
  const png=await bake(id,Number(w),Number(h),Number(scale));
  await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,png);
  console.log(dest);
}
