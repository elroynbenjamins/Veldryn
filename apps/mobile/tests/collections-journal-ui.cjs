// Exercise the real screen with native/artwork adapters; no simulator is required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {act,create}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
let fontScale=1;
const native={View:'View',Text:'Text',Pressable:'Pressable',Image:'Image',ScrollView:'ScrollView',StyleSheet:{create:value=>value},useWindowDimensions:()=>({fontScale}),FlatList:props=>React.createElement('FlatList',props,props.ListHeaderComponent,props.data.length?props.data.map(item=>React.createElement(React.Fragment,{key:item.id},props.renderItem({item}))):props.ListEmptyComponent,props.ListFooterComponent)};
const colors={};
const profiles=state=>[
 {id:'class:IRONWARDEN',name:'Ironwarden',group:'Class',source:'Your active class.',unlocked:true,selected:state.character?.profileIconId==='class:IRONWARDEN'},
 {id:'ranger',name:'Hooded Ranger',group:'Starter',source:'Available from the start.',unlocked:true,selected:state.character?.profileIconId==='ranger'},
 {id:'knight',name:'Fallen Knight',group:'Combat',source:'Defeat the Fallen Knight.',unlocked:false,selected:false},
];
const collectibles=[
 {id:'forest',name:'Forest',kind:'background',owned:true,selected:false,collectionGroup:'Starter'},
 {id:'earned-event',name:'Earned event art',kind:'background',owned:true,selected:false,event:'past'},
 {id:'future-event',name:'Future event art',kind:'background',owned:false,selected:false,event:'veilbreak'},
 {id:'pet',name:'Hidden pet',kind:'pet',owned:true,selected:false},
].map(row=>({...row,target:'attack',source:'Reward',ownedBps:5,activeBps:10}));
const modules={
 'react':React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':native,
 '../i18n/GameLanguageProvider':{useGameLanguage:()=> 'en'},'../i18n/companions':{companionContent:(_,value)=>value},
 '../i18n/shared':{sharedText:(_,value)=>value},
 '../components/GameButton':{GameButton:'GameButton'},'../components/GameTextInput':{GameTextInput:'GameTextInput'},
 '../components/GameModalSurface':{GameModalSurface:'GameModalSurface',GameModalHeader:'GameModalHeader'},
 '../components/ProfileFrameOverlay':{ProfileFrameOverlay:'ProfileFrameOverlay'},'../components/ProfileIcon':{ProfileIcon:'ProfileIcon'},'../components/RegionArtwork':{RegionArtwork:'RegionArtwork'},
 '../core/profile-cosmetics':{BASE_PROFILE_BACKGROUNDS:[]},'../content/collectibles':{COLLECTIBLE_TARGET_LABELS:{attack:'Attack'}},
 '../core/collectibles':{collectibleJournal:()=>collectibles,collectionBonusBreakdown:()=>[],selectCollectible:(state,kind,id)=>({...state,character:{...state.character,[kind==='background'?'profileBackgroundId':'profileBorderId']:id}})},
 '../core/profile-icons':{profileIconCollection:profiles,selectProfileIcon:(state,id)=>({...state,character:{...state.character,profileIconId:id}})},
 '../theme/profile-background-assets':{profileBackgroundPreviewById:new Map()},'../theme/profile-border-assets':{profileBorderSourceById:new Map()},
 '../theme/pet-art':{petArtSource:()=>undefined},
 '../core/live-events':{activeLiveEvent:state=>state.activeEvent?{definition:{visualKey:state.activeEvent}}:undefined},
 '../theme/ThemeContext':{useGameTheme:()=>colors},'../theme/theme':{radii:{md:10,lg:14},typography:{hero:{},title:{},caption:{},body:{},bodyStrong:{}}},
};
const moduleExports={};
const source=fs.readFileSync(path.join(__dirname,'../src/screens/CollectionsScreen.tsx'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,{exports:moduleExports,require:name=>{assert.ok(modules[name],`Unexpected import ${name}`);return modules[name];}});
const {CollectionsScreen}=moduleExports;
let renderer,changed;
let state={character:{classId:'IRONWARDEN',profileIconId:'class:IRONWARDEN'},settings:{textScale:1,reduceMotion:true}};
const update=()=>renderer.update(React.createElement(CollectionsScreen,{state,onChange:next=>{changed=next;state=next;update();}}));
const list=()=>renderer.root.findByType('FlatList');
const press=label=>renderer.root.findAllByType('Pressable').find(node=>node.props.accessibilityLabel===label);
const button=title=>renderer.root.findAllByType('GameButton').find(node=>node.props.title===title);
const tap=async label=>{const target=press(label);assert.ok(target,label);await act(()=>target.props.onPress());};
(async()=>{
 await act(()=>{renderer=create(React.createElement(CollectionsScreen,{state,onChange:next=>{changed=next;state=next;update();}}));});
 assert.equal(list().props.numColumns,2);
 assert.deepEqual(list().props.data.map(row=>row.id),['class:IRONWARDEN','ranger','knight']);
 assert.ok(press('Pets'),'Pets tab must be reachable from the Collections header');
 const originalList=list();
 await tap('Hooded Ranger, Owned');
 assert.equal(renderer.root.findByType('GameModalSurface').props.presentation,'sheet');
 assert.equal(renderer.root.findByType('GameModalSurface').props.reduceMotion,true);
 assert.equal(list(),originalList,'opening details must keep the list mounted');
 await act(()=>button('Use profile icon').props.onPress());
 assert.equal(changed.character.profileIconId,'ranger');
 assert.equal(renderer.root.findAllByType('GameModalSurface').length,0);
 assert.ok(press('Currently equipped: Hooded Ranger'));
 await tap('Fallen Knight, Locked');
 assert.equal(button('Locked').props.disabled,true);
 const before=changed;
 await act(()=>button('Locked').props.onPress());
 assert.equal(changed,before,'guard locked selection even if handler is invoked');
 await act(()=>renderer.root.findByType('GameModalSurface').props.onClose());
 assert.equal(list(),originalList,'closing details must keep the list mounted');
 await tap('Locked');assert.deepEqual(list().props.data.map(row=>row.id),['knight']);
 await tap('All');await tap('Search collection');
 await act(()=>renderer.root.findByType('GameTextInput').props.onChangeText('ranger'));
 assert.deepEqual(list().props.data.map(row=>row.id),['ranger']);
 await tap('Search collection');assert.deepEqual(list().props.data.map(row=>row.id),['ranger']);
 await tap('Backgrounds');
 assert.deepEqual(list().props.data.map(row=>row.id),['forest','earned-event'],'earned event art persists; future rewards hidden');
 state={...state,activeEvent:'veilbreak'};await act(update);
 assert.equal(list().props.data.length,3,'active event rewards visible while locked');
 await tap('All sources source');await tap('Starter source');
 assert.deepEqual(list().props.data.map(row=>row.id),['forest']);
 await tap('Icons');assert.equal(list().props.data.length,3,'category changes clear filters');
 await tap('Search collection');
 await act(()=>renderer.root.findByType('GameTextInput').props.onChangeText('nonexistent'));
 assert.equal(list().props.data.length,0);await act(()=>button('Clear filters').props.onPress());assert.equal(list().props.data.length,3);
 fontScale=1.4;await act(update);assert.equal(list().props.numColumns,1);
 fontScale=1;state={...state,settings:{...state.settings,textScale:1.3}};await act(update);assert.equal(list().props.numColumns,1);
 await act(()=>renderer.unmount());
 await act(()=>{renderer=create(React.createElement(CollectionsScreen,{state,onChange:()=>{},initialCategory:'pet'}));});
 assert.equal(list().props.data[0].kind,'pet','Pet category is a first-class tab');
 await act(()=>renderer.unmount());
 console.log('PASS: Collector journal filters, sheet lifecycle, equip guards, event visibility and responsive columns');
})().catch(error=>{console.error(error);process.exitCode=1;});
