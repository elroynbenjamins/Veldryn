const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const copy=read('src/i18n/skill-guide-copy.ts');
const ui=read('src/i18n/skill-guide-ui.ts');
const screen=read('src/screens/SkillGuideScreen.tsx');
const account=read('src/screens/MoreScreen.tsx');
const app=read('App.tsx');
const skills=read('src/screens/SkillsScreen.tsx');
const languages=['en','de','es','nl','it','fr','ru','tr'];
function extract(text,pattern,name){
 const found=text.match(pattern);
 assert(found,'Missing '+name);
 return JSON.parse(found[1]);
}
const ids=extract(copy,/SKILL_GUIDE_IDS=(\[[^\n]+\]) as const;/,'skill IDs');
const entries=extract(copy,/const COPY:Record<Language,Record<SkillGuideId,readonly \[string,string,string,string,string\]>>=([\s\S]+?);\nexport function/,'guide translations');
const keys=extract(ui,/SKILL_GUIDE_UI_KEYS=(\[[^\n]+\]) as const;/,'guide UI keys');
const labels=extract(ui,/const UI:Record<Language,readonly string\[]>=([\s\S]+?);\nexport function/,'guide UI translations');
assert.equal(ids.length,14,'All 11 skills plus combat and companion systems must be documented');
assert.equal(new Set(ids).size,14,'Duplicate guide IDs');
assert.equal(new Set(keys).size,keys.length,'Duplicate UI keys');
for(const language of languages){
 assert(entries[language],'Missing '+language+' guide copy');
 assert(labels[language],'Missing '+language+' UI');
 assert.deepEqual(Object.keys(entries[language]).sort(),[...ids].sort(),'Incomplete '+language+' skill entries');
 assert.equal(labels[language].length,keys.length,'Incomplete '+language+' labels');
 for(const id of ids){
  assert.equal(entries[language][id].length,5,id+' '+language+' needs title, summary, training, usage and tip');
  entries[language][id].forEach((value,index)=>assert(value.trim().length>=(index===0?2:5),'Empty/incomplete '+language+' copy for '+id));
 }
 for(const value of labels[language])assert(value.trim().length>0,'Empty '+language+' UI label');
}
for(const other of languages.filter(lang=>lang!=='en')){
 for(const id of ids){
  for(const index of [1,2,3,4])assert.notEqual(entries[other][id][index],entries.en[id][index],'English guide fallback in '+other+': '+id);
 }
}
for(const key of ['Skill Guide','Back to Account','How to train','Used for','Next unlocks','Your class skills','Other conditions may also apply.']){
 assert(keys.includes(key),'Missing localized UI key '+key);
}
assert(screen.includes('skillGuideCopy(language,id)')&&screen.includes('skillGuideUi(language,key)'),'Guide uses localized catalog');
assert(!screen.includes('gl(selected.summary)')&&!screen.includes('gl(row.detail)'),'Generated or fallback English copy bypasses translated guide');
assert(screen.includes('skillMilestoneOverview(state,selectedId)'),'Next unlocks use game data');
assert(screen.includes('t(MILESTONE_LABEL[row.kind])'),'Milestone types must be localized');
assert(screen.includes('accessibilityRole="button"')&&screen.includes('reduceMotion={state.settings.reduceMotion}'),'Accessible controls and motion setting');
assert(account.includes("'ResourceCodex','SkillGuide','Store'"),'Skill Guide sits next to resource Codex in Account');
assert(account.includes("skillGuideUi(language,'Skill Guide')"),'Account tile translates');
assert(app.includes("tab==='SkillGuide'&&<SkillGuideScreen"),'Account route renders guide');
assert(app.includes("case 'SkillGuide':return skillGuideUi(language,'Skill Guide')"),'Top bar translates guide title');
assert(screen.includes("t('Back to Account')"),'Back label must reference Account');
assert(!skills.includes('setGuideOpen(true)'),'Do not duplicate the guide button in Skills');
console.log('Skill Guide: 14 entries, 8 fully populated locales, '+keys.length+' UI labels and Account navigation verified.');
