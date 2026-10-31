export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
function ok(value:boolean,message:string){if(!value)throw new Error(message);}
const skills=read('src/screens/SkillsScreen.tsx');
const forge=read('src/components/SmithingCollection.tsx');
const unlocks=read('src/screens/NewUnlocksScreen.tsx');
const settings=read('src/screens/SettingsScreen.tsx');
const app=read('App.tsx');
ok(!skills.includes('<DetailBack')&&!skills.includes('function DetailBack'),'Skills details must not show an All skills back button');
ok(!forge.includes('‹  {gl(\'Skills\')}'),'Forge header must not show a redundant back button');
ok(!unlocks.includes('Back to Account'),'New Unlocks must not display an in-page back button');
ok(!settings.includes('Back to settings'),'Mobile Settings should navigate with a category strip, not a back arrow');
ok(settings.includes("t(language,'settings.title')")&&settings.includes("const sections:SettingsSection[]=['account','gameplay','chat','display','data']")&&settings.includes("onPress={()=>setSection(value)}")&&settings.includes("onPress={()=>setSection('store')}"),'Mobile Settings must open on Account and keep selectable category tabs plus a dedicated Store shortcut');
ok(app.includes("if(destination==='Skills'&&selectedSkill)")&&app.includes('setSelectedSkill(undefined);setGoalActionId(undefined);setGoalRecipeId(undefined);'),'Re-selecting the Skills tab must restore the skill hub');
ok(app.includes("if(tab==='Skills'&&selectedSkill&&!skillsOpenedAsLink)"),'Android back-navigation for Skills should remain available');
console.log('PASS: back-button cleanup retains skill/settings navigation and Android Back.');
