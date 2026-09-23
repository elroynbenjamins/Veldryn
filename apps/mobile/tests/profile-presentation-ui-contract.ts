export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const profile=read('src/screens/ProfileScreen.tsx');
const showcases=read('src/components/ProfileShowcaseSection.tsx');
const favorites=read('src/components/ProfileFavoriteHighlights.tsx');

ok(profile.includes('CAREER SNAPSHOT'),'Profile must keep a clear career snapshot');
ok(profile.includes('FAVORITES'),'Profile favorites must remain a distinct compact section');
ok(profile.includes('ABOUT'),'Profile biography/actions must remain grouped under About');
ok(profile.includes("root:{padding:spacing.md,gap:10"),'Profile screen must retain compact density');
ok(profile.includes("minHeight:50"),'Career stat cells must remain compact');
ok(profile.includes('title="Customize"')&&profile.includes('title="Collections"')&&profile.includes('title="Achievements"')&&profile.includes('title="Rankings"'),'Profile actions must remain directly accessible');
ok(!profile.includes('identityHead')&&!profile.includes('IdentityRow'),'Profile must not reintroduce the redundant second identity block');
ok(profile.includes('label="BOSSES"')&&profile.includes('label="COLLECTIBLES"'),'Career snapshot must cover boss and collection progression');
ok(profile.includes('<MasteryHallPanel state={state}')&&profile.includes("onNavigate?.('MasteryHall')"),'Profile must expose the account-wide Mastery Hall summary and link to the full Hall');
ok(profile.includes('title="MASTERY SHOWCASE"')&&profile.includes("value:'R50'"),'Profile must show compact R50 mastery showcase slots');
const masteryHall=read('src/components/MasteryHallPanel.tsx');
ok(masteryHall.includes('ACCOUNT MASTERY HALL')&&masteryHall.includes('prestige, achievements and profile showcase options—not more power'),'Mastery Hall must frame R50 as recognition rather than another power layer');
ok(masteryHall.includes('STRONGEST PROFESSIONS')&&masteryHall.includes('MASTERY HALL ACHIEVEMENTS'),'Mastery Hall must summarize profession prestige and Journal progression');
ok(masteryHall.includes("skill:{width:'48%'"),'Mastery Hall profession summary must remain compact on mobile');

for(const [name,source] of [['showcases',showcases],['favorites',favorites]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(source.includes('makeStyles(C:ThemeColors)'),name+' must build styles from theme tokens');
 ok(!source.includes("import {C,"),name+' must not regress to the static Veldryn palette');
}

ok(showcases.includes('No selections yet'),'Empty showcases must collapse into one useful empty state');
ok(showcases.includes('choose up to 3 from Customize Profile'),'Empty showcases must explain the next action');
ok(showcases.includes("minHeight:112"),'Showcase cards must remain compact');
ok(showcases.includes('backgroundColor:C.warningSurface'),'Prestige showcase cards must stay light-theme safe');
ok(showcases.includes('backgroundColor:C.goodSurface'),'Record showcase cards must stay light-theme safe');
ok(favorites.includes("minHeight:78"),'Favorite cards must remain compact');
ok(favorites.includes('backgroundColor:C.warningSurface'),'Prestige favorite cards must stay light-theme safe');
ok(favorites.includes('backgroundColor:C.selection'),'Rare favorite cards must use the active selection surface');

const customize=read('src/screens/ProfileCustomizeScreen.tsx');
const nameEditor=read('src/components/PlayerNameStyleEditor.tsx');
const publicScene=read('src/components/PublicProfileScene.tsx');
const audiencePreview=read('src/components/ProfileAudiencePreviewModal.tsx');
const profileOnline=read('src/online/profile-extension-v43.ts');
ok(customize.includes('<PlayerNameStyleEditor state={state} onChange={onChange}/>'),'Profile customization must expose the paid cosmetic name-style editor');
ok(nameEditor.includes('VIP+ · SOLID RGB')&&nameEditor.includes('SUPPORTER · ADVANCED STYLES'),'Name-style editor must distinguish permanent VIP+ solid color from Supporter advanced styles');
ok(nameEditor.includes('updateOnlinePlayerNameStyle')&&nameEditor.includes('savePlayerNameStyle'),'Saving a name style must update both authoritative online projection and local game state');
ok(nameEditor.includes('reduceMotion={state.settings.reduceMotion}'),'Name-style preview must respect Reduced Motion');
ok(publicScene.includes('nameStyle={profile.nameStyle??undefined}')&&publicScene.includes('reduceMotion={reduceMotion}'),'Public profile scenes must render the authoritative projected name style');
ok(audiencePreview.includes('nameStyle:effectivePlayerNameStyle(state)')&&audiencePreview.includes('reduceMotion={state.settings.reduceMotion}'),'Audience preview must show the same effective local style with Reduced Motion semantics');
ok(profileOnline.includes('nameStyle?:PlayerNameStylePreference|null')&&profileOnline.includes('identity?.player_name_style??null'),'Public profile transport must carry the server-gated style from guild identity authority');

console.log('PASS: profile presentation stays compact, non-redundant, theme-aware, and useful when showcases are empty');
