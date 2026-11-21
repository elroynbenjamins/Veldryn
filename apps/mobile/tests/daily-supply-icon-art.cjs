const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const component=fs.readFileSync(path.join(root,'src/components/SupplyJourneyGlyph.tsx'),'utf8');
const screen=fs.readFileSync(path.join(root,'src/screens/DailySuppliesScreen.tsx'),'utf8');
const boosts=['gathering_speed','crafting_speed','skill_xp','combat_xp','combat_speed'];
for(const type of boosts){
 const artwork=path.join(root,'src/assets/daily-supplies',type+'.png');
 const png=fs.readFileSync(artwork);
 assert.equal(png.subarray(1,4).toString('ascii'),'PNG',type+' should be a PNG');
 assert.ok(png.length>300,type+' should have actual pixel art');
 assert.match(component,new RegExp(type+'\\.png'),type+' should map to an icon');
}
assert.match(component,/kind!==['"]milestone['"]/, 'milestone artwork stays separate');
assert.match(screen,/<SupplyJourneyGlyph kind=\{type\} size=\{24\}\/>/, 'blessing choices use the new artwork');
assert.match(screen,/<SupplyJourneyGlyph kind=\{type\} size=\{32\}\/>/, 'Boost Vault uses the new artwork');
assert.match(screen,/<SupplyJourneyGlyph kind=\{milestone\?'milestone':reward\.type\} size=\{46\}\/>/, 'reward preview uses the new artwork');
assert.doesNotMatch(screen,/const ICONS:/, 'old emoji aliases should be gone');
console.log('Daily Supply pixel artwork: verified');
