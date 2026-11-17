const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/theme/pet-art.ts'), 'utf8');
const collections = fs.readFileSync(path.join(root, 'src/screens/CollectionsScreen.tsx'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'src/theme/guild-token-shop-art.ts'), 'utf8');

// Expanded portraits must never use the compact Guild Shop thumbnails.
for (const [id, name] of [
  ['GUILD_PET_001', 'Stormwatch_Fox'],
  ['GUILD_PET_002', 'Oathwood_Wyrmling'],
]) {
  const portrait = 'assets/guild-token-shop/pets/portraits/' + id + '_' + name + '.png';
  const compact = 'assets/guild-token-shop/pets/' + id + '_' + name + '.webp';
  const data = fs.readFileSync(path.join(root, portrait));
  const thumb = fs.readFileSync(path.join(root, compact));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', id + ': portrait must be a PNG');
  assert.ok(data.length > 200_000, id + ': portrait must not be a thumbnail/placeholder');
  assert.ok(data.readUInt32BE(16) >= 512 && data.readUInt32BE(20) >= 512, id + ': portrait must have >=512px dimensions');
  assert.equal(thumb.toString('ascii', 0, 4), 'RIFF', id + ': compact runtime asset should remain WebP');
  assert.ok(source.includes("['" + id + "',require('../../" + portrait + "')]"), id + ': detail registry must use the portrait PNG');
  assert.ok(source.includes("['" + id + "',require('../../" + compact + "')]"), id + ': compact registry must retain the thumbnail');
  assert.ok(shop.includes(compact), id + ': Guild Token Shop should retain lightweight thumbnail');
}
assert.ok(source.includes("const EVENT_PET_PORTRAIT_IDS=new Set(['EVT_PET_013','EVT_PET_014'])"), 'only portrait-grade event art may fill the detail stage');
const detailResolver = source.split('export function petDetailArtSource(id:string)')[1] ?? '';
assert.ok(!detailResolver.includes('dungeonShopPetArtSource(id)'), 'tiny Dungeon Shop pet sprites must not be enlarged as portraits');
assert.ok(collections.includes('if(large)return <View style={s.petPreviewFrame}>'), 'low-resolution pets must use the inset preview');
assert.ok(collections.includes('large?petDetailArtSource(row.id):undefined'), 'detail sheet must use portrait art');
assert.ok(collections.includes('resizeMode="contain"'), 'portrait art must not be cropped');
console.log('PASS: Guild Shop pet thumbnails and high-resolution collection portraits remain distinct');
