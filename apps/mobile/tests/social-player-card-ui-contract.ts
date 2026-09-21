export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const compact=read('src/components/CompactPlayerIdentity.tsx');
const tagged=read('src/components/GuildTaggedPlayerName.tsx');
const identity=read('src/components/SocialIdentity.tsx');
const friends=read('src/screens/FriendsScreen.tsx');
const party=read('src/components/PartyHubPanel.tsx');
const guild=read('src/components/OnlineGuildManagement.tsx');
const rankings=read('src/screens/RankingsScreen.tsx');
const legacyGuild=read('src/components/GuildMemberRosterPanel.tsx');

for(const [name,source] of [['CompactPlayerIdentity',compact],['GuildTaggedPlayerName',tagged],['SocialIdentity',identity],['PartyHubPanel',party],['OnlineGuildManagement',guild],['GuildMemberRosterPanel',legacyGuild]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not regress to the static Veldryn palette');
}

ok(compact.includes('CompactIdentityStatusTone'),'Shared player identity must expose semantic status tones');
ok(compact.includes("statusGood:{color:C.good}")&&compact.includes("statusWarning:{color:C.warning}")&&compact.includes("statusInfo:{color:C.info}"),'Shared identity statuses must use semantic theme colors');
ok(compact.includes('guild={guild}'),'Shared identity must support account and Guild artwork modes');
ok(compact.includes('backgroundColor:C.warningSurface')&&compact.includes('backgroundColor:C.infoSurface'),'Guild role pills must remain light-theme safe');

ok(tagged.includes("C.dark?'rgba(8,15,24,.82)':'rgba(255,255,255,.9)'"),'Guild tags must stay readable in dark and light themes');
ok(identity.includes('borderColor:C.line')&&identity.includes('backgroundColor:C.panel2'),'Identity artwork must use theme-aware frame surfaces');

ok(friends.includes('statusTone="good"')&&friends.includes('statusTone="warning"')&&friends.includes('statusTone="info"'),'Friends must use consistent semantic relationship states');
ok(party.includes("import {CompactPlayerIdentity} from './CompactPlayerIdentity'"),'Party roster must use the shared player identity component');
ok(!party.includes('IdentityArtwork name={member.characterName}'),'Party roster must not regress to its old custom player row');
ok(guild.includes("accessibilityLabel={\`Open \${member.display_name}'s profile\`}"),'Guild roster identity itself must open the player profile');
ok(!guild.includes('title="Profile"'),'Guild roster must not duplicate a separate Profile button beside a tappable identity');
ok(rankings.includes("import {CompactPlayerIdentity} from '../components/CompactPlayerIdentity'"),'Rankings must use the shared identity presentation');
ok(rankings.includes("guild={entry.entityType==='guild'}"),'Rankings must distinguish Guild and player identity artwork');
ok(legacyGuild.includes('CompactPlayerIdentity'),'Legacy Guild roster fallback must also use the shared identity component');

console.log('PASS: Friends, Party, Guild and Rankings share one compact theme-aware player identity language');
