const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const geometry=fs.readFileSync(path.join(root,'src/core/guild-frame-layout.ts'),'utf8');
const sandbox={exports:{}};
vm.runInNewContext(ts.transpileModule(geometry,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
const {guildFrameSegments}=sandbox.exports;
for(const [width,height] of [[40,40],[44,44],[54,54],[288,180],[400,180],[800,260],[288,360]]){
 const segments=guildFrameSegments(width,height);
 assert.equal(segments.length,16);
 for(const p of segments){
  assert.ok(p.width>0&&p.height>0);
  assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=width+.0001&&p.y+p.height<=height+.0001);
  assert.ok(p.imageLeft<=0&&p.imageTop<=0);
  assert.ok(p.imageLeft+p.imageWidth>=p.width-.0001&&p.imageTop+p.imageHeight>=p.height-.0001);
 }
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j];
  const overlapX=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x);
  const overlapY=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
  assert.ok(overlapX<.0001||overlapY<.0001,'Frame pieces must not overlap');
 }
 assert.ok(!segments.some(p=>p.x<width/2&&p.x+p.width>width/2&&p.y<height/2&&p.y+p.height>height/2),'Keep content center clear');
 assert.equal(segments[0].width,Math.min(28,width*.28));
}
for(const [w,h] of [[0,40],[-1,40],[NaN,40],[40,Infinity]])assert.equal(guildFrameSegments(w,h).length,0);
const social=fs.readFileSync(path.join(root,'src/components/SocialIdentity.tsx'),'utf8');
const crestStyle=social.match(/guildCrest:\{([^}]+)\}/)[1];
assert.ok(!/borderWidth|borderRadius|overflow/.test(crestStyle),'No synthetic outline or clipping around decorative crest');
assert.ok(social.includes('<GuildBannerArtwork height={size}'),'Compact views keep the full banner');
assert.ok(!social.includes('guildBorderSourceByKey'),'No ornate frame on compact banners');
const summary=fs.readFileSync(path.join(root,'src/components/GuildIdentitySummary.tsx'),'utf8');
assert.ok(summary.includes('<GuildProfileFrame frameId={frameId}'));
assert.ok(summary.includes('<GuildBannerArtwork height={120}'));
assert.ok(summary.includes('numberOfLines={1}'),'Guild names stay on one line in both card sizes');
assert.ok(summary.includes('<GuildTaggedPlayerName plainTag'),'No box around the profile tag');
assert.ok(!summary.includes('guildNameplateSourceByKey'),'No decorative artwork behind the name');
for(const file of ['GuildCustomizationPanel.tsx','OnlineGuildCustomizationPanel.tsx']){
 const source=fs.readFileSync(path.join(root,'src/components',file),'utf8');
 assert.ok(source.includes('<GuildIdentitySummary'),'Preview must use real profile presentation');
 assert.ok(source.includes('<GuildFrameSwatch'),'Preview actual frame artwork');
 assert.ok(source.includes('<GuildBannerArtwork'),'Preview actual banner artwork');
}
console.log('PASS: guild frame geometry, unclipped crests, full banners and shared appearance previews');
