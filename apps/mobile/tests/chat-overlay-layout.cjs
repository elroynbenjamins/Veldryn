'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{act,create}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const listeners=new Map(),removed=[];
const mock=name=>props=>React.createElement(name,props,props.children);
const refresh=()=>{};
const styles={create:x=>x,hairlineWidth:1,absoluteFill:{}};
const GuildChat=props=>{React.useEffect(()=>{props.onTitleChange?.('[STW] Stormwatch')},[props.onTitleChange]);return React.createElement('GuildChat',props)};
const deps={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})},Keyboard:{addListener:(name,fn)=>{listeners.set(name,fn);return{remove:()=>removed.push(name)}}},Platform:{OS:'android'},View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Modal:'Modal',KeyboardAvoidingView:'KeyboardAvoidingView',StyleSheet:styles,useWindowDimensions:()=>({width:320,fontScale:1})},
 '../i18n/social':{useSocialText:()=>x=>x,socialLabel:(_,x)=>x},'../theme/ThemeContext':{useGameTheme:()=>({})},'../online/supabase':{onlineConfigured:false},'../online/AuthSessionProvider':{useAuthSession:()=>({session:null})},'../online/PartySocialProvider':{usePartySocial:()=>({party:null,accountId:'self',refresh})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:24,bottom:24})},'../online/social':{WORLD_CHANNELS:[{id:'en',name:'English'},{id:'nl',name:'Nederlands'}]},'./GuildChat':{GuildChat}
};
for(const name of ['ChatChannelIcon','OnlineWorldChat','WorldChat','OnlinePartyChat','ChatDock','SystemNoticeLog'])deps['./'+name]={[name]:mock(name)};
deps['./PartyChatGate']={PartyChatGate:({party,children})=>party?children:null};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/components/ChatOverlay.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sandbox={exports:{},require:name=>deps[name]??{},__DEV__:true,setInterval,clearInterval};
vm.runInNewContext(code,sandbox);

(async()=>{
 let renderer;
 const getTabs=()=>renderer.root.findAllByType('Pressable').filter(x=>x.props.accessibilityRole==='tab');
 const tab=name=>getTabs().find(x=>x.props.accessibilityLabel===name);
 const clearance=()=>renderer.root.findAllByType('View').find(x=>Array.isArray(x.props.style)&&x.props.style.some(s=>s?.paddingBottom!==undefined)).props.style.at(-1).paddingBottom;
 const state=(member,id)=>({createdAtMs:id,account:{guildMember:member},settings:{},character:{name:'Tester'}});
 await act(async()=>{renderer=create(React.createElement(sandbox.exports.ChatOverlay,{state:state(true,1),visible:true,onOpen:refresh,onClose:refresh}))});
 assert.equal(renderer.root.findByType('KeyboardAvoidingView').props.behavior,'height');
 assert.equal(renderer.root.findByType('KeyboardAvoidingView').props.keyboardVerticalOffset,0);
 assert.equal(clearance(),24,'non-keyboard root uses bottom safe area');
 assert.ok(tab('World')&&tab('Guild')&&tab('System'),'three available tabs visible');
 assert.equal(tab('Party'),undefined,'Party tab hidden without membership');
 assert.equal(tab('Guild').props.accessibilityState.disabled,false);
 assert.ok(renderer.root.findAllByType('View').some(x=>x.props.accessibilityRole==='tablist'),'channel list semantics present');
 await act(async()=>{listeners.get('keyboardDidShow')()});
 assert.equal(clearance(),4,'keyboard frees nonessential bottom spacing');
 await act(async()=>{listeners.get('keyboardDidHide')()});
 assert.equal(clearance(),24,'keyboard hide restores bottom safe area');
 await act(async()=>{tab('Guild').props.onPress()});
 assert.equal(renderer.root.findByType('GuildChat').props.embedded,true);
 assert.equal(renderer.root.findByType('GuildChat').props.active,true);
 assert.ok(renderer.root.findAllByType('Text').some(x=>x.props.children==='[STW] Stormwatch'),'live guild name shown in meta header');
 await act(async()=>{tab('World').props.onPress()});
 assert.equal(renderer.root.findByType('GuildChat').props.active,false,'mounted Guild history remains idle while visiting World');
 await act(async()=>renderer.unmount());
 assert.deepEqual(removed.sort(),['keyboardDidHide','keyboardDidShow']);
 await act(async()=>{renderer=create(React.createElement(sandbox.exports.ChatOverlay,{state:state(false,2),visible:true,onOpen:refresh,onClose:refresh}))});
 assert.equal(tab('Guild').props.accessibilityState.disabled,true,'guild access gate');
 await act(async()=>renderer.unmount());
 await act(async()=>{renderer=create(React.createElement(sandbox.exports.ChatOverlay,{initialChannel:'guild',state:state(true,3),visible:true,onOpen:refresh,onClose:refresh}))});
 assert.equal(renderer.root.findByType('GuildChat').props.active,true,'Guild deeplink opens Guild immediately');
 await act(async()=>renderer.unmount());
 console.log('PASS: compact phone tabs, keyboard clearance, Guild deeplink and channel preservation');
})().catch(error=>{console.error(error);process.exitCode=1});