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
const pve=read('src/components/OnlineGuildPve.tsx');

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
ok(screen.includes("onlineSection==='Hall'?onlineHall:null"),'Hall tab must render Hall content');
ok(screen.includes('<OnlineGuildMusterPanel/>')&&screen.includes("onlineSection==='PvE'?onlinePve:null"),"Guild navigation must preserve Muster and a dedicated PvE destination");
ok(screen.includes("onlineSection==='Manage'?<View")&&screen.includes('{onlineDirectory}')&&screen.includes('{onlineCustomize}'),'Manage must preserve Guild directory/creation and appearance customization');
ok(screen.includes('title={st("Guild Appearance")}')&&screen.includes('title={st("Directory & Creation")}'),'Manage must keep clear localized recruitment and identity hierarchy');
ok(screen.includes("root:{padding:spacing.md,gap:10"),'Online Guild shell must remain compact');

ok(customization.includes('appearanceDirty='),'Guild customization must track unsaved appearance changes');
ok(customization.includes('appearanceDirty?st("UNSAVED"):st("SAVED")'),'Guild customization must surface localized saved/unsaved state');
ok(customization.includes("disabled={busy||!appearanceDirty}"),'Guild appearance save must only enable when something changed');
ok(customization.includes('tagDirty='),'Guild tag changes must have a separate dirty state');
ok(customization.includes('backgroundColor:C.warningSurface'),'Permanent tag warning must be theme-safe');
ok(customization.includes('backgroundColor:C.selection'),'Selected Guild cosmetics must be theme-safe');

ok(identity.includes('plainTag')&&identity.includes('color:nameColor.color')&&identity.includes('color:C.text'),"Guild identity must retain plain names with selected name color and theme text");
ok(hall.includes('GUILD HALL')&&hall.includes('Guild Skill Trees')&&hall.includes('Permanent bonuses are chosen through three Guild Skill Trees'),'Guild Hall must preserve current progression and separate visual facilities from Guild Skill power');
ok(hall.includes("<Text style={s.levelMax}>/10</Text>")&&hall.includes('Launch Hall level cap reached.'),'Guild Hall UI must expose the current 10-level launch cap');
ok(hall.includes('backgroundColor:C.warningSurface'),'Guild Hall level badge must remain light-theme safe');
ok(pve.includes("'EVENT BOSS':'WEEKLY BOSS'")&&pve.includes('MILESTONE REWARDS'),"Guild PvE must distinguish weekly and event bosses and milestone rewards");
ok(pve.includes('accessibilityRole="alert" style={{color:C.bad}}')&&pve.includes('backgroundColor:C.panel2'),"Guild PvE must use semantic error and progress colors");

ok(management.includes('GUILD MANAGEMENT'),'Guild roster must expose management context');
ok(management.includes("role.toUpperCase()"),'Guild management must surface the viewer role');
ok(management.includes('?st("WATCH"):st("ACTIVE")'),'Leadership safety must expose localized compact watch/active state');
ok(management.includes('DANGER ZONE'),'Leave/disband controls must stay separated from ordinary management');
ok(management.includes('title={busy?st("Refreshing…"):st("Refresh")}'),'Roster refresh must stay localized and compact in the roster header');
ok(management.includes('guildMemberManagement(role,member.role'),'Guild management permissions must remain authoritative');

console.log('PASS: online Guild management, Hall, PvE and customization stay compact, wired and theme-aware');
