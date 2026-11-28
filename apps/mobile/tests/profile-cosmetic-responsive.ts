import {sampleCosmeticTrack} from '../src/core/profile-cosmetic-motion-v2';
import {profileSceneBorderZones,profileFrameSegments,profileSceneFrameSegments} from '../src/core/profile-frame-layout';
import {PROFILE_COSMETIC_RUNTIME} from '../src/theme/profile-cosmetic-runtime-v1';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}

const FORMATS=[
 {name:'compact-phone',width:240,height:150},
 {name:'narrow-phone',width:280,height:205},
 {name:'standard-phone',width:340,height:205},
 {name:'wide-phone',width:420,height:236},
 {name:'large-phone',width:480,height:270},
 {name:'tablet-card',width:640,height:360},
 {name:'wide-tablet-card',width:760,height:360},
 {name:'square-preview',width:220,height:220},
 {name:'compact-chip',width:104,height:72},
] as const;

for(const format of FORMATS){
 const {width,height,name}=format;
 const zones=profileSceneBorderZones(width,height);
 const frame=profileFrameSegments(width,height,16/9);
 const clipped=profileSceneFrameSegments(width,height,16/9);
 ok(zones.length>0,name+' has border safe zones');
 ok(frame.length>0&&clipped.length>0,name+' can render segmented profile borders');
 for(const z of zones){
  ok(z.x>=0&&z.y>=0&&z.width>0&&z.height>0,name+' safe zone has valid geometry');
  ok(z.x+z.width<=width+.001&&z.y+z.height<=height+.001,name+' safe zone stays inside surface');
 }
 for(const p of clipped){
  ok(p.x>=-.001&&p.y>=-.001&&p.width>0&&p.height>0,name+' clipped frame segment is valid');
  ok(p.x+p.width<=width+.001&&p.y+p.height<=height+.001,name+' frame art stays inside surface');
 }
 // Inward corner details must survive the same stencil at top and bottom,
 // while the centre of the scene remains clear of frame art.
 const cornerScale=Math.min(1,width/300,height/205);
 const inset=35*cornerScale;
 for(const [x,y] of [[inset,inset],[width-inset,inset],[inset,height-inset],[width-inset,height-inset]]){
  ok(zones.some(z=>x>=z.x&&x<=z.x+z.width&&y>=z.y&&y<=z.y+z.height),name+' inward corner is inside the safe stencil');
  ok(clipped.some(p=>x>=p.x&&x<=p.x+p.width&&y>=p.y&&y<=p.y+p.height),name+' inward corner keeps its original artwork');
 }
 for(const z of zones){
  ok(zones.some(m=>Math.abs(m.x-z.x)<.001&&Math.abs(m.y-(height-z.y-z.height))<.001&&Math.abs(m.width-z.width)<.001&&Math.abs(m.height-z.height)<.001),name+' top and bottom stencil allowances are symmetric');
 }
 ok(!zones.some(z=>width/2>=z.x&&width/2<=z.x+z.width&&height/2>=z.y&&height/2<=z.y+z.height),name+' central profile content remains outside the border stencil');
 for(const collection of PROFILE_COSMETIC_RUNTIME){
  for(const track of collection.tracks){
   for(let step=0;step<=120;step++){
    const sample=sampleCosmeticTrack(track,step/120,width,height);
    ok(Number.isFinite(sample.x)&&Number.isFinite(sample.y)&&Number.isFinite(sample.width)&&Number.isFinite(sample.height),name+' '+collection.collection+' particle sample is finite');
    ok(sample.width>=0&&sample.height>=0,name+' '+collection.collection+' particle size is non-negative');
    ok(sample.x>=-.001&&sample.y>=-.001,name+' '+collection.collection+' particle starts inside scene');
    ok(sample.x+sample.width<=width+.001&&sample.y+sample.height<=height+.001,name+' '+collection.collection+' particle stays clipped to scene');
    ok(sample.opacity>=-.001&&sample.opacity<=1.001,name+' '+collection.collection+' opacity remains valid');
   }
  }
 }
}
console.log('PASS: animated profile cosmetics remain bounded across compact, narrow, phone, tablet, wide and square card formats');
