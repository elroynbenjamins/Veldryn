import {PROFILE_SCENE_SAFE_LAYOUT as SAFE,profileFrameSegments} from './profile-frame-layout';
import {sakuraV2OrnamentTracks,stormforgedV2OrnamentTracks,type NextPremiumTheme,type OrnamentTrack} from './next-premium-motion-review';

/** Map the authored 16:9 landmarks through the actual segmented frame, then
 * constrain every sample to one convex perimeter rail. Linear interpolation
 * stays in that rail too. Scale the radius down on narrow/square cards. */
export function nextPremiumStandardBorderTracks(theme:NextPremiumTheme,width:number,height:number):OrnamentTrack[]{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<44||height<32)return [];
 const q=Math.min(1,width/SAFE.referenceWidth,height/SAFE.referenceHeight);
 const side=SAFE.sideRail*q,rail=SAFE.horizontalRail*q;
 const k=Math.min(1,width/340,height/205);
 const segments=profileFrameSegments(width,height,16/9);
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 const base=theme==='petal-waltz'?sakuraV2OrnamentTracks('standard',false):stormforgedV2OrnamentTracks('standard',false);
 return base.map((track,i)=>{
  const zone=i===0?'left':i===1?'right':track.frames[0].y<102.5?'top':'bottom';
  const limit=zone==='left'||zone==='right'?side:rail;
  const radius=Math.min(track.radius*k,limit*.44/1.12);
  const r=radius*1.12;
  const frames=track.frames.map(f=>{
   const nx=f.x/340,ny=f.y/205;
   const p=segments.find(p=>{const x=nx*p.imageWidth+p.imageLeft,y=ny*p.imageHeight+p.imageTop;return x>=-1e-6&&y>=-1e-6&&x<=p.width+1e-6&&y<=p.height+1e-6;});
   const x=p?p.x+nx*p.imageWidth+p.imageLeft:nx*width;
   const y=p?p.y+ny*p.imageHeight+p.imageTop:ny*height;
   return {...f,x:clamp(x,zone==='right'?width-side+r:r,zone==='left'?side-r:width-r),
    y:clamp(y,zone==='bottom'?height-rail+r:r,zone==='top'?rail-r:height-r)};
  });
  return {...track,radius,frames};
 });
}
