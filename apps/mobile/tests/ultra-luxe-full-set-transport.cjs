const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'../../..'),core=path.join(repo,'apps/mobile/src/core'),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const mod={exports:{}};cache.set(file,mod.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 assert(!code.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error),file);
 new Function('exports','module','require',code.outputText)(mod.exports,mod,id=>load(path.resolve(path.dirname(file),id+'.ts')));return mod.exports;
}
const nameReadback=load(path.join(repo,'apps/mobile/src/online/ultra-luxe-name-readback.ts'));
const command=load(path.join(core,'ultra-luxe-full-set-command.ts')),m=load(path.join(core,'ultra-luxe-full-set-name.ts')),server=load(path.join(repo,'backend/online/ultra-luxe-full-set-command.ts')),r=load(path.join(core,'online-game-repository.ts'));
const accountId='account-a',characterId='00000000-0000-4000-8000-000000000001',scope={accountId,characterId};
const before={icon:'old-icon',scene:'old-scene',frame:'old-frame',effect:'old-effect',pet:'old-pet',title:'old-title'};
const sql=fs.readFileSync(path.join(repo,'docs/roadmap/ultra-luxe-full-set-commit-candidate.sql'),'utf8');
(async()=>{
 for(const def of command.ULTRA_LUXE_FULL_SET_DEFINITIONS){
  const [id,scene,frame,pet,title]=def,preset=m.ultraLuxeFullSetNamePreset(id),stem=id.split('-')[1];
  assert(sql.includes("("+[...def,preset].map(v=>"'"+v+"'").join(',')+")"));
  const state={character:{id:characterId,profileIconId:'old-icon',profileTitle:before.title,gold:123,equipment:{weapon:'untouched'}},account:{unlockedProfileBackgroundIds:[scene],unlockedProfileBorderIds:[frame],unlockedCosmeticPetIds:[pet],unlockedTitleIds:['ascendant-'+stem+'-title']},settings:{reduceMotion:false}};
  const names={accountId,ownedIds:[preset],selectedId:null};
  assert.deepEqual(nameReadback.normalizeLuxeNameReadback({...names,ownedIds:[preset,preset,'unknown']},accountId,true),names);
  assert.equal(nameReadback.normalizeLuxeNameReadback({...names,selectedId:'unknown'},accountId,true),undefined);
  assert.equal(nameReadback.normalizeLuxeNameReadback({...names,selectedId:preset,ownedIds:[]},accountId,true),undefined);
  assert.equal(nameReadback.normalizeLuxeNameReadback(names,'other',true),undefined);
  assert.equal(nameReadback.normalizeLuxeNameReadback({...names,selectedId:preset},accountId,true).selectedId,preset);
  assert.equal(nameReadback.ownedLuxePickerPresets([preset],true).length,1);
  assert.equal(nameReadback.verifiedLuxeNameReadbackStyle({...names,selectedId:preset}).animation,'flow');
  if(!['ascendant-celestial-name','ascendant-draconic-name'].includes(preset))assert.equal(nameReadback.ownedLuxePickerPresets([preset],false).length,0);
  const plan=command.verifiedUltraLuxeFullSetPlan(state,scope,id,before,names);assert(plan);
  assert.equal(command.verifiedUltraLuxeFullSetPlan({...state,account:{...state.account,unlockedTitleIds:[]}},scope,id,before,names),null);
  assert.equal(command.verifiedUltraLuxeFullSetPlan(state,{...scope,accountId:'other'},id,before,names),null);
  const cmd=command.ultraLuxeFullSetCommand(plan),requestId=command.fullSetRequestId('game-1234567890123456789'),body={requestId,expectedVersion:7,command:cmd};
  let calls=[],replayed=false;
  const services={enabled:true,hash:async s=>crypto.createHash('sha256').update(s).digest('hex'),rpc:async(name,args)=>{
   calls.push(name);
   assert.equal(args.p_account_id,accountId);
   if(name==='load_online_game_ultra_luxe_v1')return {state,version:7,walletGold:123,serverNow:1,ultraLuxeCollectionIds:[id]};
   assert.equal(name,'commit_ultra_luxe_full_set_server_v1');
   assert.equal(args.p_character_id,characterId);assert.equal(args.p_collection_id,id);assert.equal(args.p_expected_version,7);
   assert.equal(args.p_expected_name_id,null);assert.equal(args.p_expected_gold,123);assert.equal(args.p_request_id,requestId);
   assert.match(args.p_request_hash,/^[a-f0-9]{64}$/);
   const p=args.p_response,hero=p.state.character;
   assert.deepEqual(hero.equipment,state.character.equipment);assert.equal(hero.gold,123);assert.equal(hero.profileIconId,'old-icon');
   assert.equal(hero.profileBackgroundId,scene);assert.equal(hero.profileBorderId,frame);assert.equal(hero.selectedCosmeticPetId,pet);assert.equal(hero.profileTitle,title);assert.equal(hero.profileEffectId,undefined);
   return {replayed,gameplay:replayed?{state:p.state,version:8,serverNow:1}:p,nameSelection:{accountId,ownedIds:[preset],selectedId:preset},undoEquipRequestId:requestId};
  }};
  await assert.rejects(server.executeUltraLuxeFullSetCommand({...services,enabled:false},accountId,body),/feature_not_released/);
  await assert.rejects(server.executeUltraLuxeFullSetCommand(services,'',body),/auth_required/);
  for(const bad of [{...body,accountId:'other'},{...body,requestId:'ordinary-request-123'},{...body,command:{...cmd,args:{...cmd.args,colors:['#FFFFFF']}}},{...body,command:{...cmd,args:{...cmd.args,expectedNameId:'spoofed'}}},{...body,command:{...cmd,args:{...cmd.args,collectionId:'unknown'}}}]){
   await assert.rejects(server.executeUltraLuxeFullSetCommand(services,accountId,bad),/invalid_full_set/);
  }
  assert.equal(calls.length,0);
  const result=await server.executeUltraLuxeFullSetCommand(services,accountId,body);
  assert.equal(result.undoEquipRequestId,requestId);
  assert.equal(m.confirmUltraLuxeFullSetReadback(plan,scope,result),'confirmed');
  replayed=true;
  const replay=await server.executeUltraLuxeFullSetCommand(services,accountId,body);
  assert.equal(replay.gameplay.accountId,accountId);assert.equal(m.confirmUltraLuxeFullSetReadback(plan,scope,replay),'confirmed');
  assert.equal(state.character.profileTitle,before.title);
  // Durable queue keeps the same ID after ambiguous network failure.
  let pending=null,sends=[],fail=true;
  const online=new r.OnlineGameRepository(accountId,{read:async()=>({accountId,state,version:7,serverNow:1}),send:async request=>{
   sends.push(request.requestId);if(fail){fail=false;throw Error('timeout');}
   return {...result.gameplay,ultraLuxeNameSelection:result.nameSelection,ultraLuxeFullSetReplayed:true};
  }},{read:async()=>pending,write:async v=>{pending=v;}},()=> 'game-1234567890123456789');
  await assert.rejects(online.execute(cmd),/timeout/);assert(pending);assert.equal(pending.requestId,requestId);
  const recovered=await online.execute(cmd);assert.deepEqual(sends,[requestId,requestId]);assert.equal(pending,null);
  assert.equal(recovered.ultraLuxeNameSelection.selectedId,preset);
 }
 const panel=fs.readFileSync(path.join(repo,'apps/mobile/src/components/profile/ProfileLookPanel.tsx'),'utf8');
 assert(panel.includes('fullSetPort.apply(plan)'));assert(panel.includes('confirmUltraLuxeFullSetReadback(plan'));
 assert(panel.includes('ultraLuxeFullSetEquipped(selection,choice.patch'));
 const hook=fs.readFileSync(path.join(repo,'apps/mobile/src/online/useOnlineGame.ts'),'utf8');
 assert(hook.includes("EXPO_PUBLIC_ULTRA_LUXE_FULL_SET==='true'"));assert(hook.includes('invalidatePlayerIdentity(repo.accountId)'));
 const root=fs.readFileSync(path.join(repo,'apps/mobile/App.tsx'),'utf8'),custom=fs.readFileSync(path.join(repo,'apps/mobile/src/screens/ProfileCustomizeScreen.tsx'),'utf8');
 assert(root.includes('onEquipUltraLuxe={online.equipUltraLuxeFullSet}'));
 assert(custom.includes('verifiedNames.projection'));assert(custom.includes('fullSetEnabled={!!onEquipUltraLuxe||!!fullSetPort}'));
 assert(panel.includes('if(fullSetEnabled&&!fullSetPort&&ultraLuxeFullSetNamePreset(setId))return;'));
 const route=fs.readFileSync(path.join(repo,'backend/online/gameplay.ts'),'utf8');
 assert(route.includes('privateGrants&&services.ultraLuxeFullSetAuthority===true'));
 assert(route.indexOf('executeUltraLuxeFullSetCommand({enabled:fullSetAuthority')<route.indexOf('command=validateGameCommand(body.command)'));
 assert(route.includes("if(body.requestId.startsWith(ULTRA_LUXE_REQUEST_PREFIX))throw new GameplayError('invalid_request')"));
 const edge=fs.readFileSync(path.join(repo,'backend/online/edge.ts'),'utf8');
 assert(edge.includes("Deno.env.get('ULTRA_LUXE_FULL_SET_AUTHORITY')==='true'"));
 console.log('Six combined equip route and durable recovery mocks passed; closed feature gate, verified name readback and root/route source checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});

const undo=load(path.join(core,'ultra-luxe-full-set-undo-command.ts'));
(async()=>{
 const receipt=command.fullSetRequestId('game-1234567890123456789');
 const cmd=undo.fullSetUndoCommand(scope,receipt),id=undo.fullSetUndoRequestId('game-1234567890123456789');
 assert.deepEqual(cmd,{type:'ultra_luxe_full_set_undo',args:{characterId,equipRequestId:receipt}});
 for(const bad of ['other','luxe_undo_set_1234567890123456789',null])assert.throws(()=>undo.fullSetUndoCommand(scope,bad));
 assert.throws(()=>undo.fullSetUndoCommand({...scope,accountId:''},receipt));
 const state={character:{id:characterId},account:{}};
 let pending=null,attempts=[],fail=true;
 const online=new r.OnlineGameRepository(accountId,{read:async()=>({accountId,state,version:8,serverNow:1}),send:async request=>{
  attempts.push(request.requestId);if(fail){fail=false;throw Error('timeout');}
  return {accountId,state,version:9,serverNow:1,ultraLuxeNameSelection:{accountId,ownedIds:[],selectedId:null},ultraLuxeFullSetReplayed:true};
 }},{read:async()=>pending,write:async v=>{pending=v;}},()=> 'game-1234567890123456789');
 await assert.rejects(online.execute(cmd),/timeout/);assert.equal(pending.requestId,id);
 const recovered=await online.execute(cmd);assert.deepEqual(attempts,[id,id]);assert.equal(pending,null);
 assert.equal(recovered.ultraLuxeNameSelection.selectedId,null);
 const panel=fs.readFileSync(path.join(repo,'apps/mobile/src/components/profile/ProfileLookPanel.tsx'),'utf8');
 assert(panel.includes('next.ultraLuxeUndoEquipRequestId')&&panel.includes('void undo({accountId:owner,characterId},equipRequestId)'));
 const transport=fs.readFileSync(path.join(repo,'apps/mobile/src/online/gameplay.ts'),'utf8');
 assert(transport.includes('payload.undoEquipRequestId===body.requestId'));
 console.log('PASS: receipt-only undo client and durable same-ID retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
