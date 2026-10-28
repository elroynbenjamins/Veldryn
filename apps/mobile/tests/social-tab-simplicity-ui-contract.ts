export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}
const social=fs.readFileSync('src/screens/SocialScreen.tsx','utf8');
const hub=fs.readFileSync('src/components/SocialHubPanel.tsx','utf8');
const party=fs.readFileSync('src/components/PartyHubPanel.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');

ok(app.includes("tab!=='Guild'&&tab!=='Social'&&tab!=='Party'"),'Social must not render the redundant global back/title bar');
ok(app.includes("partyUnlocked={earlyFeatureUnlocked(state,'party')}"),'Party gate must honor account-wide unlocks, including earlier characters');
ok(hub.includes("hasParty?[...VISIBLE_TABS,'chat']:VISIBLE_TABS"),'Chat tab must only appear when a party exists');
ok(hub.includes("const VISIBLE_TABS:SocialHubTab[]=['party','guild']"),'Guild remains visible regardless of Party status');
ok(social.includes("tab==='party'&&partyLocked?<PartyLockedNotice"),'Locked Party view must show only the locked notice');
ok(party.includes("if(!inParty&&props.partyUnlocked===false)return"),'Locked Party hub must not render recruitment or other Party controls');
ok(social.includes("tab==='chat'?(social.party?<OnlinePartyChat/>:null):<>"),'Chat must not include Party or Guild recruitment controls');
ok(social.includes("if(tab==='chat'&&!social.party){setTab('party')"),'Party disband must exit Chat safely');
ok(!social.includes('PARTY_SOCIAL_TUTORIAL_STEPS')&&!social.includes('setHelp('),'Duplicate Social help controls must be removed');
ok(!social.includes('onFriends')&&!social.includes('heroStatus'),'Generic Friends toolbar and redundant hero must be removed');
ok(social.includes("<ChatPlayerSheet message={selectedProfile}"),'Player profile interactions must remain available');
ok(social.includes('respondPartyInvitation(invite.id,true,character())'),'Party invite handling must remain available when unlocked');
ok(social.includes("tab==='guild'&&(guildMembership===undefined"),'Guild membership and recruitment view must remain independent of Party lock');

console.log('PASS: Social navigation, Party lock, Guild independence, and party-only Chat UI contracts');
