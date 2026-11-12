const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const mock=name=>props=>React.createElement(name,props,props.children);
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/OnlineGuildManagement.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function load(role){
 const social={guildLeadershipStatus:async()=>null,myGuild:async()=>({guild_id:'guild',role,account_id:'self'}),socialInvitations:async()=>({guild:[]}),socialOutgoingInvitations:async()=>({guild:[]}),guildDetails:async()=>({name:'Stormwatch',tag:'STW',level:8,member_cap:30}),guildRoster:async()=>[{account_id:'self',display_name:'Elowen',role,joined_at:'2026-10-01',last_active_at:'2026-11-12T14:00:00Z'},{account_id:'other',display_name:'Brann',role:'member',joined_at:'2026-10-02',last_active_at:'2026-11-11T14:00:00Z'}],guildApplications:async()=>[{id:'application',account_id:'applicant'}]};
 const dependencies={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:x=>x}},'../i18n/social':{useSocialText:()=>s=>s},'../i18n/guild-flow-ui':{useGuildFlowUiText:()=>s=>s},'../core/guild-member-last-active':{sortGuildMembersByActivity:rows=>rows.sort((a,b)=>Date.parse(a.last_active_at??'')-Date.parse(b.last_active_at??''))},'../theme/ThemeContext':{useGameTheme:()=>({})},'../theme/theme':{spacing:{md:12,sm:8},typography:{}},'../online/supabase':{onlineConfigured:true},'../online/social':social,'../online/profile-extension-v43':{publicPlayerProfileV43:async()=>({displayName:'Aster'})},'./GuildMemberActionSheet':{GuildMemberActionSheet:mock('GuildMemberActionSheet')},'../core/social-management':{guildMemberManagement:(viewer,target,self)=>({canPromote:viewer==='leader'&&target==='member'&&!self})}};
 for(const name of ['GameButton','Panel','BoardTabs','GameTextInput','ChatPlayerSheet','CompactPlayerIdentity','GuildMemberActivityLabel','SocialInvitationCard','GuildIdentitySummary','LoadingState','ActionFeedback'])dependencies['./'+name]={[name]:mock(name)};
 const sandbox={exports:{},Error,require:name=>dependencies[name]??{}};vm.runInNewContext(code,sandbox);return sandbox.exports.OnlineGuildManagement;
}
(async()=>{
 for(const role of ['leader','member']){
  let renderer;await act(async()=>{renderer=create(React.createElement(load(role)))});
  const buttons=()=>renderer.root.findAllByType('GameButton');
  assert.ok(!buttons().some(button=>/Leave Guild|Disband Guild/.test(button.props.title)),'destructive controls are absent from member browsing');
  assert.equal(renderer.root.findAllByType('CompactPlayerIdentity').length,2);
  assert.equal(renderer.root.findAllByType('GuildMemberActivityLabel').length,2,'each Guild member receives an activity label');
  assert.equal(renderer.root.findAllByType('GuildMemberActivityLabel')[0].props.lastActiveAt,'2026-11-12T14:00:00Z','the roster forwards server activity, not the join date');
  if(role==='leader'){
   const sortButton=buttons().find(button=>button.props.title==='Inactive first');
   assert.ok(sortButton,'Guild leadership can sort by inactivity');
   await act(async()=>sortButton.props.onPress());
   assert.deepEqual(renderer.root.findAllByType('CompactPlayerIdentity').map(row=>row.props.name),['Brann','Elowen'],'inactive-first shows least recently active Guild members first');
  }else assert.ok(!buttons().some(button=>button.props.title==='Inactive first'),'ordinary members do not get management sorting controls');
  await act(async()=>renderer.root.findByType('GameTextInput').props.onChangeText('brann'));
  assert.equal(renderer.root.findAllByType('CompactPlayerIdentity').length,1,'search filters actual loaded member names');
  const memberRow=renderer.root.findAllByType('Pressable').find(button=>/Guild member details/.test(button.props.accessibilityLabel??''));
  assert.ok(memberRow,'the compact member row must be tappable');
  await act(async()=>memberRow.props.onPress());
  const sheet=renderer.root.findByType('GuildMemberActionSheet');
  assert.equal(sheet.props.member.display_name,'Brann');
  assert.equal(sheet.props.actorRole,role,'the actual signed-in Guild role gates actions');
  await act(async()=>sheet.props.onClose());
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
 const sheetSource=fs.readFileSync(path.join(__dirname,'../src/components/GuildMemberActionSheet.tsx'),'utf8');
 assert.ok(sheetSource.includes('guildMemberManagement(actorRole,current.role,current.account_id===actorAccountId)'),'member actions must respect role and self-protection');
 assert.ok(sheetSource.includes('dismissOnBackdrop={!busy}')&&sheetSource.includes('Keep current role'),'busy and destructive confirmations must remain dismiss-safe');
 assert.ok(sheetSource.includes('GameModalSurface')&&sheetSource.includes('GameModalHeader'),'details use the shared theme-aware modal');
 const managementSource=fs.readFileSync(path.join(__dirname,'../src/components/OnlineGuildManagement.tsx'),'utf8');
 assert.ok(managementSource.includes('publicPlayerProfileV43(app.account_id)')&&managementSource.includes("view!=='Requests'"),'applicant identity loading is lazy and privacy-aware');
 console.log('PASS: Guild roster search, action sheet, role permissions, requests and membership controls');
})().catch(error=>{console.error(error);process.exitCode=1});
