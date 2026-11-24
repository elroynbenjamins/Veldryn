import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WINTER_HEARTH_LIGHT_RECIPES} from '../../frostfall-winter-hearth-2026-rules.mjs';
const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const skills=read('apps/mobile/src/content/skills.ts');
const ids=['CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_2026','CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_TAILORING_2026'];
test('real recipe source matches approved quote for both professions',()=>{
 for(const [index,skill] of ['smithing','tailoring'].entries()){
  const recipe=WINTER_HEARTH_LIGHT_RECIPES[skill],id=ids[index];
  const start=skills.indexOf("{id:'"+id+"'");
  assert.ok(start>=0);
  const raw=skills.slice(start,skills.indexOf('output:',start)+100);
  for(const part of ["skillId:'"+skill+"'","level:"+recipe.level,"xp:"+recipe.xp,"gold:"+recipe.gold,"seconds:"+recipe.seconds,"itemId:'FROSTFALL_CHRISTMAS_LIGHTS_2026',quantity:5"]){
   assert.ok(raw.includes(part),id+' missing '+part);
  }
  for(const input of recipe.inputs)assert.ok(raw.includes("itemId:'"+input.itemId+"',quantity:"+input.quantity));
 }
 assert.ok(skills.includes('...(WINTER_HEARTH_GUILD_RELEASED?['),'Recipes must be gated');
});
test('both actual processing starts check the live event window',()=>{
 for(const path of ['apps/mobile/src/core/game.ts','apps/mobile/src/core/processing.ts']){
  const source=read(path);
  assert.match(source,/isWinterHearthLightRecipe\(recipeId\)&&!winterHearthLightRecipeAvailable\(/);
 }
 const source=read('apps/mobile/src/core/winter-hearth-2026.ts');
 assert.match(source,/WINTER_HEARTH_GUILD_RELEASED&&event\?\.enabled===true/);
 assert.match(source,/nowMs>=Math\.max\(event\.startsAtMs,WINTER_HEARTH_2026_START_MS\)/);
 assert.match(source,/nowMs<Math\.min\(event\.endsAtMs,WINTER_HEARTH_2026_END_MS\)/);
});
test('no invented craft inputs or accidental release',()=>{
 const flags=read('apps/mobile/src/core/release-flags.ts');
 assert.match(flags,/WINTER_HEARTH_GUILD_RELEASED\s*=\s*false/);
 assert.doesNotMatch(skills,/itemId:'FROSTFALL_WISP_GLOW_2026'/);
 const screen=read('apps/mobile/src/components/WinterHearthGuildScreen.tsx');
 assert.ok(screen.includes('8 Copper Ore')&&screen.includes('8 Moss Fiber')&&screen.includes('4 Dewleaf')&&screen.includes('1 Wisp Dust'));
 assert.ok(screen.includes('onOpenCrafting&&snapshot.active&&now<endsAtMs'));
});
