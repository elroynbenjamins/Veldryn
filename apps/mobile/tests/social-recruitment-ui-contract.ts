export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const listing=read('src/components/RecruitmentListing.tsx');
const filters=read('src/components/RecruitmentFiltersPanel.tsx');
const composer=read('src/components/RecruitmentComposer.tsx');
const partyComposer=read('src/components/PartyRecruitmentComposer.tsx');
const choices=read('src/components/RecruitmentQuickPostChoices.tsx');
const seeker=read('src/components/GuildSeekerPanel.tsx');
const guilds=read('src/components/OnlineGuildBrowser.tsx');
const social=read('src/screens/SocialScreen.tsx');

for(const [name,source] of [['RecruitmentListing',listing],['RecruitmentFiltersPanel',filters],['RecruitmentComposer',composer],['PartyRecruitmentComposer',partyComposer],['RecruitmentQuickPostChoices',choices],['GuildSeekerPanel',seeker],['OnlineGuildBrowser',guilds]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(source.includes('ThemeColors'),name+' must build theme-aware styling');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not use the static Veldryn palette');
}

ok(listing.includes('CompactPlayerIdentity'),'Recruitment cards must use the shared social identity component');
ok(listing.includes('recruitmentPostTypePresentation'),'Recruitment cards must use canonical LFG/LFM/Guild presentation');
ok(listing.includes('recruitmentContextLabels'),'Recruitment cards must expose compact pace/language/region/level context');
ok(listing.includes('OPEN DETAILS ›'),'Recruitment identity must clearly afford opening details');
ok(listing.includes('backgroundColor:C.panel')&&!listing.includes("backgroundColor:'#111f2d'"),'Recruitment cards must remain theme-safe');

ok(filters.includes("Hide filters")&&filters.includes("Filters"),'Recruitment filters must remain a compact disclosure');
ok(filters.includes('Open Party spots only'),'Open-spot filter must remain player-readable');
ok(filters.includes('trackColor={{false:C.line,true:C.selectionLine}}'),'Recruitment switch must be theme-aware');
ok(filters.includes('{st("Clear")} {count}')&&filters.includes('onPress={()=>onChange({...EMPTY_RECRUITMENT_FILTERS,query:value.query})}'),'Active filters must show a localized clear label/count and clear filter state while preserving the search query');

ok(composer.includes('NEW RECRUITMENT POST'),'Recruitment composer must have clear creation hierarchy');
ok(composer.includes('AUTO-EXPIRES'),'Recruitment composer must explain automatic expiry');
ok(composer.includes('durationDays:3')&&composer.includes('Automatically expires after 3 days'),'Guild posts default to three days without extra expiry controls');
ok(partyComposer.includes('durationDays:1')&&partyComposer.includes('Automatically expires after 24 hours'),'Party posts still expire after one day');
ok(composer.includes('RecruitmentQuickPostChoices')&&partyComposer.includes('RecruitmentQuickPostChoices'),'Guild and Party adverts must share the same quick-post selector');
ok(composer.includes('recruitmentStoredInterest')&&partyComposer.includes('recruitmentStoredInterest'),'Both composers must persist Crafting distinctly');
ok(choices.includes("['combat','skilling','crafting','mixed']")&&choices.includes("['casual','regular','active','hardcore']"),'Quick post must offer the approved interest and activity choices');
ok(choices.includes("flexWrap:'nowrap'")&&choices.includes('minHeight:44'),'Both selectors must stay on one accessible touch-target row');
ok(choices.includes('Expected activity')&&choices.includes('Main interest'),'Selections must be clearly labeled');
ok(!composer.includes('Advanced details')&&!partyComposer.includes('Advanced details'),'Quick post must not expose the old lengthy advanced form');
ok(partyComposer.includes('prefs.minimumLevel')&&partyComposer.includes('prefs.language'),'Party adverts must inherit existing Party settings');
ok(composer.includes('Publish advert'),'Publish action must remain explicit');

ok(seeker.includes('RecruitmentListing'),'Guild seekers must use the same recruitment card language');
ok(seeker.includes('No fresh Guild seekers'),'Guild seeker empty state must explain freshness');

ok(guilds.includes('GUILD DIRECTORY')&&guilds.includes('AVAILABLE GUILDS'),'Guild directory must have clear hierarchy');
ok(guilds.includes('policyOpen')&&guilds.includes('policyApply')&&guilds.includes('policyInvite'),'Guild join policy must be visually distinct');
ok(guilds.includes('Min Lv.')&&guilds.includes('member_cap'),'Guild cards must keep membership requirements/cap visible');
ok(guilds.includes('Tag reserved permanently'),'Guild creation must keep permanent tag reservation clear');

ok(social.includes('<RecruitmentListing card={item}'),'Owned adverts must reuse the shared recruitment card');
ok(social.includes('recruitmentPostTypePresentation(selected.postType)'),'Selected recruitment details must use canonical post-type presentation');
ok(social.includes('selected.activityLevel')&&social.includes('selected.language')&&social.includes('selected.region')&&social.includes("st('Combat {level}+',{level:Math.max(0,Math.floor(selected.minCombatLevel))})")&&social.includes("st('Total {level}+',{level:Math.max(0,Math.floor(selected.minTotalLevel))})")&&social.includes('context.map(item=>'),'Selected recruitment details must preserve pace/language/region and localized numeric requirements in compact context pills');

console.log('PASS: Recruitment, LFG/LFM, Guild seekers and Guild directory share compact theme-aware presentation');
