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

console.log('PASS: profile presentation stays compact, non-redundant, theme-aware, and useful when showcases are empty');
