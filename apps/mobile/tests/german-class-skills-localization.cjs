const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=function(mod,filename){
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(compiled,filename);
};

const {germanCoverageText}=require('../src/i18n/german-coverage.ts');
const app=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(app,filename),'utf8');

const source=read('src/content/class-skills.ts');
const authored=[...source.matchAll(/skill\('([^']+)','([^']+)','([^']+)'\)/g)];
const skills=new Map(authored.map(([,id,name,theme])=>[id,{name,theme}]));
assert.equal(skills.size,14,'Class discipline definitions changed; review German coverage');

for(const [id,{name,theme}] of skills){
 for(const label of [name,theme]){
  const german=germanCoverageText(label);
  assert.ok(german&&german!==label,'Missing German class discipline copy: '+id+' / '+label);
 }
}
assert.equal(germanCoverageText('Max HP'),'Maximale LP','Skill Guide bonus must be localized');
assert.equal(germanCoverageText('An unknown server ability'),undefined,'Unknown dynamic values must stay unchanged');

const guide=read('src/screens/SkillGuideScreen.tsx');
for(const expression of ['gl(definition.name)','gl(definition.theme)','gl(bonus.label)'])
 assert.ok(guide.includes(expression),'Skill Guide no longer localizes: '+expression);

const xp=read('src/components/CombatXpSplit.tsx');
for(const expression of [
 'const primaryLabel=gl(primary.name),secondaryLabel=gl(secondary.name);',
 '{primaryLabel} <Text style={s.percent}>',
 '{secondaryLabel} <Text style={s.percent}>',
 '{primary:primaryLabel,secondary:secondaryLabel}',
 '${primaryLabel} ${split.primary}%, ${secondaryLabel} ${split.secondary}%'
])assert.ok(xp.includes(expression),'Combat XP split missing German output: '+expression);
for(const old of [
 '{primary.name} <Text style={s.percent}>',
 '{secondary.name} <Text style={s.percent}>',
 '{primary:primary.name,secondary:secondary.name}',
 '${primary.name} ${split.primary}%, ${secondary.name} ${split.secondary}%'
])assert.ok(!xp.includes(old),'Combat XP split leaks English into player UI or accessibility: '+old);

const gameplay=read('src/i18n/gameplay.ts');
assert.ok(gameplay.includes("if(language==='de'){const translated=germanCoverageText(value);if(translated!==undefined)return translated;}"),'German source-guarded gameplay lookup disconnected');

console.log('PASS: 14 German class disciplines, themes, Skill Guide bonus and combat XP split accessibility');
