const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
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
 const p=path.join(root,'assets/card-backgrounds',id+'_square.png'),bytes=fs.readFileSync(p);assert.equal(bytes.toString('ascii',1,4),'PNG');assert.equal(bytes.readUInt32BE(16),bytes.readUInt32BE(20));assert.ok(assets.includes(id+'_square.png'));
 for(const variant of ['wide_v2','portrait']){
  const bytes=fs.readFileSync(path.join(root,'assets/card-backgrounds',id+'_'+variant+'.png')),w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  assert.ok(Math.min(w,h)>=900,'Full-card art must not use the 320px thumbnail');
  assert.ok(variant==='portrait'?w/h<.8:w/h>1.6);
  assert.ok(assets.includes(id+'_'+variant+'.png'));
 }
}
const personalVariants=read('src/theme/card-background-assets.ts');
for(const id of ['harvestwake','grand_storehouse','kingdom_approach']){
 for(const variant of ['wide_v2','square_v2','portrait']){
  const file=id+'_'+variant+'.png',bytes=fs.readFileSync(path.join(root,'assets/card-backgrounds',file)),w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  assert.ok(Math.min(w,h)>=900,'Every profile background variant must be high resolution: '+file);
  assert.ok(variant==='portrait'?w/h<.8:variant==='square_v2'?Math.abs(w/h-1)<.01:w/h>1.6);
  assert.ok(personalVariants.includes(file),'Variant must be registered: '+file);
 }
}
for(const id of ['bg_harvestwake','bg_grand_storehouse','bg_kingdom_approach'])assert.ok(personalVariants.includes("['"+id+"'"),'Background must have responsive variants: '+id);
const futureVariants=read('src/theme/card-background-assets-future.ts');
for(const id of ['bloomwake','veilbreak','frostfall','heartbond','starfall','volcanic_stronghold','aurora_citadel','cosmic_gate']){
 for(const variant of ['wide_v2','square_v2','portrait'])assert.ok(futureVariants.includes(id+'_'+variant+'.png'),'Future background variant must remain archived: '+id+'_'+variant+'.png');
}
for(const file of ['ProfileScenePreview.tsx','PublicProfileScene.tsx','ProfileEditor.tsx'])assert.ok(read('src/components/'+file).includes('<ProfileFrameOverlay'));
const online=read('src/components/OnlineGuildCustomizationPanel.tsx');assert.ok(online.includes('background_id:result.background_id'));assert.ok(online.includes('backgroundId!==normalizeGuildBackgroundId(guild.background_id)'));assert.ok(online.includes('disabled={!editable||busy}'));
assert.ok(read('src/core/save-normalization.ts').includes('guildBackgroundId:normalizeGuildBackgroundId'));
console.log('PASS: card artwork variants, personal frame geometry, unlock gates and persistence wiring');
