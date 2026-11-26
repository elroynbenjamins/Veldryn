import {CRIMSON_GLOWS,CRIMSON_TRACKS,CRIMSON_EFFECT_PERIOD_MS,CRIMSON_GLOW_PERIOD_MS} from '../src/dev/crimson-oath-motion-review';
import {STORMFORGED_GLOWS,STORMFORGED_TRACKS,STORMFORGED_EFFECT_PERIOD_MS,STORMFORGED_GLOW_PERIOD_MS} from '../src/dev/stormforged-motion-review';
import {PROFILE_COSMETIC_RUNTIME} from '../src/theme/profile-cosmetic-runtime-v1';
import {cosmeticGlowOpacity,MOTION_STEPS,sampleCosmeticTrack,type MotionProfile,type MotionTrack} from '../src/core/profile-cosmetic-motion-v2';
import {profileSceneFrameSegments} from '../src/core/profile-frame-layout';
import {WAVE2_SETS,WAVE2_READY_SET_IDS} from '../src/core/profile-cosmetic-wave2';
import {wardrobeVisualSections,wardrobeVisualTier,wardrobeCollectionLabel,wardrobeCollectionName} from '../src/components/profile/wardrobe-visual-tiers';
import {PROFILE_COSMETIC_PORTRAITS} from '../src/core/profile-cosmetic-icons';
import {PREMIUM_PROFILE_COSMETICS} from '../src/core/profile-premium-cosmetics';
import type {WardrobeRow} from '../src/core/profile-wardrobe';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
type Glow={periodMs:number;phaseMs:number;peakOpacity:number};
type ManifestGlow=Glow&{sourceRect?:number[]};
type ManifestTrack=MotionTrack&{sprite:string};
type Motion={collection:string;motionProfile:MotionProfile;effectPeriodMs:number;glows:readonly Glow[];tracks:readonly MotionTrack[]};
function metrics(row:Motion,w:number,h:number){
 let area=0,opacity=0,glow=0;
 for(const t of row.tracks)for(const f of MOTION_STEPS){const p=sampleCosmeticTrack(t,f,w,h);area+=p.width*p.height*p.opacity;opacity+=p.opacity;}
 for(const g of row.glows)for(const f of MOTION_STEPS)glow+=cosmeticGlowOpacity(row.motionProfile,f,g.periodMs,g.phaseMs,g.peakOpacity);
 return {area:area/MOTION_STEPS.length,opacity:opacity/(MOTION_STEPS.length*row.tracks.length),glow:glow/(MOTION_STEPS.length*row.glows.length)};
}
const standard=PROFILE_COSMETIC_RUNTIME.filter(r=>['gloamward','frostbound','amberglass','briarbound'].includes(r.motionProfile));
ok(standard.length===4,'standard reference collections');
const registry=readFileSync('src/theme/profile-cosmetic-wave2-assets.ts','utf8');
const activeProfiles=new Set<string>();
for(const set of WAVE2_SETS){
 const dir='assets/profile-cosmetics-wave2/'+set.id;
 if(!existsSync(dir+'/manifest.json')){
  ok(!WAVE2_READY_SET_IDS.includes(set.id),set.name+' cannot be ready without asset manifest');continue;
 }
 const manifest=JSON.parse(readFileSync(dir+'/manifest.json','utf8')) as {effectPeriodMs:number;glowClockMs:number;glows:ManifestGlow[];tracks:ManifestTrack[];files:Record<string,{size:number[];bytes:number;sha256:string}>};
 const motionProfile=set.id as MotionProfile;
 const row:Motion={collection:set.name,motionProfile,effectPeriodMs:manifest.effectPeriodMs,glows:manifest.glows,tracks:manifest.tracks};
 ok(row.glows.length===8&&row.tracks.length===5,set.name+' standard motion budget');
 ok(manifest.glowClockMs===12000&&row.effectPeriodMs>=10800&&row.effectPeriodMs<=13200,set.name+' standard cadence range');
 ok(row.glows.every(g=>g.peakOpacity===.86),set.name+' equivalent peak border visibility');
 ok(row.tracks.every(t=>t.maxDp<=18&&t.opacity>=.35&&t.opacity<=.78),set.name+' bounded particle appearance');
 for(const [w,h] of [[104,72],[260,174],[340,205],[480,270]]){
  const ref=standard.map(s=>metrics(s,w,h)),m=metrics(row,w,h);
  for(const key of ['area','opacity','glow'] as const){
   const lo=Math.min(...ref.map(v=>v[key])),hi=Math.max(...ref.map(v=>v[key]));
   ok(Number.isFinite(m[key])&&m[key]>=lo*.85&&m[key]<=hi*1.15,set.name+' '+key+' comparable to established standard range at '+w);
  }
  for(const t of row.tracks){
   ok(JSON.stringify(sampleCosmeticTrack(t,0,w,h))===JSON.stringify(sampleCosmeticTrack(t,1,w,h)),set.name+' seamless track');
  }
 }
 const artStart=registry.indexOf("borderId:'"+set.borderId+"'");
 ok(artStart>=0,set.name+' native registry entry exists');
 const end=registry.indexOf('],\n}',artStart);
 const art=registry.slice(artStart,end<0?undefined:end);
 ok(art.includes("effectId:'"+set.effectId+"'"),set.name+' effect registry ID');
 ok(art.includes("motionProfile:'"+set.id+"'"),set.name+' distinct motion identity');
 const rects=[...art.matchAll(/sourceRect:\[([^\]]+)\]/g)].map(m=>m[1].split(',').map(Number));
 ok(rects.length===8,set.name+' eight actual sprite anchors');
 // Validate the actual native source, not only the descriptive manifest. The
 // generated registry deliberately uses one single-line object per glow/track.
 const actualGlows=[...art.matchAll(/source:require\('([^']+)'\),sourceRect:\[([^\]]+)\],periodMs:([\d.]+),phaseMs:([\d.]+),peakOpacity:([\d.]+)/g)].map(m=>({source:m[1],sourceRect:m[2].split(',').map(Number),periodMs:Number(m[3]),phaseMs:Number(m[4]),peakOpacity:Number(m[5])}));
 const actualTracks=[...art.matchAll(/source:require\('([^']+)'\),points:(\[\[.*?\]\]),phase:([\d.]+),width:([\d.]+),maxDp:([\d.]+),opacity:([\d.]+),rotation:(-?[\d.]+),cycles:([\d.]+)/g)].map(m=>({source:m[1],points:JSON.parse(m[2]),phase:Number(m[3]),width:Number(m[4]),maxDp:Number(m[5]),opacity:Number(m[6]),rotation:Number(m[7]),cycles:Number(m[8])}));
 const prefix='../../'+dir+'/';
 ok(actualGlows.length===manifest.glows.length&&actualTracks.length===manifest.tracks.length,set.name+' runtime node counts match manifest');
 ok(art.includes('effectPeriodMs:'+manifest.effectPeriodMs+','),set.name+' native period matches manifest');
 const knownAsset=(source:string)=>source.startsWith(prefix)&&Object.prototype.hasOwnProperty.call(manifest.files,source.slice(prefix.length));
 for(const [i,g] of actualGlows.entries()){
  const expected=manifest.glows[i];
  ok(knownAsset(g.source),set.name+' glow references its own hashed sprite');
  ok(g.periodMs===expected.periodMs&&g.phaseMs===expected.phaseMs&&g.peakOpacity===expected.peakOpacity,set.name+' actual glow curve matches manifest');
  if(expected.sourceRect)ok(JSON.stringify(g.sourceRect)===JSON.stringify(expected.sourceRect),set.name+' actual glow rectangle matches manifest');
 }
 for(const [i,t] of actualTracks.entries()){
  const {sprite,...expected}=manifest.tracks[i],{source,...actual}=t;
  ok(knownAsset(source)&&source===prefix+sprite+'.png',set.name+' track uses its own intended sprite');
  for(const key of ['points','phase','width','maxDp','opacity','rotation','cycles'] as const)ok(JSON.stringify(actual[key])===JSON.stringify(expected[key]),set.name+' actual track '+key+' matches manifest');
 }
 const requiredSources=[...art.matchAll(/(?:border|wisp|particle|staticEffect):require\('([^']+)'\)/g)].map(m=>m[1]);
 ok(requiredSources.length===4&&requiredSources.every(knownAsset),set.name+' native frame and static fallback reference hashed assets');
 for(const id of set.iconIds){
  const marker="'"+id+"':require('",start=registry.indexOf(marker);
  ok(start>=0,set.name+' portrait registered');
  const source=registry.slice(start+marker.length).split("'")[0];
  ok(knownAsset(source),set.name+' portrait uses its own hashed asset');
 }
 for(const [w,h] of [[104,72],[260,174],[340,205],[480,270]]){
  const segments=profileSceneFrameSegments(w,h,16/9);
  for(const [x,y,sw,sh] of rects){
   ok(x>=0&&y>=0&&x+sw<=768&&y+sh<=432,set.name+' source rectangle is valid');
   const fragments=segments.filter(p=>{
    const left=p.x+p.imageLeft+x*p.imageWidth/768,top=p.y+p.imageTop+y*p.imageHeight/432;
    return Math.min(left+sw*p.imageWidth/768,p.x+p.width)>Math.max(left,p.x)&&Math.min(top+sh*p.imageHeight/432,p.y+p.height)>Math.max(top,p.y);
   });
   ok(fragments.length===1,set.name+' visible single fragment per glow at '+w);
  }
 }
 for(const [filename,meta] of Object.entries(manifest.files)){
  const bytes=readFileSync(dir+'/'+filename);
  ok(bytes.length===meta.bytes&&createHash('sha256').update(bytes).digest('hex')===meta.sha256,set.name+' asset exact bytes: '+filename);
  ok(bytes.readUInt32BE(16)===meta.size[0]&&bytes.readUInt32BE(20)===meta.size[1]&&bytes[25]===6,set.name+' RGBA dimensions: '+filename);
 }
 ok(set.iconIds.every(id=>registry.includes("'"+id+"':require(")),set.name+' both portrait assets registered');
 activeProfiles.add(set.id);
}
ok(WAVE2_READY_SET_IDS.every(id=>activeProfiles.has(id)),'all certified sets have validated assets and motion');
const tile=(kind:WardrobeRow['kind'],id:string,unlocked=true):WardrobeRow=>({kind,id,name:id,group:'test',unlocked,equipped:false});
const clear={...tile('frame',''),clear:true};
const normal=tile('frame','frame_gloamward');
const animated=tile('frame',standard[0].borderId);
const premium=tile('frame',PREMIUM_PROFILE_COSMETICS[0].borderId,false);
const sections=wardrobeVisualSections([premium,clear,animated,normal]);
ok(sections.standard[0]===clear&&sections.standard[1]===normal,'static rows preserve order and identity');
ok(sections.animated[0]===animated&&sections.premium[0]===premium&&!premium.unlocked,'tiers do not mutate row ownership');
for(const icon of PROFILE_COSMETIC_PORTRAITS)ok(wardrobeVisualTier(tile('icon',icon.id))==='animated','matching portrait belongs to animated collection');
for(const set of PREMIUM_PROFILE_COSMETICS){
 for(const row of [tile('frame',set.borderId),tile('effect',set.effectId),tile('scene',set.backgroundId),tile('pet',set.petId)])ok(wardrobeVisualTier(row)==='premium','premium piece belongs to premium tier');
 ok(wardrobeVisualTier(tile('frame',set.fallbackBorderId))==='standard','ordinary fallback does not become premium');
}
console.log('PASS standard cosmetic parity, exact assets, tier grouping and readiness fences');

for(const set of WAVE2_SETS){
 for(const [kind,id] of [['frame',set.borderId],['effect',set.effectId],['icon',set.iconIds[0]],['icon',set.iconIds[1]]] as const)ok(wardrobeCollectionName(tile(kind,id))===set.name,'reserved set piece has consistent label without changing visibility');
}
for(const row of standard){
 ok(wardrobeCollectionName(tile('frame',row.borderId))===row.collection,'standard border label');
 ok(wardrobeCollectionName(tile('effect',row.effectId))===row.collection,'standard effect label');
}
const tide=wardrobeCollectionLabel({...tile('frame','cosmetic:tideborne:pearlframe'),name:'Tideborne Pearlframe'});
ok(tide?.short==='Tideborne'&&tide.item==='Pearlframe'&&tide.fullName==='Tideborne · Pearlframe','avoid repeated collection prefix');
const clock=wardrobeCollectionLabel({...tile('icon','cosmetic:clockwork:portrait-engineer'),name:'Covenant Engineer'});
ok(clock?.short==='Clockwork'&&clock.item==='Engineer'&&clock.collection==='Clockwork Covenant','compact label and full accessible collection');
for(const set of PREMIUM_PROFILE_COSMETICS){
 ok(wardrobeCollectionName(tile('frame',set.borderId))===set.name,'premium border label');
 ok(wardrobeCollectionName(tile('effect',set.effectId))===set.name,'premium effect label');
 ok(wardrobeCollectionName(tile('scene',set.backgroundId))===set.name,'premium scene label');
 ok(wardrobeCollectionName(tile('pet',set.petId))===set.name,'premium pet label');
 ok(!wardrobeCollectionName(tile('frame',set.fallbackBorderId)),'no set label on ordinary fallback');
}
ok(!wardrobeCollectionName(clear),'no label on clear');
console.log('PASS consistent set labels without ownership or ID changes');

 // Validate Stormforged motion authoring before bitmap import. Artwork geometry is
 // deliberately not certified here. The full manifest checks above apply after import.
const storm:Motion={collection:'Stormforged',motionProfile:'stormforged',effectPeriodMs:STORMFORGED_EFFECT_PERIOD_MS,glows:STORMFORGED_GLOWS,tracks:STORMFORGED_TRACKS};
ok(storm.glows.length===8&&storm.tracks.length===5,'Stormforged matches standard node budget');
ok(STORMFORGED_GLOW_PERIOD_MS===12000&&storm.effectPeriodMs===10800,'Stormforged shared clock and cadence');
for(const [w,h] of [[104,72],[260,174],[340,205],[480,270]]){
 const refs=standard.map(s=>metrics(s,w,h)),m=metrics(storm,w,h);
 for(const key of ['area','opacity','glow'] as const){
  ok(m[key]>=Math.min(...refs.map(v=>v[key]))*.85&&m[key]<=Math.max(...refs.map(v=>v[key]))*1.15,'Stormforged '+key+' standard parity');
 }
 for(const t of storm.tracks){
  ok(t.maxDp<=18&&t.opacity>=.35&&t.opacity<=.78,'Stormforged bounded sprite');
  ok(JSON.stringify(sampleCosmeticTrack(t,0,w,h))===JSON.stringify(sampleCosmeticTrack(t,1,w,h)),'Stormforged closed path clock');
  for(const f of MOTION_STEPS){
   const p=sampleCosmeticTrack(t,f,w,h);
   ok(p.x>=-1e-6&&p.y>=-1e-6&&p.x+p.width<=w+1e-6&&p.y+p.height<=h+1e-6,'Stormforged track stays within card');
  }
 }
}
for(const g of storm.glows){
 const samples=MOTION_STEPS.map(f=>cosmeticGlowOpacity('stormforged',f,g.periodMs,g.phaseMs,g.peakOpacity));
 ok(samples.every(v=>v>=0&&v<=.86),'Stormforged bounded glow');
 ok(samples[0]===samples[samples.length-1],'Stormforged closed glow clock');
 ok(samples.slice(1).every((v,i)=>Math.abs(v-samples[i])<.18),'Stormforged gradual glow, not abrupt strobe');
}
console.log('PASS Stormforged authoring motion parity; artwork still required');

const crimson:Motion={collection:'Crimson Oath',motionProfile:'crimson-oath',effectPeriodMs:CRIMSON_EFFECT_PERIOD_MS,glows:CRIMSON_GLOWS,tracks:CRIMSON_TRACKS};
ok(crimson.glows.length===8&&crimson.tracks.length===5,'Crimson matches standard node budget');
ok(CRIMSON_GLOW_PERIOD_MS===12000&&crimson.effectPeriodMs===13200,'Crimson shared clock and cadence');
for(const [w,h] of [[104,72],[260,174],[340,205],[480,270]]){
 const refs=standard.map(s=>metrics(s,w,h)),m=metrics(crimson,w,h);
 for(const key of ['area','opacity','glow'] as const)ok(m[key]>=Math.min(...refs.map(v=>v[key]))*.85&&m[key]<=Math.max(...refs.map(v=>v[key]))*1.15,'Crimson '+key+' standard parity');
 for(const t of crimson.tracks){
  ok(t.maxDp<=18&&t.opacity>=.35&&t.opacity<=.78,'Crimson bounded sprite');
  ok(JSON.stringify(sampleCosmeticTrack(t,0,w,h))===JSON.stringify(sampleCosmeticTrack(t,1,w,h)),'Crimson closed path clock');
  for(const f of MOTION_STEPS){
   const p=sampleCosmeticTrack(t,f,w,h);
   ok(p.x>=-1e-6&&p.y>=-1e-6&&p.x+p.width<=w+1e-6&&p.y+p.height<=h+1e-6,'Crimson track stays within card');
  }
 }
}
for(const g of crimson.glows){
 const samples=MOTION_STEPS.map(f=>cosmeticGlowOpacity('crimson-oath',f,g.periodMs,g.phaseMs,g.peakOpacity));
 ok(samples.every(v=>v>=0&&v<=.86),'Crimson bounded glow');
 ok(samples[0]===samples[samples.length-1],'Crimson closed glow clock');
}
const profileIcon=readFileSync('src/components/ProfileIcon.tsx','utf8');
ok(!profileIcon.includes('ProfileFrameOverlay')&&!profileIcon.includes('profileBorderSourceById')&&!profileIcon.includes('profileBorderId'),'portrait renderer stays independent of equipped scene frames');
console.log('PASS Crimson authoring motion parity and independent icon renderer; artwork still requires review');
