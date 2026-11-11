/** Personal frames are authored at 16:9. Keep corner/medallion proportions
 * in square and rectangular cards; scale only the unadorned connecting rails.
 * `minCorner` is the corner's target pixel size. Callers that pass nothing get it from
 * the card: the same frame has to read on a 44px collection chip, a 104px wardrobe tile,
 * the 168px customize stage and a 270px showcase card, so the ornament tracks the card's
 * short side rather than a constant that is heavy on small cards and thin on large ones. */
export function profileFrameCorner(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 0;
 return Math.max(11,Math.min(72,Math.round(Math.min(width,height)*.26)));
}
export function profileFrameSegments(width:number,height:number,sourceAspect=16/9,minCorner?:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isFinite(sourceAspect)||sourceAspect<=0)return [];
 const corner=minCorner===undefined?profileFrameCorner(width,height):minCorner;
 if(!Number.isFinite(corner)||corner<=0)return [];
 const sx=[0,.20,.34,.66,.80,1],sy=[0,.34,.42,.58,.66,1];
 const scale=Math.min(corner/(.20*sourceAspect),corner/.34,width*.25/(.20*sourceAspect),height*.25/.34);
 const cx=.20*sourceAspect*scale,cy=.34*scale,mx=.32*sourceAspect*scale,my=.16*scale;
 const xs=[0,cx,(width-mx)/2,(width+mx)/2,width-cx,width],ys=[0,cy,(height-my)/2,(height+my)/2,height-cy,height];
 const segments=[];
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){
  if(row!==0&&row!==4&&col!==0&&col!==4)continue;
  const w=xs[col+1]-xs[col],h=ys[row+1]-ys[row],imageWidth=w/(sx[col+1]-sx[col]),imageHeight=h/(sy[row+1]-sy[row]);
  segments.push({key:`${row}:${col}`,x:xs[col],y:ys[row],width:w,height:h,imageWidth,imageHeight,imageLeft:-sx[col]*imageWidth,imageTop:-sy[row]*imageHeight});
 }
 return segments;
}
