const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(mobile,file),'utf8');
const roster=read('src/screens/ActivityOverviewScreen.tsx');
const rules=read('src/core/account-roster.ts');
const copy=read('src/i18n/character-roster.ts');

test('compact roster clearly separates selected character and active work',()=>{
 assert.match(roster,/r\('Currently playing'\)/);
 assert.match(roster,/r\('Character roster'\)/);
 assert.match(roster,/workingCount=entries\.filter\(entry=>!!entry\.activity\)\.length/);
 assert.match(roster,/const active=character\.id===state\.character\?\.id/);
 assert.match(roster,/ProfileIcon id=\{character\.profileIconId\} classId=\{character\.classId\}/);
 assert.match(roster,/classDef\?\.name\?\?character\.classId/);
 assert.match(roster,/accountDuration\(language,\(now-activity\.startedAtMs\)\/1000\)/);
});

test('slot progress and create availability use authoritative 800/3-role rules',()=>{
 assert.match(rules,/CHARACTER_SLOT_THRESHOLDS=\[0,250,800\]/);
 assert.match(roster,/const nextThreshold=slots<MAX_NEW_ACCOUNT_CHARACTERS\?CHARACTER_SLOT_THRESHOLDS\[slots\]:undefined/);
 assert.match(roster,/entries\.length<MAX_NEW_ACCOUNT_CHARACTERS&&entries\.length<slots/);
 assert.match(roster,/const visibleSlots=legacy\?slots:Math\.min\(slots,MAX_NEW_ACCOUNT_CHARACTERS\)/);
 assert.match(roster,/Legacy roster preserved/);
 assert.match(roster,/const roles:AccountCharacterRole\[\]=\['Tank','Damage','Support'\]/);
 assert.match(roster,/accessibilityRole="progressbar"/);
 assert.doesNotMatch(roster,/All 5 character slots are permanently unlocked\./);
});

test('manageable controls remain touch-friendly and deletion is behind a second action',()=>{
 assert.match(roster,/manageButton:\{minWidth:44,minHeight:44/);
 assert.match(roster,/accessibilityLabel=\{a\('Manage'\)\+': '\+character\.name\}/);
 assert.match(roster,/accessibilityLabel=\{a\('Switch'\)\+': '\+character\.name\}/);
 assert.match(roster,/!showDeleteOptions\?<View style=\{s\.manageOverview\}>/);
 assert.match(roster,/setShowDeleteOptions\(true\)/);
 assert.match(roster,/disabled=\{!onDelete\|\|!confirmed\|\|!!blockReason\|\|busy\}/);
 assert.match(roster,/characterDeleteBlockReason\(state,target\.character\.id\)/);
 assert.match(roster,/equipmentCraftingQueue\(state\)/);
 assert.match(roster,/keyboardShouldPersistTaps="handled"/);
 assert.match(roster,/modalScrollRef\.current\?\.scrollToEnd/);
 assert.match(roster,/onDelete\(target\.character\.id,confirmation\)/);
});

test('narrow screen and larger fonts preserve readable activities',()=>{
 assert.match(roster,/width<390\|\|fontScale>=1\.25\|\|state\.settings\.textScale>=1\.25/);
 assert.match(roster,/activityRowStack:\{flexWrap:'wrap'\}/);
 assert.match(roster,/characterRowStack:\{alignItems:'stretch',flexDirection:'column'\}/);
});

test('new roster copy is localized in all eight languages',()=>{
 for(const label of ['Currently playing','Character roster','Role slots','Review deletion options','Legacy roster preserved','Tank','Damage','Support']){
  const start=copy.indexOf("'"+label+"':{");
  assert.ok(start>=0,'Missing row '+label);
  const row=copy.slice(start,copy.indexOf('},',start)+2);
  for(const language of ['en','de','es','nl','it','fr','ru','tr'])assert.ok(row.includes(language+':'),'Missing '+language+' for '+label);
 }
});

test('roster keeps server-confirmed selection, shows pending switch and prevents cross-card duplicate taps',async()=>{
 const React=require('react'),{act,create}=require('react-test-renderer'),ts=require('typescript'),vm=require('node:vm');
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const app=read('App.tsx');
 assert.match(app,/onSwitch=\{async id=>\{if\(serverGameplayEnabled\)\{await perform\(\{type:'roster_switch'/);
 let release,fail,calls=[],sessionReads=0,rosterReads=0;
 const pending=()=>new Promise((resolve,reject)=>{release=resolve;fail=reject;});
 let request=pending();
 const client={auth:{getSession:async()=>{sessionReads++;return {data:{session:{user:{id:'account'}}},error:null};},getUser:()=>{throw Error('Roster must not make a separate remote auth request');}},from:()=>{rosterReads++;const query={select:()=>query,eq:()=>query,order:()=>query,then:resolve=>resolve({data:[{id:'hat'},{id:'stone'},{id:'third'}],error:null})};return query;}};
 const label=(_,text)=>text;
 const native={View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Keyboard:{dismiss(){},addListener:()=>({remove(){}})},Platform:{OS:'android'},StyleSheet:{create:s=>s},useWindowDimensions:()=>({width:420,fontScale:1})};
 const mocks={
  react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':native,
  '../i18n/account':{accountText:label,accountError:label,accountDuration:()=>''},
  '../i18n/character-roster':{characterRosterText:label},
  '../components/GameButton':{GameButton:'GameButton'},'../components/GameTextInput':{GameTextInput:'GameTextInput'},
  '../components/GameModalSurface':{GameModalHeader:'GameModalHeader',GameModalSurface:({visible,children})=>visible?children:null},
  '../components/ProfileIcon':{ProfileIcon:'ProfileIcon'},
  './character-roster-order':{orderedCharacterRoster:state=>[{character:state.character},...state.otherCharacters]},
  '../online/gameplay':{serverGameplayEnabled:true},'../online/supabase':{supabase:client},
  '../content/classes':{CLASSES:[]},'../core/account-actions':{characterDeleteBlockReason:()=>undefined,characterDeleteConfirmation:()=>''},
  '../core/activity-target-label':{activityTargetLabel:()=>''},
  '../core/account-roster':{accountSkillLevel:()=>800,CHARACTER_SLOT_THRESHOLDS:[0,250,800],MAX_NEW_ACCOUNT_CHARACTERS:3,occupiedCharacterRoles:()=>[],unlockedCharacterSlots:()=>3},
  '../core/equipment-crafting-queue':{equipmentCraftingQueue:()=>[]},
  '../theme/theme':{spacing:{},typography:{},equipmentTheme:()=>({})},'../theme/ThemeContext':{useGameTheme:()=>({})},
 };
 const module={exports:{}};
 const js=ts.transpileModule(roster,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,require:name=>{if(name in mocks)return mocks[name];throw Error('Unexpected import '+name);},Promise,Error});
 const Screen=module.exports.ActivityOverviewScreen;
 const character=id=>({id,name:id,classId:'tank',level:19});
 const hat=character('hat'),stone=character('stone'),third=character('third');
 const state={character:hat,otherCharacters:[{character:stone,activity:null},{character:third,activity:null}],activity:null,settings:{language:'en',textScale:1}};
 const props={state,accountId:'account',now:0,onSwitch:id=>{calls.push(id);return request;}};
 let renderer;
 try{
  await act(async()=>{renderer=create(React.createElement(Screen,props));});
  assert.equal(sessionReads,1);assert.equal(rosterReads,1);
  const button=id=>renderer.root.findAllByType('GameButton').find(node=>node.props.accessibilityLabel==='Switch: '+id);
  let first;
  await act(async()=>{first=button('stone').props.onPress();await button('third').props.onPress();});
  assert.deepEqual(calls,['stone']);assert.equal(button('stone').props.loading,true);assert.equal(button('third').props.disabled,true);
  assert.ok(renderer.root.findAllByType('View').some(node=>node.props.accessibilityLabel==='Currently playing: hat'));
  await act(async()=>{release();await first;});
  assert.equal(button('stone').props.loading,false);
  request=pending();
  let second;await act(async()=>{second=button('stone').props.onPress();});
  await act(async()=>{fail(Error('offline'));await second;});
  assert.equal(button('stone').props.disabled,false,'A failed switch must release every roster action');
  assert.equal(button('stone').props.loading,false);
  await act(async()=>{renderer.update(React.createElement(Screen,{...props,state:{...state,character:stone,otherCharacters:[{character:hat,activity:null},{character:third,activity:null}]}}));});
  assert.equal(sessionReads,1,'Switching within the same roster must not repeat the ordering read');
  assert.equal(rosterReads,1);
  assert.ok(renderer.root.findAllByType('View').some(node=>node.props.accessibilityLabel==='Currently playing: stone'));
 }finally{if(renderer)await act(async()=>renderer.unmount());}
});
