const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
function moduleFrom(file,deps={}){const sandbox={exports:{},require:name=>deps[name]??{},setInterval,clearInterval};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,sandbox);return sandbox.exports;}
const permissions=moduleFrom('core/social-management.ts');
for(const role of ['member','officer','leader',null,undefined])assert.equal(permissions.canManageGuild(role),role==='leader'||role==='officer');
for(const role of ['member','officer','leader']){
 const membership={guild_id:'mine',role},visible=card=>permissions.guildRecruitmentVisible(card,membership,'guild');
 assert.equal(visible({postType:'guild_recruiting',guildId:'other'}),false,'joined players never see another guild recruiting');
 assert.equal(visible({postType:'guild_recruiting',guildId:'mine'}),role!=='member','only officers/leaders see recruitment for their own guild');
 assert.equal(visible({postType:'looking_for_guild'}),role!=='member','only recruiters see guild seekers');
 for(const postType of ['party_recruiting','looking_for_party'])assert.equal(permissions.guildRecruitmentVisible({postType},membership,'party'),true,'party discovery remains available');
 assert.equal(permissions.guildRecruitmentVisible({postType:'looking_for_guild'},membership,'party'),false);
}
assert.equal(permissions.guildRecruitmentVisible({postType:'guild_recruiting'},undefined,'guild'),false,'unknown membership fails closed');
assert.equal(permissions.guildRecruitmentVisible({postType:'guild_recruiting'},null,'guild'),true,'unguilded players retain discovery');
const mock=name=>props=>React.createElement(name,props,props.children);
function screen(role){
 const deps={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{ActivityIndicator:'ActivityIndicator',View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',StyleSheet:{create:x=>x}},'../core/social-management':permissions,'../i18n/social':{useSocialText:()=>x=>x,socialLabel:(_,x)=>x},'../i18n/GameLanguageProvider':{useGameLanguage:()=> 'en'},'../theme/ThemeContext':{useGameTheme:()=>({})},'../theme/theme':{spacing:{md:12,sm:8},typography:{}},'../online/social':{myGuild:async()=>role?{role,guild_id:'mine'}:null}};
 for(const name of ['Panel','GameButton','GuildDiscoveryFlow','GuildMemberIdentity','GuildHomeActions','GuildNavigation','GuildBoardHero','GuildActivitySummaryPanel','ThemedNavigationIcon'])deps['../components/'+name]={[name]:mock(name)};
 deps['../components/ThemedNavigationIcon']={ThemedIcon:mock('ThemedIcon')};
 return moduleFrom('screens/GuildScreen.tsx',deps).GuildScreen;
}
function socialScreen(role){
 const cards=[{id:'party',postType:'party_recruiting'},{id:'outsider',postType:'guild_recruiting',guildId:'other'},{id:'ours',postType:'guild_recruiting',guildId:'mine'},{id:'seeker',postType:'looking_for_guild'}];
 const social={accountId:'self',characterId:'character',party:null,contracts:[],refresh:async()=>{}};
 const deps={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',StyleSheet:{create:x=>x}},'../core/social-management':permissions,'../i18n/social':{useSocialText:()=>x=>x,socialLabel:(_,x)=>x},'../i18n/GameLanguageProvider':{useGameLanguage:()=> 'en'},'../theme/ThemeContext':{useGameTheme:()=>({})},'../theme/theme':{spacing:{md:12,sm:8},typography:{},equipmentTheme:()=>({})},'../core/party-social':{EMPTY_RECRUITMENT_FILTERS:{},PARTY_SOCIAL_TUTORIAL_STEPS:[]},'../online/PartySocialProvider':{usePartySocial:()=>social},'../online/social':{myGuild:async()=>{if(role==='unknown')throw Error('offline');return role?{guild_id:'mine',role}:null;},socialInvitations:async()=>({party:[],guild:[]}),socialOutgoingInvitations:async()=>({party:[],guild:[]})},'../online/party-social':{partySocialRepository:{browseRecruitment:async()=>cards},ownRecruitmentPosts:async()=>cards,partyRankings:async()=>[],recruitmentMatchAlerts:async()=>cards.map(c=>({id:c.id,title:c.id,focus:'mixed'}))}};
 for(const name of ['PartyHubPanel','PartyEventHubPanel','SocialHubPanel','GuildSeekerPanel','RecruitmentComposer','RecruitmentFiltersPanel','RecruitmentListing','SocialInvitationCard','OnlinePartyChat','GameButton','LoadingState','Panel','ChatPlayerSheet'])deps['../components/'+name]={[name]:mock(name)};
 const sandbox={exports:{},require:name=>deps[name]??{},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/screens/SocialScreen.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,sandbox);
 return sandbox.exports.SocialScreen;
}
(async()=>{
 for(const role of ['member','officer','leader',null]){
  let renderer,chatOpened=0,recruitmentOpened=0;await act(async()=>{renderer=create(React.createElement(screen(role),{online:true,state:{account:{}},onChange:()=>{},onOpenChat:()=>chatOpened++,onRecruitment:()=>recruitmentOpened++,onlineManagement:React.createElement('Management'),onlineCustomize:React.createElement('Appearance')}))});
  const identity=renderer.root.findAllByType('GuildMemberIdentity')[0],manage=identity?.props.onManage;
  assert.equal(Boolean(manage),role==='officer'||role==='leader','Customize navigation is absent for members and nonmembers');
  assert.equal(renderer.root.findAllByType('GuildDiscoveryFlow').length,role?0:1,'joined players cannot enter guild discovery');
  if(role){await act(async()=>renderer.root.findByType('GuildNavigation').props.onChange('Chat'));assert.equal(chatOpened,1,'guild Chat opens the shared keyboard-aware channel overlay');}
  if(manage){
   await act(async()=>manage());
   await act(async()=>renderer.root.findAllByType('GameButton').find(button=>button.props.title==='Guild recruitment').props.onPress());
   assert.equal(recruitmentOpened,1);
   await act(async()=>renderer.root.findAllByType('GameButton').find(button=>button.props.title==='Requests').props.onPress());
   assert.equal(renderer.root.findByType('Management').props.initialView,'Requests','officer requests deep link retains its target');
  }
  if(manage){await act(async()=>manage());assert.equal(renderer.root.findAllByType('Appearance').length,0,'management overview does not immediately mount the appearance editor');await act(async()=>renderer.root.findAllByType('GameButton').find(button=>button.props.title==='Guild Appearance').props.onPress());assert.equal(renderer.root.findAllByType('Appearance').length,1);}
  await act(async()=>renderer.unmount());
 }
 for(const role of ['member','officer','leader',null,'unknown']){
  let renderer;await act(async()=>{renderer=create(React.createElement(socialScreen(role),{onGuild:()=>{},onFriends:()=>{},onAccount:()=>{}}))});
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,300))});
  assert.equal(renderer.root.findByType('PartyHubPanel').props.recruitment.map(card=>card.id).join(','),'party','party feed excludes guild adverts even when membership lookup fails');
  await act(async()=>renderer.root.findByType('SocialHubPanel').props.onChange('guild'));
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,300))});
  const seekers=renderer.root.findAllByType('GuildSeekerPanel');
  assert.equal(seekers.length,role==='member'||role==='unknown'?0:1,'members and unknown roles do not browse guild recruitment');
  if(role==='officer'||role==='leader'){
   assert.ok(seekers[0].props.seekers.every(card=>card.id!=='outsider'),'recruiters never browse other guilds’ adverts');
   assert.equal(seekers[0].props.onPostMyAd,undefined,'joined leadership cannot post a guild-seeker advert');
  }
  await act(async()=>renderer.unmount());
 }
 console.log('PASS: Guild role visibility, current-guild-only recruiting, party discovery and joined/nonmember routing');
})().catch(error=>{console.error(error);process.exitCode=1});
