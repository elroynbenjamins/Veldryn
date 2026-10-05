const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const imageSize=relative=>{const bytes=fs.readFileSync(path.join(root,relative));if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){let offset=12;while(offset+8<=bytes.length){const kind=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),data=offset+8;if(kind==='VP8X'&&data+10<=bytes.length)return {w:1+bytes.readUIntLE(data+4,3),h:1+bytes.readUIntLE(data+7,3)};if(kind==='VP8L'&&data+5<=bytes.length){const b0=bytes[data+1],b1=bytes[data+2],b2=bytes[data+3],b3=bytes[data+4];return {w:1+(b0|((b1&0x3f)<<8)),h:1+((b1>>6)|(b2<<2)|((b3&0xf)<<10))};}if(kind==='VP8 '){for(let i=data;i+7<Math.min(bytes.length,data+32);i++)if(bytes[i]===0x9d&&bytes[i+1]===0x01&&bytes[i+2]===0x2a)return {w:bytes.readUInt16LE(i+3)&0x3fff,h:bytes.readUInt16LE(i+5)&0x3fff};}offset=data+length+(length&1);}throw new Error('Unsupported WebP layout: '+relative);}if(bytes.toString('ascii',1,4)==='PNG')return {w:bytes.readUInt32BE(16),h:bytes.readUInt32BE(20)};throw new Error('Unsupported image format: '+relative);};
function load(file){const sandbox={exports:{}};vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);return sandbox.exports}
const {cardBackgroundVariant}=load('src/core/card-background-layout.ts');
for(const [w,h,wanted] of [[400,180,'wide'],[288,300,'square'],[280,280,'square'],[120,68,'wide'],[0,0,'wide'],[NaN,20,'wide']])assert.equal(cardBackgroundVariant(w,h),wanted);
for(const [w,h,wanted] of [[240,360,'portrait'],[239,300,'portrait'],[240,300,'square'],[434,300,'square'],[435,300,'wide'],[400,0,'wide'],[-1,300,'wide']])assert.equal(cardBackgroundVariant(w,h),wanted);
const {profileFrameSegments}=load('src/core/profile-frame-layout.ts');
for(const [w,h] of [[144,88],[288,288],[400,205],[400,350],[800,205],[40,40],[1,1]]){
 const pieces=profileFrameSegments(w,h);assert.equal(pieces.length,16);
 for(const p of pieces){assert.ok(p.width>0&&p.height>0);assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=w+.0001&&p.y+p.height<=h+.0001)}
 for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){
  const a=pieces[i],b=pieces[j];assert.ok(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)<.0001||Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)<.0001);
 }
 const corner=pieces[0];assert.ok(Math.abs(corner.imageWidth/corner.imageHeight-16/9)<.0001,'corners retain source proportions');
}
assert.equal(profileFrameSegments(0,20).length,0);
const {GUILD_BACKGROUNDS,normalizeGuildBackgroundId,isGuildCosmeticUnlocked}=load('src/core/guild-customization.ts');
assert.equal(normalizeGuildBackgroundId('not-real'),'plain');assert.equal(normalizeGuildBackgroundId('forest_sanctum'),'forest_sanctum');
for(const row of GUILD_BACKGROUNDS){assert.equal(isGuildCosmeticUnlocked(row.unlock,{guildLevel:1,bannerGalleryTier:0,pveAchievementIds:[]}),row.id!=='forest_sanctum');assert.ok(isGuildCosmeticUnlocked(row.unlock,{guildLevel:10,bannerGalleryTier:0,pveAchievementIds:[]}))}
const assets=read('src/theme/card-background-assets.ts');
for(const id of ['guild_plaza','forest_sanctum']){
 const file=id+'_square.webp',size=imageSize('assets/card-backgrounds/'+file);assert.equal(size.w,size.h);assert.ok(assets.includes(file));
 for(const variant of ['wide_v2','portrait']){
  const variantFile=id+'_'+variant+'.webp',size=imageSize('assets/card-backgrounds/'+variantFile),w=size.w,h=size.h;
  assert.ok(Math.min(w,h)>=900,'Full-card art must not use the 320px thumbnail');
  assert.ok(variant==='portrait'?w/h<.8:w/h>1.6);
  assert.ok(assets.includes(variantFile));
 }
}
const personalVariants=read('src/theme/card-background-assets.ts');
for(const id of ['harvestwake','grand_storehouse','kingdom_approach']){
 for(const variant of ['wide_v2','square_v2','portrait']){
  const file=id+'_'+variant+'.webp',size=imageSize('assets/card-backgrounds/'+file),w=size.w,h=size.h;
  assert.ok(Math.min(w,h)>=900,'Every profile background variant must be high resolution: '+file);
  assert.ok(variant==='portrait'?w/h<.8:variant==='square_v2'?Math.abs(w/h-1)<.01:w/h>1.6);
  assert.ok(personalVariants.includes(file),'Variant must be registered: '+file);
 }
}
for(const id of ['bg_harvestwake','bg_grand_storehouse','bg_kingdom_approach'])assert.ok(personalVariants.includes("['"+id+"'"),'Background must have responsive variants: '+id);
const futureVariants=read('src/theme/card-background-assets-future.ts');
for(const id of ['bloomwake','veilbreak','frostfall','heartbond','starfall','volcanic_stronghold','aurora_citadel','cosmic_gate']){
 for(const variant of ['wide_v2','square_v2','portrait'])assert.ok(futureVariants.includes(id+'_'+variant+'.webp'),'Future background variant must remain archived: '+id+'_'+variant+'.webp');
}
for(const file of ['ProfileScenePreview.tsx','PublicProfileScene.tsx','ProfileEditor.tsx'])assert.ok(read('src/components/'+file).includes('<ProfileFrameOverlay'));
const online=read('src/components/OnlineGuildCustomizationPanel.tsx');assert.ok(online.includes('background_id:result.background_id'));assert.ok(online.includes('backgroundId!==normalizeGuildBackgroundId(guild.background_id)'));assert.ok(online.includes('disabled={!editable||busy}'));
assert.ok(read('src/core/save-normalization.ts').includes('guildBackgroundId:normalizeGuildBackgroundId'));
console.log('PASS: card artwork variants, personal frame geometry, unlock gates and persistence wiring');
