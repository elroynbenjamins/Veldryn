// Exercise the actual build metadata and update gate with native/network fakes.
// This verifies version selection; it does not compile or run a native binary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(path.join(root,'apps/mobile/package.json'));
const ts=require('typescript');
const appConfig=JSON.parse(fs.readFileSync(path.join(root,'apps/mobile/app.json'),'utf8'));

function load(relative,imports,env={}){
  const source=fs.readFileSync(path.join(root,relative),'utf8');
  const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}});
  const module={exports:{}};
  new Function('require','module','exports','process',outputText)(name=>{
    if(!(name in imports))throw new Error(`Unexpected build metadata dependency: ${name}`);
    return imports[name];
  },module,module.exports,{env});
  return module.exports;
}

function build(native={},env={},config=appConfig,source={BUILD_SOURCE_COMMIT:null,BUILD_SOURCE_BUILD_ID:null}){
  return load('apps/mobile/src/app-build.ts',{
    'expo-application':{applicationId:null,nativeApplicationVersion:null,nativeBuildVersion:null,...native},
    '../app.json':config,
    './build-source.generated':source,
  },env).APP_BUILD_INFO;
}

function gate(info,{platform='android',row=null,legacyRow=null,connected=true}={}){
  const reads=[];
  const supabase={from(table){
    assert.equal(table,'app_release_policy');
    let filter;
    const query={
      select(){return query;},
      eq(column,value){filter={column,value};reads.push(filter);return query;},
      async maybeSingle(){return {data:filter.column==='platform'?row:legacyRow,error:null};},
    };
    return query;
  }};
  return {...load('apps/mobile/src/online/app-version-gate.ts',{
    'react-native':{Platform:{OS:platform},Linking:{openURL:async()=>{throw new Error('Version reads must not open the store');}}},
    './supabase':{supabase:connected?supabase:null},
    '../app-build':{APP_BUILD_INFO:info},
  }),reads};
}

const nativeInfo=build({applicationId:appConfig.expo.android.package,nativeApplicationVersion:' 2.4.0 ',nativeBuildVersion:' 142 '},{EXPO_PUBLIC_APP_VERSION:'0.1.0',EXPO_PUBLIC_RELEASE_CHANNEL:' preview '});
assert.deepEqual(nativeInfo,{version:'2.4.0',buildNumber:'142',releaseChannel:'preview',sourceCommit:null,easBuildId:null});
console.log('PASS native app metadata wins over a stale build environment version');

const iosConfig={expo:{...appConfig.expo,ios:{...appConfig.expo.ios,bundleIdentifier:'com.veldryn.ios.test'}}};
assert.deepEqual(build({applicationId:iosConfig.expo.ios.bundleIdentifier,nativeApplicationVersion:'2.5.0',nativeBuildVersion:'8.2'}, {},iosConfig),{version:'2.5.0',buildNumber:'8.2',releaseChannel:'production',sourceCommit:null,easBuildId:null});
const updatedConfig={expo:{...appConfig.expo,version:'3.1.0'}};
for(const applicationId of [null,'host.exp.exponent','host.exp.Exponent',`${appConfig.expo.android.package}.unrelated`]){
  assert.deepEqual(build({applicationId,nativeApplicationVersion:'99.0.0',nativeBuildVersion:'9999'},{EXPO_PUBLIC_APP_VERSION:'0.0.1'},updatedConfig),{version:'3.1.0',buildNumber:null,releaseChannel:'production',sourceCommit:null,easBuildId:null});
}
assert.deepEqual(build({applicationId:appConfig.expo.android.package,nativeApplicationVersion:' ',nativeBuildVersion:' '},{EXPO_PUBLIC_RELEASE_CHANNEL:' '}),{version:appConfig.expo.version,buildNumber:null,releaseChannel:'production',sourceCommit:null,easBuildId:null});
console.log('PASS iOS identity, web/Expo Go fallback, missing native values and exact app identity');

const normalGate=gate(nativeInfo,{row:{latest_version:'2.5.0',minimum_version:'2.3.0'}});
const normal=await normalGate.fetchAppVersionGate();
assert.equal(normal.currentVersion,'2.4.0');
assert.equal(normal.updateRequired,false);
assert.equal(normal.updateAvailable,true);
assert.deepEqual(normalGate.reads,[{column:'platform',value:'android'}]);
const required=await gate({...nativeInfo,buildNumber:'99999'},{row:{latest_version:'2.5.0',minimum_version:'2.5.0'}}).fetchAppVersionGate();
assert.equal(required.updateRequired,true,'a high native build code must not replace the semantic app version');
console.log('PASS the update gate shares the installed semantic version, independently of build code');

const legacyGate=gate(nativeInfo,{legacyRow:{latest_version:'2.5.0',minimum_version:'2.3.0',update_title:'Update preview',update_message:'A preview update is available'}});
const legacy=await legacyGate.fetchAppVersionGate();
assert.equal(legacy.policy.title,'Update preview');
assert.equal(legacy.currentVersion,nativeInfo.version);
assert.deepEqual(legacyGate.reads,[{column:'platform',value:'android'},{column:'channel',value:'preview'}]);
const offline=await gate(build(),{connected:false}).fetchAppVersionGate();
assert.deepEqual(offline,{currentVersion:appConfig.expo.version,policy:null,updateRequired:false,updateAvailable:false,maintenanceMode:false});
console.log('PASS legacy release-channel policies and unavailable online configuration');

const translator=load('apps/mobile/src/i18n/translator.ts',{});
const {SUPPORTED_LANGUAGES}=load('apps/mobile/src/i18n/languages.ts',{});
const {appBuildCatalogs,appBuildText}=load('apps/mobile/src/i18n/app-build.ts',{'./translator':translator});
const fingerprint=build({}, {}, appConfig,{BUILD_SOURCE_COMMIT:'abcdef1234567890',BUILD_SOURCE_BUILD_ID:'eas-build-1'});
assert.equal(fingerprint.sourceCommit,'abcdef1234567890');
assert.equal(fingerprint.easBuildId,'eas-build-1');
for(const language of SUPPORTED_LANGUAGES){
  for(const [key,param,value] of [['version','version','2.4.0'],['build','build','142'],['channel','channel','preview'],['source','source','abcdef1234567890']]){
    assert.equal(typeof appBuildCatalogs[language][key],'string');
    const text=appBuildText(language,key,{[param]:value});
    assert.ok(text.includes(value));
    assert.ok(!/\{[^}]+\}/.test(text));
  }
}
console.log('PASS build diagnostics are localized in all six supported languages');
