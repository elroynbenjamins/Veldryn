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
 ok(source.includes('ThemeColors'),name+' must build theme-aware styling');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not regress to the static Veldryn palette');
}

ok(app.includes("import {OnlineGuildHallPanel}"),'App must wire the server-backed Guild Hall');
ok(app.includes("import {OnlineGuildCustomizationPanel}"),'App must wire server-backed Guild customization');
ok(app.includes('onlineHall={<OnlineGuildHallPanel/>}'),'Guild screen must receive Guild Hall content');
ok(app.includes('onlineCustomize={<OnlineGuildCustomizationPanel/>}'),'Guild screen must receive Guild customization content');

for(const label of ['My Guild','Directory','PvE','Hall','Customize'])ok(screen.includes("'"+label+"'"),'Online Guild tabs must include '+label);
ok(screen.includes("onlineSection==='Hall'?onlineHall:null"),'Hall tab must render Hall content');
ok(screen.includes("onlineSection==='Customize'?onlineCustomize:null"),'Customize tab must render customization content');
ok(screen.includes("root:{padding:spacing.md,gap:10"),'Online Guild shell must remain compact');

ok(customization.includes('appearanceDirty='),'Guild customization must track unsaved appearance changes');
ok(customization.includes("appearanceDirty?'UNSAVED':'SAVED'"),'Guild customization must surface saved/unsaved state');
ok(customization.includes("disabled={busy||!appearanceDirty}"),'Guild appearance save must only enable when something changed');
ok(customization.includes('tagDirty='),'Guild tag changes must have a separate dirty state');
ok(customization.includes('backgroundColor:C.warningSurface'),'Permanent tag warning must be theme-safe');
ok(customization.includes('backgroundColor:C.selection'),'Selected Guild cosmetics must be theme-safe');

ok(identity.includes("C.dark?'rgba(12,23,40,.8)':'rgba(255,255,255,.84)'"),'Special Guild nameplates must remain readable in dark and light themes');
ok(hall.includes('GUILD HALL')&&hall.includes('Current Hall Benefits'),'Guild Hall must preserve progression and benefit hierarchy');
ok(hall.includes('backgroundColor:C.warningSurface'),'Guild Hall level badge must remain light-theme safe');
ok(pve.includes('WEEKLY PROJECT')&&pve.includes('GUILD BOSS'),'Guild PvE must keep distinct project/boss hierarchy');
ok(pve.includes('backgroundColor:C.badSurface'),'Guild boss status must use semantic danger surface');

ok(management.includes('GUILD MANAGEMENT'),'Guild roster must expose management context');
ok(management.includes("role.toUpperCase()"),'Guild management must surface the viewer role');
ok(management.includes("?'WATCH':'ACTIVE'"),'Leadership safety must expose compact watch/active state');
ok(management.includes('DANGER ZONE'),'Leave/disband controls must stay separated from ordinary management');
ok(management.includes("title={busy?'Refreshing…':'Refresh'}"),'Roster refresh must stay compact in the roster header');
ok(management.includes('guildMemberManagement(role,member.role'),'Guild management permissions must remain authoritative');

console.log('PASS: online Guild management, Hall, PvE and customization stay compact, wired and theme-aware');
