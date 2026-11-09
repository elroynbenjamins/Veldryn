const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src');
// Use the same TypeScript catalog loader as the full creation/profile audit,
// while keeping this release gate independent of unrelated legacy content.
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(
 fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}
).outputText,filename);
const profile=require('../src/i18n/profile.ts'),{SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const keys=[
  "Character",
  "Edit profile",
  "Combat Power",
  "Show breakdown",
  "Hide breakdown",
  "Combat Power breakdown",
  "All stats",
  "Class base",
  "Gear, sets & gems",
  "Other character bonuses",
  "Combat companion",
  "Level {level} base stats",
  "Equipped stat gains and build effects",
  "Class training, Faith, preparation and permanent boosts",
  "No combat companion equipped",
  "{name} · Lv. {level} · Bond {bond}",
  "Combat Power is a comparison score from your live stats and equipped build. Encounter mechanics, target traits, and temporary effects can still change actual results.",
  "Compare & Swap",
  "crafted",
  "Choose an equipped slot to compare its rarity and stats with gear you own.",
  "Companions",
  "No Combat Companion",
  "Manage",
  "Icon · background · border · title · Pet",
  "Choose an earned achievement",
  "Choose a personal record",
  "Choose a collectible",
  "Master a profession action at R50",
  "Selected R50 profession records"
];
const tokens=text=>[...text.matchAll(/\\{([a-zA-Z][a-zA-Z0-9_]*)\\}/g)].map(row=>row[1]).sort();
for(const key of keys){
 assert.ok(Object.hasOwn(profile.profileTranslationRows,key),'Missing profile catalog key: '+key);
 const original=tokens(key);
 for(const language of SUPPORTED_LANGUAGES){
  const translated=profile.profileT(language,key);
  assert.deepEqual(tokens(translated),original,language+' interpolations: '+key);
  if(language!=='en')assert.notEqual(translated,key,language+' displays English: '+key);
 }
}
for(const language of SUPPORTED_LANGUAGES.filter(lang=>lang!=='en')){
 assert.equal(profile.profileText(language,'Character'),profile.profileT(language,'Character'),language+' normal Character label');
 assert.equal(profile.profileText(language,'CHARACTER'),profile.profileT(language,'CHARACTER'),language+' uppercase Character badge');
 assert.equal(profile.profileText(language,'Edit profile'),profile.profileT(language,'Edit profile'),language+' Edit profile CTA');
 const name='Wolf <&> {name}',detail=profile.profileT(language,'{name} · Lv. {level} · Bond {bond}',{name,level:23,bond:4});
 assert.ok(detail.includes(name)&&detail.includes('23')&&detail.includes('4'),language+' companion name and progress interpolation');
}
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const character=source('screens/CharacterScreen.tsx'),hero=source('components/CharacterIdentityHero.tsx'),showcase=source('components/ProfileShowcaseSection.tsx');
assert.ok(character.includes("showPower?'Hide breakdown':'Show breakdown'"),'Character uses localized disclosure actions');
assert.ok(character.includes("profileT(language,'Combat Power breakdown')"),'Character uses localized accessibility label');
assert.ok(character.includes("profileText(language,row.label)")&&character.includes('powerDetail(row)'),'Character translates scored breakdown labels/details');
assert.ok(character.includes('Math.abs(row.value).toLocaleString(language)'),'Score values respect language number formats');
assert.ok(hero.includes("profileText(language,'Edit profile')"),'Character hero localizes Edit profile');
assert.ok(showcase.includes('localizedEmpty')&&showcase.includes('localizedSubtitle'),'Profile showcases localize empty labels and subtitles');
console.log('PASS: 29 Character/Profile strings and UI wiring in 8 supported languages');
