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
 'react-native':{Modal:'Modal',Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{create:x=>x,absoluteFill:{},hairlineWidth:1},Text:'Text',View:'View'},
 '../i18n/guild-detailed-guide-locales':{localizedGuildDetailedGuide:(_language,id)=>guides[id]},
 '../i18n/guild-guide-library':{guildGuideLibraryText:(_language,label)=>label,guildGuideSectionTitle:(_language,_id,title)=>title},
 '../i18n/GameLanguageProvider':{useGameLanguage:()=>'nl'},
 '../theme/ThemeContext':{useGameTheme:()=>C},
 './ThemedNavigationIcon':{ThemedIcon:()=>React.createElement('GuildIcon')},
};
function loadComponent(name){
 const source=fs.readFileSync(path.join(__dirname,'../src/components',name+'.tsx'),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const sandbox={exports:{},require:name=>deps[name]??{}};
 vm.runInNewContext(code,sandbox);
 return sandbox.exports;
}
deps['./GuideTopicAccordion']=loadComponent('GuideTopicAccordion');
const {GuildGuideLibrary}=loadComponent('GuildGuideLibrary');
(async()=>{
 let renderer,closed=0;
 const app=role=>React.createElement(GuildGuideLibrary,{visible:true,role,onClose:()=>closed++});
 const buttons=()=>renderer.root.findAllByType('Pressable').filter(x=>x.props.accessibilityRole==='button');
 const topicButtons=()=>buttons().filter(x=>typeof x.props.accessibilityState?.expanded==='boolean');
 const button=name=>buttons().find(x=>x.props.accessibilityLabel===name);
 const text=value=>renderer.root.findAllByType('Text').some(x=>x.props.children===value);
 await act(async()=>{renderer=create(app('member'))});
 assert.ok(button('Guild Home'),'member sees the Guild Home guide');
 assert.ok(button('Muster & Rally'),'member can open activity help');
 assert.equal(button('Manage your Guild'),undefined,'member cannot see leadership guides');
 assert.ok(renderer.root.findAllByType('ScrollView').length>0,'library list can scroll');
 await act(async()=>{button('Muster & Rally').props.onPress()});
 assert.ok(text('Translated Muster summary'),'locale summary appears after selecting a guide');
 assert.equal(topicButtons().length,2,'all accordion topics are available');
 assert.equal(button('Daily points').props.accessibilityState.expanded,true,'first topic is expanded');
 assert.equal(button('Weekly Rally').props.accessibilityState.expanded,false,'second topic is collapsed');
 assert.ok(text('Earn 25 points.'),'first topic body is visible');
 assert.ok(!text('Earn marks on four days.'),'collapsed content is not rendered');
 await act(async()=>{button('Weekly Rally').props.onPress()});
 assert.equal(button('Weekly Rally').props.accessibilityState.expanded,true,'topic expansion updates');
 assert.equal(button('Daily points').props.accessibilityState.expanded,false,'prior topic collapses');
 assert.ok(!text('Earn 25 points.'),'previous body is removed');
 assert.ok(text('Earn marks on four days.'),'second topic body is visible');
 await act(async()=>{button('Weekly Rally').props.onPress()});
 assert.ok(topicButtons().every(x=>!x.props.accessibilityState.expanded),'tapping the active topic collapses it');
 assert.ok(!text('Earn marks on four days.'),'collapsed body is removed');
 assert.ok(renderer.root.findAllByType('ScrollView').every(x=>!x.props.horizontal&&x.props.showsHorizontalScrollIndicator===false&&x.props.showsVerticalScrollIndicator===false),'guide scrolls vertically without indicators');
 await act(async()=>{button('Daily points').props.onPress()});
 assert.ok(text('Earn 25 points.'),'collapsed topic can reopen');
 await act(async()=>{button('All guides').props.onPress()});
 assert.ok(button('Guild Home'),'back returns to the library');
 await act(async()=>{button('Muster & Rally').props.onPress()});
 assert.equal(button('Daily points').props.accessibilityState.expanded,true,'reopening starts with the first topic');
 await act(async()=>{button('All guides').props.onPress()});
 await act(async()=>{renderer.update(app('officer'))});
 assert.ok(button('Manage your Guild'),'officers can access leadership guides');
 await act(async()=>{button('Manage your Guild').props.onPress()});
 assert.ok(text('Leadership guide'),'management topic opens');
 const modal=renderer.root.findByType('Modal');
 await act(async()=>{modal.props.onRequestClose()});
 assert.equal(closed,1,'native Android Back dismisses the guide');
 await act(async()=>renderer.unmount());
 console.log('PASS: Guild Guide Library member/officer access, scrollable locale topics, accordion expansion/collapse, reset, Back and dismissal');
})().catch(error=>{console.error(error);process.exitCode=1});
