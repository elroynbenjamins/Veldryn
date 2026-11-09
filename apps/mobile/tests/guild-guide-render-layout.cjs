'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),React=require('react'),{create,act}=require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const guides={
 Home:{title:'Guild Home',body:'Translated Guild Home summary',topics:[{id:'notice',title:'Notice Board',body:'Read your Guild notices.'}]},
 'Activities/Muster':{title:'Muster & Rally',body:'Translated Muster summary',topics:[{id:'daily',title:'Daily points',body:'Earn 25 points.'},{id:'weekly',title:'Weekly Rally',body:'Earn marks on four days.'}]},
 Manage:{title:'Manage your Guild',body:'Leadership guide',topics:[{id:'safety',title:'Safety',body:'Review permanent actions carefully.'}]},
};
const C={panel:'#111',panel2:'#222',line:'#333',accent:'#dda',text:'#fff',muted:'#aaa',selection:'#444',selectionLine:'#666'};
const deps={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{Modal:'Modal',Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{create:x=>x,absoluteFill:{}},Text:'Text',View:'View'},
 '../i18n/guild-detailed-guide-locales':{localizedGuildDetailedGuide:(_language,id)=>guides[id]},
 '../i18n/guild-guide-library':{guildGuideLibraryText:(_language,label)=>label,guildGuideSectionTitle:(_language,_id,title)=>title},
 '../i18n/GameLanguageProvider':{useGameLanguage:()=>'nl'},
 '../theme/ThemeContext':{useGameTheme:()=>C},
 './ThemedNavigationIcon':{ThemedIcon:()=>React.createElement('GuildIcon')},
};
const source=fs.readFileSync(path.join(__dirname,'../src/components/GuildGuideLibrary.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sandbox={exports:{},require:name=>deps[name]??{}};
vm.runInNewContext(code,sandbox);
const GuildGuideLibrary=sandbox.exports.GuildGuideLibrary;
(async()=>{
 let renderer,closed=0;
 const app=role=>React.createElement(GuildGuideLibrary,{visible:true,role,onClose:()=>closed++});
 const buttons=()=>renderer.root.findAllByType('Pressable').filter(x=>x.props.accessibilityRole==='button');
 const tabButtons=()=>renderer.root.findAllByType('Pressable').filter(x=>x.props.accessibilityRole==='tab');
 const button=name=>buttons().find(x=>x.props.accessibilityLabel===name);
 const text=value=>renderer.root.findAllByType('Text').some(x=>x.props.children===value);
 await act(async()=>{renderer=create(app('member'))});
 assert.ok(button('Guild Home'),'member sees the Guild Home guide');
 assert.ok(button('Muster & Rally'),'member can open activity help');
 assert.equal(button('Manage your Guild'),undefined,'member cannot see leadership guides');
 assert.ok(renderer.root.findAllByType('ScrollView').length>0,'library list can scroll');
 await act(async()=>{button('Muster & Rally').props.onPress()});
 assert.ok(text('Translated Muster summary'),'locale summary appears after selecting a guide');
 assert.equal(tabButtons().length,2,'topic choice tabs are available');
 assert.equal(tabButtons()[0].props.accessibilityState.selected,true,'first topic is selected');
 await act(async()=>{tabButtons()[1].props.onPress()});
 assert.equal(tabButtons()[1].props.accessibilityState.selected,true,'topic selection updates');
 assert.ok(text('Earn marks on four days.'),'second topic body is visible');
 assert.ok(renderer.root.findAllByType('ScrollView').length>0,'long topic body remains scrollable');
 await act(async()=>{button('All guides').props.onPress()});
 assert.ok(button('Guild Home'),'back returns to the library');
 await act(async()=>{renderer.update(app('officer'))});
 assert.ok(button('Manage your Guild'),'officers can access leadership guides');
 await act(async()=>{button('Manage your Guild').props.onPress()});
 assert.ok(text('Leadership guide'),'management topic opens');
 const modal=renderer.root.findByType('Modal');
 await act(async()=>{modal.props.onRequestClose()});
 assert.equal(closed,1,'native Android Back dismisses the guide');
 await act(async()=>renderer.unmount());
 console.log('PASS: Guild Guide Library member/officer access, scrollable locale topics, selection, Back and dismissal');
})().catch(error=>{console.error(error);process.exitCode=1});
