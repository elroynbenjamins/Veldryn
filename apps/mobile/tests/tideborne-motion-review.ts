import {sampleTideborneReview,TIDEBORNE_REVIEW_GLOWS,TIDEBORNE_REVIEW_TRACKS} from '../src/dev/tideborne-motion-review';
import {profileSceneBorderZones} from '../src/core/profile-frame-layout';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
ok(TIDEBORNE_REVIEW_GLOWS.length===8,'eight glow anchors');
ok(TIDEBORNE_REVIEW_TRACKS.length===5,'five effect tracks');
for(const [w,h] of [[104,72],[260,150],[340,190],[480,270]]){
 const initial=sampleTideborneReview(w,h,0,0);
 ok(initial.glows.length===8,'all artwork anchors map to segments');
 ok(same(initial,sampleTideborneReview(w,h,1,1)),'both independent clocks close exactly');
 ok(same(sampleTideborneReview(w,h,0,0,true,true),sampleTideborneReview(w,h,.9,.9,true,true)),'static reduced motion');
 ok(!sampleTideborneReview(w,h,0,0,false).glows.length,'hidden has no glows');
 ok(!sampleTideborneReview(w,h,0,0,false).particles.length,'hidden has no particles');
 const zones=profileSceneBorderZones(w,h);
 for(let i=0;i<=120;i++){
  const f=sampleTideborneReview(w,h,i/120,i/120);
  for(const {bounds:b,opacity} of f.glows){
   ok(zones.some(z=>b.x>=z.x-1e-6&&b.y>=z.y-1e-6&&b.x+b.width<=z.x+z.width+1e-6&&b.y+b.height<=z.y+z.height+1e-6),'glow stays in perimeter');
   ok(opacity>=0&&opacity<=.86,'glow opacity bounded');
  }
  for(const p of f.particles){
   ok(p.x>=-1e-6&&p.y>=-1e-6&&p.x+p.width<=w+1e-6&&p.y+p.height<=h+1e-6,'particle bounds');
   ok(p.opacity>=0&&p.opacity<=.7,'particle opacity bounded');
  }
 }
}
ok(!sampleTideborneReview(0,0,0,0).particles.length,'zero layout');
ok(!sampleTideborneReview(300,200,NaN,0).particles.length,'invalid clock');
console.log('PASS Tideborne isolated motion fixture');
