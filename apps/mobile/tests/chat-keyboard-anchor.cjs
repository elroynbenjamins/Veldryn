'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const React=require('react'),{act,create}=require('react-test-renderer'),ts=require('typescript');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

const frames=[],scrollCalls=[];
const scrollNode={scrollToEnd:options=>scrollCalls.push({method:'end',...options}),scrollTo:options=>scrollCalls.push({method:'to',...options})};
const style={create:values=>values};
class ChatReadAcknowledgement{
 constructor(onRead){this.onRead=onRead;}
 setActive(active){this.active=active;}
 caughtUp(messageId){if(this.active)void this.onRead(messageId);}
}
const dependencies={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})},Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',View:'View',StyleSheet:style},
 '../i18n/social':{useSocialText:()=>key=>key},
 '../theme/ThemeContext':{useGameTheme:()=>({muted:'#999',warning:'#fc0',selection:'#111',selectionLine:'#aaa',info:'#fff'})},
 '../core/chat-read-ack':{ChatReadAcknowledgement}
};
const source=fs.readFileSync(path.join(__dirname,'../src/components/ChatLog.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sandbox={exports:{},require:name=>dependencies[name]??{},requestAnimationFrame:callback=>{frames.push(callback);return frames.length;}};
vm.runInNewContext(code,sandbox);

(async()=>{
 let renderer;
 const flush=async()=>{await act(async()=>{while(frames.length)frames.shift()();});};
 const items=[{id:'first'},{id:'latest'}];
 const component=rows=>React.createElement(sandbox.exports.ChatLog,{channelKey:'world:en',items:rows,expanded:true,active:true,emptyText:'Empty',renderItem:item=>React.createElement('Text',null,item.id)});
 const viewport=()=>renderer.root.findByType('ScrollView');
 const measure=(height)=>viewport().props.onLayout({nativeEvent:{layout:{height}}});
 const scroll=(y,height)=>viewport().props.onScroll({nativeEvent:{contentOffset:{y},contentSize:{height:900},layoutMeasurement:{height}}});
 try{
  await act(async()=>{renderer=create(component(items),{createNodeMock:element=>element.type==='ScrollView'?scrollNode:null});});
  await act(async()=>{viewport().props.onContentSizeChange(320,900);measure(500);});
  await flush();
  assert.ok(scrollCalls.some(call=>call.method==='end'),'initial chat opens at the newest message');
  scrollCalls.length=0;

  // Android shrinks the viewport on keyboard open. This is not a manual upward scroll.
  await act(async()=>{scroll(400,280);measure(280);});
  await flush();
  assert.ok(scrollCalls.some(call=>call.method==='end'),'keyboard resize keeps the newest message immediately above the composer');
  scrollCalls.length=0;

  // A real user drag must take priority over automatic latest-message following.
  await act(async()=>{
   viewport().props.onScrollBeginDrag();
   scroll(100,280);
   viewport().props.onScrollEndDrag();
   measure(200);
  });
  await flush();
  assert.equal(scrollCalls.length,0,'manual history reading is not interrupted by keyboard/layout changes');

  await act(async()=>{renderer.update(component([...items,{id:'newest'}]));});
  await flush();
  assert.equal(scrollCalls.length,0,'incoming messages do not yank an older history reader to the bottom');
  const jump=renderer.root.findAllByType('Pressable').find(node=>node.props.accessibilityLabel?.includes('Jump to'));
  assert.ok(jump,'older-history reader can jump to newly arrived messages');
  await act(async()=>{jump.props.onPress();});
  assert.ok(scrollCalls.some(call=>call.method==='end'),'jump restores latest-message following');
  console.log('PASS chat keyboard anchor: resize follows newest, manual history scrolling stays put, jump restores follow');
 } finally {if(renderer)await act(async()=>renderer.unmount());}
})().catch(error=>{console.error(error);process.exitCode=1});
