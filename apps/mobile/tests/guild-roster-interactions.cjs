const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const mock=name=>props=>React.createElement(name,props,props.children);
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/OnlineGuildManagement.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function load(role){
 const social={guildLeadershipStatus:async()=>null,myGuild:async()=>({guild_id:'guild',role,account_id:'self'}),socialInvitations:async()=>({guild:[]}),socialOutgoingInvitations:async()=>({guild:[]}),guildDetails:async()=>({name:'Stormwatch',tag:'STW',level:8,member_cap:30}),guildRoster:async()=>[{account_id:'self',display_name:'Elowen',role,joined_at:'2026-10-01'},{account_id:'other',display_name:'Brann',role:'member',joined_at:'2026-10-02'}],guildApplications:async()=>[{id:'application',account_id:'applicant'}]};
 const dependencies={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:x=>x}},'../i18n/social':{useSocialText:()=>s=>s},'../theme/ThemeContext':{useGameTheme:()=>({})},'../theme/theme':{spacing:{md:12,sm:8},typography:{}},'../online/supabase':{onlineConfigured:true},'../online/social':social,'../core/social-management':{guildMemberManagement:(viewer,target,self)=>({canPromote:viewer==='leader'&&target==='member'&&!self})}};
 for(const name of ['GameButton','Panel','BoardTabs','GameTextInput','ChatPlayerSheet','CompactPlayerIdentity','SocialInvitationCard','GuildIdentitySummary','LoadingState','ActionFeedback'])dependencies['./'+name]={[name]:mock(name)};
 const sandbox={exports:{},Error,require:name=>dependencies[name]??{}};vm.runInNewContext(code,sandbox);return sandbox.exports.OnlineGuildManagement;
}
(async()=>{
 for(const role of ['leader','member']){
  let renderer;await act(async()=>{renderer=create(React.createElement(load(role)))});
  const buttons=()=>renderer.root.findAllByType('GameButton');
  assert.ok(!buttons().some(button=>/Leave Guild|Disband Guild/.test(button.props.title)),'destructive controls are absent from member browsing');
  assert.equal(renderer.root.findAllByType('CompactPlayerIdentity').length,2);
  await act(async()=>renderer.root.findByType('GameTextInput').props.onChangeText('brann'));
  assert.equal(renderer.root.findAllByType('CompactPlayerIdentity').length,1,'search filters actual loaded member names');
  await act(async()=>renderer.root.findByType('GameTextInput').props.onChangeText('missing'));
  assert.ok(buttons().some(button=>button.props.title==='Clear search'));
  await act(async()=>renderer.root.findByType('BoardTabs').props.onChange('Requests'));
  assert.equal(renderer.root.findAllByType('SocialInvitationCard').length,role==='leader'?1:0,'ordinary members never see application review actions');
  await act(async()=>renderer.root.findByType('BoardTabs').props.onChange('Safety'));
  assert.ok(buttons().some(button=>button.props.title===(role==='leader'?'Disband Guild':'Leave Guild')),'membership view preserves the correct permissioned departure action');
  assert.equal(renderer.root.findAllByType('CompactPlayerIdentity').length,0);
  await act(async()=>renderer.unmount());
  await act(async()=>{renderer=create(React.createElement(load(role),{initialView:'Safety'}))});
  assert.ok(buttons().some(button=>button.props.title===(role==='leader'?'Disband Guild':'Leave Guild')),'management deep link opens membership controls directly');
  await act(async()=>renderer.unmount());
 }
 console.log('PASS: Guild roster search, role-specific requests and isolated membership controls');
})().catch(error=>{console.error(error);process.exitCode=1});
