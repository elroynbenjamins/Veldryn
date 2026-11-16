const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const mobile=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(mobile,file),'utf8');
const browser=read('src/components/coop/CoopDungeonBrowser.tsx');
const screen=read('src/screens/CoopExpeditionScreen.tsx');
const section=read('src/components/SectionGuide.tsx');
const guide=read('src/i18n/dungeon-home-guide.ts');
const app=read('App.tsx');
const boon=fs.readFileSync(path.join(mobile,'../../backend/src/server/coop/room-boon-choices.ts'),'utf8');
const merchant=read('src/components/coop/DungeonMerchantPanel.tsx');

test('Dungeon Finder shows a manual, persistent Guild-style ? guide without blocking browsing',()=>{
 assert.match(browser,/<SectionGuide scope=\{guideScope\} area="dungeon" section="home" placement="header"/);
 assert.match(browser,/stepThrough\/>/);
 assert.match(browser,/onPress=\{onShop\}/);
 assert.match(browser,/onPress=\{onBack\}/);
 assert.match(browser,/accessibilityLabel=\{st\("World Chat"\)\}/);
 assert.match(screen,/guideScope=\{characterId\?\?''\}/);
 assert.ok(section.includes('const visible=open?.identity===identity&&open?.section===section'), 'Header modal only opens on explicit help tap');
 assert.ok(section.includes('store.complete(scope,area,section)'), 'Acknowledgement must persist');
 assert.ok(section.includes('!seen?<View accessible={false}'), 'Unseen topics show a subtle dot');
 assert.ok(!browser.includes('onPress={()=>setShowHelp(true)}'), 'No second conflicting help modal');
});

test('Two-phase walkthrough stays reachable on compact devices, while Guild keeps its original behavior',()=>{
 assert.ok(section.includes('stepThrough=false'), 'Guided mode is opt-in');
 assert.ok(section.includes('stepThrough&&topics.length>1'), 'Guild tabs retain their standard guide');
 assert.ok(section.indexOf('      </ScrollView>\n      {stepThrough&&topics.length>1?')>=0, 'Previous/Next stays outside the scroll area');
 assert.ok(section.includes('accessibilityRole="progressbar"'), 'Tour exposes its step progress');
 assert.ok(section.includes("topicIndex===topics.length-1?close()"), 'Finishing the final lesson acknowledges the guide');
 assert.ok(section.includes('accessibilityState={{disabled:topicIndex===0}}'), 'Previous is disabled on first lesson');
});

test('Event content leads the screen while real matchmaking, tiers and shops stay wired',()=>{
 const eventIndex=browser.indexOf('{sortedEvents.length>0?<View style={s.eventSection}>');
 const modeIndex=browser.indexOf('<View style={s.modeSegment}>');
 const regionalIndex=browser.indexOf('{available.map(dungeon=>');
 assert.ok(eventIndex>=0&&modeIndex>eventIndex&&regionalIndex>modeIndex, 'Event -> mode -> regional hierarchy');
 assert.match(browser,/onPress=\{onQuickMatch\}/);
 assert.match(browser,/mode==='live'&&liveTools/);
 assert.match(browser,/mode==='qmode'&&echoTools/);
 assert.match(browser,/disabled=\{locked\} onPress=\{\(\)=>onTier\(value\)\}/);
 assert.match(browser,/coopTierEligibility\(dungeon,value,currentLevel,currentPower\)/);
 assert.match(screen,/currentLevel=\{state.character\?\.level\?\?0\} currentPower=\{combatPowerRating\(state\)\.total\}/);
 assert.match(screen,/onShop=\{\(\)=>setShowShop\(true\)\}/);
 assert.match(app,/showActivityBar=\{tab!=='ProfileCustomize'&&tab!=='Coop'\}/);
});

test('Guide copy matches authoritative boon and run-item behavior',()=>{
 const ids=[...guide.matchAll(/\{id:'(start|routes|boons|artifacts|supplies|rewards|bosses)',title:/g)].map(x=>x[1]);
 assert.deepEqual(ids,['start','routes','boons','artifacts','supplies','rewards','bosses']);
 assert.match(boon,/name:'Battle Focus',description:'\+5% party attack power/);
 assert.match(boon,/name:'Stalwart Guard',description:'\+5% party defense/);
 assert.match(boon,/name:'Second Wind',description:'Restore 20% max HP/);
 assert.ok(guide.includes('+5% party attack power')&&guide.includes('+5% party defense')&&guide.includes('20% max HP'), 'Exact boon values are explained');
 assert.ok(merchant.includes('Persistent run item. Effect triggers in combat.'), 'Artifact description is grounded in run effects');
 assert.ok(guide.includes('They are run-only relics'), 'Artifacts must not be described as permanent equipment');
 assert.ok(guide.includes('consumed even if you fail'), 'Tonic failures are explained');
});

test('All seven guide sections have translations for all supported languages',()=>{
 const languages=['de','es','nl','it','fr','ru','tr'];
 for(const text of ['Dungeon handbook','Getting started','Rooms and routes','What are boons?','What are artifacts?','Supplies and survival','Rewards and marks','Bosses and difficulty']){
  const start=guide.indexOf("'"+text+"':{");
  assert.ok(start>=0,'Missing guide localization key '+text);
  const end=guide.indexOf('\n },',start);
  assert.ok(end>start,'Unterminated guide localization row '+text);
  const row=guide.slice(start,end);
  for(const language of languages)assert.match(row,new RegExp('(?:^|\\s)'+language+':'),text+' lacks '+language);
 }
 assert.match(guide,/export function dungeonGuideText\(language:Language,value:string\):string\{return rows\[value\]\?\.\[language\]\?\?value;\}/);
});
