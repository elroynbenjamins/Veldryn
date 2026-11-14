const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
const mobile=path.resolve(__dirname,'..');
const root=path.resolve(mobile,'../..');
require.extensions['.ts']=function(mod,filename){
 const transpiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(transpiled,filename);
};
const {
 germanPartyEventTemplates,germanPartyEventTags,germanPartyEventRankReasons,
 partyEventDisplayCopy,partyEventTagText,partyEventRankReasonText,
}=require('../src/i18n/party-event-content-de.ts');
const src=fs.readFileSync(path.join(root,'backend/src/server/liveops/event-definitions.ts'),'utf8');
const definitions=[...src.matchAll(/id: '(party_event_[^']+)', version: 1, scope: 'party', name: '([^']+)',\s*shortDescription: '([^']+)'/g)]
 .map(([,id,name,description])=>({id,name,description}));
assert.equal(definitions.length,5,'Party Event source template pool changed');
assert.deepEqual(Object.keys(germanPartyEventTemplates).sort(),definitions.map(x=>x.name).sort(),
 'German Party Event templates must match authored names');
for(const {id,name,description} of definitions){
 const entry=germanPartyEventTemplates[name];
 assert.equal(entry[0],description,'Source changed without German update: '+id);
 assert.ok(entry[1]!==name&&entry[1].length>4,'Event name still English: '+id);
 assert.ok(entry[2]!==description&&entry[2].length>25,'Event description still English: '+id);
 assert.deepEqual(partyEventDisplayCopy('de',name,description),{
  name:entry[1],shortDescription:entry[2]
 });
 for(const language of ['en','es','nl','it','fr','ru','tr']){
  assert.deepEqual(partyEventDisplayCopy(language,name,description),{name,shortDescription:description},
   'Unexpected other-language change: '+id);
 }
 assert.deepEqual(partyEventDisplayCopy('de',name,'Edited by event admin $&'),{
  name,shortDescription:'Edited by event admin $&'
 },'Updated source must not receive stale text: '+id);
}
assert.deepEqual(partyEventDisplayCopy('de','Player party $&','Player-provided description'),{
 name:'Player party $&',shortDescription:'Player-provided description',
});
const eventSourceTags=[...new Set([...src.matchAll(/eventTags: \[([^\]]+)\]/g)]
 .flatMap(([,tags])=>[...tags.matchAll(/'([^']+)'/g)].map(([,tag])=>tag)))];
assert.equal(eventSourceTags.length,9,'Authored Party Event tags changed');
assert.deepEqual(Object.keys(germanPartyEventTags).sort(),eventSourceTags.sort(),
 'German tags must cover every authored Party Event tag');
for(const [tag,german] of Object.entries(germanPartyEventTags)){
 assert.equal(partyEventTagText('de','Rift Surge',germanPartyEventTemplates['Rift Surge'][0],tag),german);
 assert.equal(partyEventTagText('de','Rift Surge','Altered source',tag),tag.replace(/_/g,' '));
 assert.equal(partyEventTagText('en','Rift Surge',germanPartyEventTemplates['Rift Surge'][0],tag),tag.replace(/_/g,' '));
}
assert.equal(partyEventTagText('de','Rift Surge',germanPartyEventTemplates['Rift Surge'][0],'new_tag'),'new tag');
const rules=fs.readFileSync(path.join(root,'backend/src/server/liveops/party-events.ts'),'utf8');
assert.ok(rules.includes("missing.push('party_points')"));
assert.ok(rules.includes("missing.push('meaningful_contributors')"));
assert.ok(rules.includes("missing.push(\`minimum_\${category}_share\`)"));
assert.deepEqual(Object.keys(germanPartyEventRankReasons).sort(),[
 'party_points','meaningful_contributors','minimum_combat_share','minimum_skilling_share'
].sort());
for(const [reason,german] of Object.entries(germanPartyEventRankReasons)){
 assert.ok(german!==reason&&german.length>8);
 assert.equal(partyEventRankReasonText('de',reason),german);
 for(const language of ['en','es','nl','it','fr','ru','tr'])
  assert.equal(partyEventRankReasonText(language,reason),reason.replace(/_/g,' '));
}
assert.equal(partyEventRankReasonText('de','new_server_reason'),'new server reason');
const hub=fs.readFileSync(path.join(mobile,'src/components/PartyEventHubPanel.tsx'),'utf8');
for(const marker of [
 'partyEventDisplayCopy(language,event.name,event.shortDescription)',
 '{eventCopy?.name}', '{eventCopy?.shortDescription}',
 'partyEventTagText(language,event.name,event.shortDescription,tag)',
 'event.rankedEligibilityMissing.map(x=>partyEventRankReasonText(language,x))',
])assert.ok(hub.includes(marker),'Party Event German UI wiring missing: '+marker);
assert.ok(hub.includes('{event.partyName??ui('),'Player party names must remain unchanged');
console.log('PASS: 5 authored Party Event templates, 9 tags, 4 ranking reasons, strict source/locale guards and screen wiring');
