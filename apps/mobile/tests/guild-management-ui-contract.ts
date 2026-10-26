export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=read('App.tsx');
const screen=read('src/screens/GuildScreen.tsx');
const management=read('src/components/OnlineGuildManagement.tsx');
const customization=read('src/components/OnlineGuildCustomizationPanel.tsx');
const identity=read('src/components/GuildIdentitySummary.tsx');
const hall=read('src/components/OnlineGuildHallPanel.tsx');
const discovery=read('src/components/GuildDiscoveryFlow.tsx');
const memberIdentity=read('src/components/GuildMemberIdentity.tsx');
const pve=read('src/components/OnlineGuildPve.tsx')+read('src/components/GuildRaidEncounter.tsx');

for(const [name,source] of [['GuildScreen',screen],['OnlineGuildManagement',management],['OnlineGuildCustomizationPanel',customization],['GuildIdentitySummary',identity],['OnlineGuildHallPanel',hall],['OnlineGuildPve',pve]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok((source.includes('ThemeColors')||source.includes('C=useGameTheme()')),name+' must build theme-aware styling');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not regress to the static Veldryn palette');
}

ok(app.includes("import {OnlineGuildHallPanel}"),'App must wire the server-backed Guild Hall');
ok(app.includes("import {OnlineGuildCustomizationPanel}"),'App must wire server-backed Guild customization');
ok(app.includes('onlineHall={<OnlineGuildHallPanel/>}'),'Guild screen must receive Guild Hall content');
ok(app.includes('onlineCustomize={<OnlineGuildCustomizationPanel/>}'),'Guild screen must receive Guild customization content');

for(const label of ['Home','PvE','Roster','Activities','Hall','Chat','Manage'])ok(screen.includes("'"+label+"'"),'Consolidated online Guild tabs must include '+label);
ok(screen.includes("onlineSection==='Roster'?onlineManagement:null"),'Roster tab must render authoritative Guild management');
ok(screen.includes("onlineSection==='Hall'?<View")&&screen.includes("hallSection==='Facilities'?onlineHall:<OnlineGuildTokenShopPanel")&&screen.includes("(['Facilities','Shop'] as const)"),'Hall must retain its facilities and nest the Guild Shop without adding an eighth destination');
ok(screen.includes('<OnlineGuildMusterPanel/>')&&screen.includes("onlineSection==='PvE'?onlinePve:null"),"Guild navigation must preserve Muster and a dedicated PvE destination");
ok(screen.includes("onlineSection==='Manage'?<View")&&screen.includes('{onlineCustomize}'),'Manage must preserve member Guild appearance customization');
ok(!screen.includes('{onlineDirectory}')&&!screen.includes('Directory & Creation'),'Joined members must not be offered guild creation inside Guild management');
ok(screen.includes('title={st("Guild Appearance")}'),'Manage must keep a clear identity hierarchy');
ok(screen.includes("guildMembership==='none'")&&screen.includes('<GuildDiscoveryFlow onJoined={reloadGuildMembership}/>'),'Nonmembers must only see the dedicated recruitment flow');
ok(screen.includes('myGuild()')&&screen.includes("guildMembership==='loading'"),'Guild membership must be checked before mounting member-only screens');
ok(discovery.includes("searchOnlineGuilds(search,filter)")&&discovery.includes('Search Guild name or TAG'),'Discovery must search server-side by name or TAG');
ok(discovery.includes('Create Guild')&&discovery.includes('guildTagAvailability')&&discovery.includes('requestGuildMembership'),'Discovery must support live guild creation and recruitment');
ok(discovery.includes('respondGuildInvitation')&&discovery.includes('Application sent'),'Invitations and pending applications must have clear states');
ok(screen.includes("(['Home','PvE','Activities','Hall','Chat'] as const)"),'Member navigation should show five primary destinations');
ok(screen.includes("root:{padding:spacing.md,gap:10"),'Online Guild shell must remain compact');
ok(discovery.includes('<GuildBoardHero title="Find your people"')&&discovery.includes('<GuildBoardHero title="Found a new Guild"')&&discovery.includes('<GuildBoardHero title={selected.name}'),
 'Guild onboarding, previews and creation must use the existing Guild Plaza artwork rather than unrelated placeholder images');
ok(discovery.includes("pendingGuildApplications()")&&discovery.includes("guildDetails(row.guild_id)"),'Guild applicants must see their real pending Guild names when re-opening the screen');
ok(discovery.includes("setRequested(rows.map(row=>row.guild_id))")&&discovery.includes('Application pending'),
 'Pending Guild applications must survive screen remounts and prevent accidental duplicate applications');
ok(discovery.includes('accessibilityLabel="Search Guild name or TAG"')&&discovery.includes("const filters:readonly")&&discovery.includes("setTimeout("),
 'Guild discovery must be searchable, filterable, and debounced');
ok(discovery.includes('GuildCrest size={56}')&&discovery.includes('GuildCrest size={70}')&&discovery.includes('GuildCrest size={68}'),
 'Directory, details and Guild creation must have appropriately sized real banners');
ok(discovery.includes('StatusPill')&&discovery.includes('C.selectionLine')&&discovery.includes('C.inputBg'),
 'Guild discovery statuses, selection and input surfaces must use semantic theme colors');
ok(!/#[0-9a-fA-F]{3,8}/.test(discovery),'Guild discovery must not hardcode dark-only or light-only colors');
ok(memberIdentity.includes('myGuild,guildDetails,ownGuildMemberCount')&&memberIdentity.includes('GuildCrest size={73}'),
 'Member home must show real Guild identity, membership count and crest');
ok(memberIdentity.includes('useGameTheme')&&memberIdentity.includes('C.panelRaised')&&memberIdentity.includes('C.accentSurface')===false,
 'Member identity must use shared theme surfaces and color tokens');
ok(screen.includes('<GuildMemberIdentity/>')&&screen.includes("['Hall','guild'")&&screen.includes("['Roster','friends'"),
 'Member dashboard must prioritize real Guild identity, Hall and Members');
ok(screen.includes("homeCard:{flexGrow:1,flexBasis:'46%',minWidth:142,minHeight:140"),
 'Guild dashboard cards must preserve readable two-column mobile geometry');


ok(discovery.includes("guildPolicy(selected)==='FULL'")&&discovery.includes('selected.member_count'), 'Full Guilds must be labeled correctly and cannot accept new joins');
ok(onlineSocial.includes("guild_directory_v1")&&onlineSocial.includes("PGRST202"),'Guild directory must use the private-roster-safe projection and retain rollout fallback');
ok(management.includes('Search Guild members')&&management.includes('visibleMembers.map')&&management.includes('memberSearch:{minHeight:44'),
 'Guild roster search must be theme-aware and maintain usable touch/input size');
ok(management.includes('Number(leadership.inactiveDays??0)>=14?<View'),'Succession safety should interrupt members only when its warning threshold is reached');

ok(customization.includes('appearanceDirty='),'Guild customization must track unsaved appearance changes');
ok(customization.includes('appearanceDirty?st("UNSAVED"):st("SAVED")'),'Guild customization must surface localized saved/unsaved state');
ok(customization.includes("disabled={busy||!appearanceDirty||!constructionArtReady}"),'Guild appearance save must only enable when something changed');
ok(customization.includes('guildBannerSourceByKey.has(entry.assetKey)')&&customization.includes('guildBorderSourceByKey.has(entry.assetKey)'),
 'Constructed Guild cosmetics must require registered artwork before player selection');
ok(customization.includes('!constructionArtReady'),
 'Missing Guild construction artwork must disable appearance saves');
const constructedCore=read('src/core/guild-customization.ts');
ok(constructedCore.includes("'guild_banner_stormwatch'")&&constructedCore.includes("'guild_frame_verdant'"),
 'Constructed banner and frame must have canonical Guild Appearance IDs');
ok(constructedCore.includes("case'construction':return (s.constructionUnlockIds?.includes"),
 'Constructed Guild cosmetics must require ownership and server release flags');
const onlineSocial=read('src/online/social.ts');
ok(onlineSocial.includes("guild_construction_appearance_rewards_v1")&&onlineSocial.includes("update_guild_appearance_with_construction_v1"),
 'Guild customizer must retrieve verified construction ownership and route changes to guarded SQL');
ok(customization.includes('tagDirty='),'Guild tag changes must have a separate dirty state');
ok(customization.includes('backgroundColor:C.warningSurface'),'Permanent tag warning must be theme-safe');
ok(customization.includes('backgroundColor:C.selection'),'Selected Guild cosmetics must be theme-safe');

ok(identity.includes('plainTag')&&identity.includes('color:nameColor.color')&&identity.includes('color:C.text'),"Guild identity must retain plain names with selected name color and theme text");
ok(hall.includes('GUILD HALL')&&hall.includes('Guild Skill Trees')&&hall.includes('Permanent bonuses are chosen through three Guild Skill Trees'),'Guild Hall must preserve current progression and separate visual facilities from Guild Skill power');
ok(hall.includes("<Text style={s.levelMax}>/10</Text>")&&hall.includes('Launch Hall level cap reached.'),'Guild Hall UI must expose the current 10-level launch cap');
ok(hall.includes('backgroundColor:C.warningSurface'),'Guild Hall level badge must remain light-theme safe');
ok(pve.includes("'EVENT BOSS':'WEEKLY BOSS'")&&pve.includes('MILESTONE REWARDS'),"Guild PvE must distinguish weekly and event bosses and milestone rewards");
ok(pve.includes('accessibilityRole="alert" style={{color:C.bad}}')&&pve.includes('backgroundColor:C.panel2'),"Guild PvE must use semantic error and progress colors");
ok(pve.includes("rows.filter(row=>row.kind===encounterKind)")&&pve.includes('selected={encounterKind===kind}'),'Raid Gate must present weekly and event encounters as selectable destinations');
ok(pve.includes('<ImageBackground')&&pve.includes("overflow:'hidden'},backdrop:{opacity:.7,width:'100%',height:'100%'}"),'Boss scenes must bound their artwork to the stage instead of overflowing over the action area');
ok(pve.includes("accessibilityLabel={st('Boss health')}")&&pve.includes('now:Math.round(100-view.percent)')&&pve.includes('width:`${100-view.percent}%`'),'Boss HP label, accessible value and remaining-health fill must agree');
ok(pve.includes('state?.character?.equippedCombatCompanionId')&&pve.includes('classIconArtwork[state.character.classId]')&&pve.includes('companionArtSource(companionId)'),'Raid party must show the actual current class and equipped companion artwork');
ok(pve.includes('disabled={busy||!view.canContribute||!onAttempt}')&&pve.includes("st('Begin 3-minute attempt')"),'The primary attempt action must respect server-derived eligibility and pending requests');
ok(pve.includes('row.pendingAttempts?1000:30000')&&pve.includes('return()=>clearInterval(timer)')&&pve.includes("st('Resolving attempt…')"),'Pending attempt countdown must clean up its timer and never invent a resolved reward at zero');
ok(pve.includes('accessibilityState={{expanded:detailsOpen}}')&&pve.indexOf('<GameButton title={actionLabel}')<pve.indexOf('accessibilityState={{expanded:detailsOpen}}'),'Encounter mechanics must stay available below the primary action through an accessible disclosure');
ok(pve.includes('lastAttemptCharacterDamage')&&pve.includes('lastAttemptCompanionDamage')&&pve.includes('lastCompanion'),'Attempt summary must preserve authoritative player and companion damage breakdowns');

ok(management.includes('GUILD MANAGEMENT'),'Guild roster must expose management context');
ok(management.includes("role.toUpperCase()"),'Guild management must surface the viewer role');
ok(management.includes('?st("WATCH"):st("ACTIVE")'),'Leadership safety must expose localized compact watch/active state');
ok(management.includes('DANGER ZONE'),'Leave/disband controls must stay separated from ordinary management');
ok(management.includes('title={busy?st("Refreshing…"):st("Refresh")}'),'Roster refresh must stay localized and compact in the roster header');
ok(management.includes('guildMemberManagement(role,member.role'),'Guild management permissions must remain authoritative');

console.log('PASS: online Guild management, Hall, PvE and customization stay compact, wired and theme-aware');
