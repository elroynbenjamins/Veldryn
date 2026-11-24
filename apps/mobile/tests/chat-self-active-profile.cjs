'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const ctx=React.createContext(null),calls=[],powerCalls=[];
let failNext=false,resolveManual;
const row=(account,id)=>({accountId:account,displayName:account,character:{id,name:id},characterChoices:[{id:'main'},{id:'alt'}],achievementShowcaseIds:[],recordShowcaseIds:[],collectionShowcase:[],equippedGear:[]});
const deps={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{ActivityIndicator:'ActivityIndicator',Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',StyleSheet:{create:x=>x,hairlineWidth:1},useWindowDimensions:()=>({width:400,fontScale:1})},
 '../i18n/social':{useSocialText:()=>x=>x},
 '../theme/ThemeContext':{useGameTheme:()=>({})},'../theme/theme':{radii:{},spacing:{},typography:{}},
 '../online/AuthSessionProvider':{useAuthSession:()=>({session:{user:{id:'self'}}})},
 './ActiveProfileCharacterContext':{ActiveProfileCharacterContext:ctx},
 '../online/social-identity-client-gate':{ACCOUNT_SOCIAL_IDENTITY_RELEASED:true},
 '../core/combat-power':{combatPowerRating:s=>({total:s.character.id==='main'?1234:5678})},
 '../online/profile-extension-v43':{publicPlayerProfileV43:async(account,id)=>{
  calls.push([account,id]);if(failNext){failNext=false;throw Error('offline');}
  if(resolveManual===true&&id==='alt')return new Promise(resolve=>{resolveManual=()=>resolve(row(account,id));});
  return row(account,id??'alt');
 }},
 '../online/coop-client':{coopClient:{profilePower:async account=>{powerCalls.push(account);return {combatPower:99};}}},
 '../online/social':{friendRelationshipState:async()=>({relationship:'none'}),socialInviteCapabilities:async()=>null},
 '../core/social-identity':{friendRelationshipActionPresentation:()=>({status:'none'})},
 '../core/profile-prestige':{profileRecordPrestige:()=>({})},
 './GameModalSurface':{GameModalSurface:'GameModalSurface',GameModalHeader:'GameModalHeader'},
};
for(const name of ['ProfileShowcaseSection','ProfileEquippedGearShowcase','ProfileFavoriteHighlights','GameButton','CompactPlayerIdentity','PublicProfileScene','ProfileCharacterSelector'])deps['./'+name]={[name]:name};
const source=fs.readFileSync(path.join(__dirname,'../src/components/ChatPlayerSheet.tsx'),'utf8');
const sandbox={exports:{},require:name=>deps[name]??{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,sandbox);
const Sheet=sandbox.exports.ChatPlayerSheet,noop=()=>{};
(async()=>{
 let renderer;
 const element=(account,id='main')=>React.createElement(ctx.Provider,{value:{id,stateRef:{current:{character:{id}}}}},React.createElement(Sheet,{message:account?{id:'message',account_id:account,sender_name:'old name'}:null,onClose:noop,onBlocked:noop}));
 const scene=()=>renderer.root.findByType('PublicProfileScene').props.profile;
 const select=()=>renderer.root.findByType('ProfileCharacterSelector').props;
 await act(async()=>{renderer=create(element('self'));});
 assert.deepEqual(calls.at(-1),['self','main']);assert.equal(scene().character.id,'main');assert.equal(scene().combatPower,1234);assert.equal(select().selectedId,'main');assert.equal(powerCalls.length,0);
 await act(async()=>{select().onSelect('alt');});
 assert.equal(scene().character.id,'alt');assert.equal(scene().combatPower,undefined);
 await act(async()=>renderer.update(element(null)));
 await act(async()=>renderer.update(element('self')));
 assert.equal(scene().character.id,'main','reopening resets manual selection to active gameplay hero');
 resolveManual=true;await act(async()=>{select().onSelect('alt');});
 await act(async()=>renderer.update(element(null)));
 await act(async()=>renderer.update(element('self')));
 await act(async()=>resolveManual());
 assert.equal(scene().character.id,'main','late manual response cannot override a reopened sheet');
 await act(async()=>renderer.update(element('self','alt')));
 assert.equal(scene().character.id,'alt');assert.equal(scene().combatPower,5678);
 await act(async()=>renderer.update(element('other','main')));
 assert.deepEqual(calls.at(-1),['other',undefined]);assert.equal(scene().character.id,'alt');assert.equal(scene().combatPower,99);assert.deepEqual(powerCalls,['other']);
 await act(async()=>renderer.update(element(null)));
 failNext=true;await act(async()=>renderer.update(element('self')));
 const retry=renderer.root.findAllByType('GameButton').find(x=>x.props.title==='Retry profile');
 assert.ok(retry);await act(async()=>retry.props.onPress());
 assert.deepEqual(calls.at(-1),['self','main']);assert.equal(scene().character.id,'main');
 await act(async()=>renderer.unmount());
 console.log('PASS: own active hero, manual selection, reopen, stale response, retry and other-player featured landing');
})().catch(error=>{console.error(error);process.exitCode=1});
