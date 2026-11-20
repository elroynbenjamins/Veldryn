const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(mobile,file),'utf8');
const roster=read('src/screens/ActivityOverviewScreen.tsx');
const rules=read('src/core/account-roster.ts');
const copy=read('src/i18n/character-roster.ts');

test('compact roster clearly separates selected character and active work',()=>{
 assert.match(roster,/r\('Currently playing'\)/);
 assert.match(roster,/r\('Character roster'\)/);
 assert.match(roster,/workingCount=entries\.filter\(entry=>!!entry\.activity\)\.length/);
 assert.match(roster,/const active=character\.id===state\.character\?\.id/);
 assert.match(roster,/ProfileIcon id=\{character\.profileIconId\} classId=\{character\.classId\}/);
 assert.match(roster,/classDef\?\.name\?\?character\.classId/);
 assert.match(roster,/accountDuration\(language,\(now-activity\.startedAtMs\)\/1000\)/);
});

test('slot progress and create availability use authoritative 800/3-role rules',()=>{
 assert.match(rules,/CHARACTER_SLOT_THRESHOLDS=\[0,250,800\]/);
 assert.match(roster,/const nextThreshold=slots<MAX_NEW_ACCOUNT_CHARACTERS\?CHARACTER_SLOT_THRESHOLDS\[slots\]:undefined/);
 assert.match(roster,/entries\.length<MAX_NEW_ACCOUNT_CHARACTERS&&entries\.length<slots/);
 assert.match(roster,/const visibleSlots=legacy\?slots:Math\.min\(slots,MAX_NEW_ACCOUNT_CHARACTERS\)/);
 assert.match(roster,/Legacy roster preserved/);
 assert.match(roster,/const roles:AccountCharacterRole\[\]=\['Tank','Damage','Support'\]/);
 assert.match(roster,/accessibilityRole="progressbar"/);
 assert.doesNotMatch(roster,/All 5 character slots are permanently unlocked\./);
});

test('manageable controls remain touch-friendly and deletion is behind a second action',()=>{
 assert.match(roster,/manageButton:\{minWidth:44,minHeight:44/);
 assert.match(roster,/accessibilityLabel=\{a\('Manage'\)\+': '\+character\.name\}/);
 assert.match(roster,/accessibilityLabel=\{a\('Switch'\)\+': '\+character\.name\}/);
 assert.match(roster,/!showDeleteOptions\?<View style=\{s\.manageOverview\}>/);
 assert.match(roster,/setShowDeleteOptions\(true\)/);
 assert.match(roster,/disabled=\{!onDelete\|\|!confirmed\|\|!!blockReason\|\|busy\}/);
 assert.match(roster,/characterDeleteBlockReason\(state,target\.character\.id\)/);
 assert.match(roster,/equipmentCraftingQueue\(state\)/);
 assert.match(roster,/keyboardShouldPersistTaps="handled"/);
 assert.match(roster,/modalScrollRef\.current\?\.scrollToEnd/);
 assert.match(roster,/onDelete\(target\.character\.id,confirmation\)/);
});

test('narrow screen and larger fonts preserve readable activities',()=>{
 assert.match(roster,/width<390\|\|fontScale>=1\.25\|\|state\.settings\.textScale>=1\.25/);
 assert.match(roster,/activityRowStack:\{flexWrap:'wrap'\}/);
 assert.match(roster,/characterRowStack:\{alignItems:'stretch',flexDirection:'column'\}/);
});

test('new roster copy is localized in all eight languages',()=>{
 for(const label of ['Currently playing','Character roster','Level {level}','Role slots','Review deletion options','Legacy roster preserved','Tank','Damage','Support']){
  const start=copy.indexOf("'"+label+"':{");
  assert.ok(start>=0,'Missing row '+label);
  const row=copy.slice(start,copy.indexOf('},',start)+2);
  for(const language of ['en','de','es','nl','it','fr','ru','tr'])assert.ok(row.includes(language+':'),'Missing '+language+' for '+label);
 }
});
