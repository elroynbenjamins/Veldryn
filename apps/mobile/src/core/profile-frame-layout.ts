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

/** Provisional source-space top-rail calibration for the reported Gloamward
 * background bleed. Other artwork stays unchanged until its aperture is audited.
 * Keep this separate from content layout: only the backdrop is clipped.
 * 10% of source height is a conservative screenshot-derived safe edge, not
 * a claim that all legacy assets have the same aperture. */
export function profileBackdropTopInset(borderId:string|undefined,width:number,height:number,sourceAspect=16/9,existingInset=8){
 if(borderId!=='frame_gloamward')return 0;
 const rail=profileFrameSegments(width,height,sourceAspect).find(segment=>segment.key==='0:2');
 if(!rail)return 0;
 return Math.max(0,Math.min(height/4,Math.ceil(rail.imageHeight*.10)-existingInset));
}

/** Shared full-profile design contract, in outer card logical pixels (dp).
 * No cosmetic ID is allowed to alter these anchors. Compact authoring previews
 * scale the permitted ornament envelope down, never up. */
export const PROFILE_SCENE_SAFE_LAYOUT={sideAnchor:46,bottomAnchor:28,stageBottomAnchor:31,petSize:58,contentGap:8,sideRail:18,horizontalRail:24,topCorner:30,bottomCorner:40,referenceWidth:300,referenceHeight:205} as const;
export function profileSceneContentAnchors(surfaceInset:number,compactStage=false){
 const l=PROFILE_SCENE_SAFE_LAYOUT;
 return {side:l.sideAnchor-surfaceInset,bottom:(compactStage?l.stageBottomAnchor:l.bottomAnchor)-surfaceInset,
  petSize:l.petSize,guildRightWithPet:l.sideAnchor+l.petSize+l.contentGap-surfaceInset};
}
type FrameRect={x:number;y:number;width:number;height:number};
export function profileSceneBorderZones(width:number,height:number):FrameRect[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
 const l=PROFILE_SCENE_SAFE_LAYOUT,scale=Math.min(1,width/l.referenceWidth,height/l.referenceHeight);
 const x=l.sideRail*scale,y=l.horizontalRail*scale,t=l.topCorner*scale,b=l.bottomCorner*scale;
 const zones:FrameRect[]=[
  {x:0,y:0,width,height:y},{x:0,y:height-y,width,height:y},
  {x:0,y:y,width:x,height:height-2*y},{x:width-x,y:y,width:x,height:height-2*y},
  {x:x,y:y,width:t-x,height:t-y},{x:width-t,y:y,width:t-x,height:t-y},
  {x:x,y:height-b,width:b-x,height:b-y},{x:width-b,y:height-b,width:b-x,height:b-y},
 ];
 return zones.filter(r=>r.width>0&&r.height>0);
}
/** Clip existing segmented artwork into a non-overlapping perimeter stencil,
 * without rescaling any image pixels. Reuse the same stencil for animated
 * border ornaments; no static or moving art may escape this envelope. */
export function profileSceneFrameSegments(width:number,height:number,sourceAspect=16/9,minCorner?:number){
 const zones=profileSceneBorderZones(width,height);
 return profileFrameSegments(width,height,sourceAspect,minCorner).flatMap(p=>zones.flatMap((z,i)=>{
  const x=Math.max(p.x,z.x),y=Math.max(p.y,z.y),right=Math.min(p.x+p.width,z.x+z.width),bottom=Math.min(p.y+p.height,z.y+z.height);
  if(right<=x||bottom<=y)return [];
  return [{...p,key:p.key+':'+i,x,y,width:right-x,height:bottom-y,imageLeft:p.imageLeft-(x-p.x),imageTop:p.imageTop-(y-p.y)}];
 }));
}
