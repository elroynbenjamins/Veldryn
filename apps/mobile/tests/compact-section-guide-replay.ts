export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
function ok(value:boolean,message:string){if(!value)throw new Error(message);}
const guide=read('src/components/SectionGuide.tsx');
const companion=read('src/components/CombatCompanionPanel.tsx');
const party=read('src/components/PartyHubPanel.tsx');
const guild=read('src/screens/GuildScreen.tsx');
const social=read('src/screens/SocialScreen.tsx');
const socialHub=read('src/components/SocialHubPanel.tsx');
const app=read('App.tsx');

ok(!guide.includes('reopenRow:'),'Acknowledged tutorials must not occupy a dedicated 36px row');
ok(guide.includes('if(!expanded)return headerRow'),'Completed help may only render within an existing header');
ok(guide.includes('const trigger=replay&&header?'),'Only an anchored guide may show a replay button');
ok(guide.includes('header?<>{header}</>:null'),'Original header stays visible while guide state is loading');
ok(guide.includes("accessibilityLabel={t('Show guide for this tab')}"),'Replay help remains accessible by screen reader');
ok(guide.includes('hitSlop={4}'),'Compact help controls retain a comfortable tap target');
ok(guide.includes("void store.complete(scope,area,section)"),'Got it must persist exactly as before');
ok(guide.includes('const expanded=!seen||'),'New users still receive contextual guidance');
ok(guide.includes('setOpen({identity,section})'),'Completed guides can be reopened');
ok(guide.includes('t(more?\'Less detail\':\'More detail\')'),'Optional tutorial details remain discoverable');

ok(companion.includes('header={<View style={s.resourceBar}>'),'Companion replay is attached to the existing resource bar');
ok(companion.includes("resourceBar:{flexDirection:'row',flexWrap:'nowrap'"),'Companion resource row cannot wrap due to help');
ok(party.includes('header={inParty?<View style={styles.browseTabs}>'),'Party replay uses existing Party / Recruitment tabs');
ok(guild.includes('header={([\'Activities\',\'Hall\',\'Roster\',\'Manage\']'),'Guild replay uses existing section titles');
ok(socialHub.includes('<SectionGuide {...headerGuide} header='),'Social replay must live within top tab navigation');
ok(social.includes('headerGuide={headerGuide}'),'Social chat and guild pass contextual help to the shared navigation');
ok(!social.includes('><SectionGuide scope='),'Social content must not add a separate tutorial control row');
ok(app.includes('showReplay={false}'),'Main tab one-time tours remain unchanged');
console.log('PASS compact contextual help replay without extra layout rows');
