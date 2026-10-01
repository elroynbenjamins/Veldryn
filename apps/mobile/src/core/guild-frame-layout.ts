/** Preserve corners and central ornaments; stretch only the connecting rails.
 * The transparent middle is never painted over profile content. */
export function guildFrameSegments(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
 const source=[0,.28,.38,.62,.72,1];
 const cuts=(length:number)=>{
  const corner=Math.min(28,length*.28),ornament=Math.min(32,length*.24);
  return [0,corner,(length-ornament)/2,(length+ornament)/2,length-corner,length];
 };
 const xs=cuts(width),ys=cuts(height);
 const segments=[];
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){
  if(row!==0&&row!==4&&col!==0&&col!==4)continue;
  const w=xs[col+1]-xs[col],h=ys[row+1]-ys[row];
  const imageWidth=w/(source[col+1]-source[col]),imageHeight=h/(source[row+1]-source[row]);
  segments.push({key:`${row}:${col}`,x:xs[col],y:ys[row],width:w,height:h,imageWidth,imageHeight,imageLeft:-source[col]*imageWidth,imageTop:-source[row]*imageHeight});
 }
 return segments;
}
