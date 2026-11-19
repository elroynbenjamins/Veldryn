const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=path=>fs.readFileSync(path,'utf8');
const panel=read('src/components/OnlineAccountDeletionPanel.tsx');
const api=read('src/online/account-deletion.ts');
const settings=read('src/screens/SettingsScreen.tsx');
const flags=read('src/core/release-flags.ts');
const sql=read('../../backend/supabase/migrations/20261119183000_online_account_deletion_requests_v1.sql');
const translation=read('src/i18n/account-deletion.ts');

for(const path of [
 'src/components/OnlineAccountDeletionPanel.tsx',
 'src/online/account-deletion.ts',
 'src/screens/SettingsScreen.tsx',
 'src/core/release-flags.ts',
]){
 const tree=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.deepEqual(tree.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],path+' must parse');
}

assert.match(flags,/ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED=false/,'Request intake stays disabled until staging approval');
assert.ok(settings.includes("{online&&<OnlineAccountDeletionPanel language={language}/>}")&&settings.includes('Delete local save'),'Online account deletion is separate from local save and character removal');
assert.ok(panel.includes('is_anonymous')&&panel.includes('Privacy & deletion support'),'Guest/signed-out visitors get a non-destructive support route');
for(const lang of ['de','es','nl','it','fr','ru','tr'])assert.ok(translation.includes(lang+':'),'Deletion-support copy needs the '+lang+' locale');
assert.ok(panel.includes('accountDeletionText(language,value)'),'Public deletion support must use translated copy');
assert.ok(panel.includes("validAccountDeletionConfirmation(confirmation)")&&panel.includes('maxLength={40}'),'Submit requires deliberate keyboard-accessible typed confirmation');
assert.ok(panel.includes('requestOnlineAccountDeletion(')&&panel.includes('cancelOnlineAccountDeletionRequest('),'Owner may submit and withdraw the intake request');
assert.ok(panel.includes("Submitting a request does not delete your account immediately."),'UI may not promise instant erasure');
assert.ok(api.includes("row.erasureCompleted!==false")&&api.includes("getUser(data.session.access_token)"),'The client verifies owner and never accepts a response claiming erasure');
assert.ok(api.includes('Crypto.randomUUID()')&&api.includes('p_expected_account_id:accountId'),'Every request uses a random request ID and checks the displayed owner against the active Auth subject');
assert.equal(sql.split("p_expected_account_id is distinct from v_actor").length-1,3,'Submit, status and cancel must all reject cross-account UI races');
assert.ok(!api.includes('admin.deleteUser(')&&!panel.includes('admin.deleteUser('),'Client cannot delete Supabase Auth users');
assert.match(sql,/alter table private\.online_account_deletion_requests_v1 enable row level security/i);
assert.match(sql,/revoke all on table private\.online_account_deletion_requests_v1 from public, anon, authenticated/i);
assert.match(sql,/auth\.sessions s[\s\S]{0,130}where s\.id=v_session_text::uuid and s\.user_id=v_actor/i);
assert.match(sql,/auth\.users u where u\.id=v_actor and u\.is_anonymous is false/i);
assert.match(sql,/p_confirmation is distinct from 'DELETE ACCOUNT'/i);
assert.match(sql,/p_confirmation is distinct from 'KEEP ACCOUNT'/i);
assert.match(sql,/on conflict\(account_id\) do update/i);
assert.match(sql,/grant execute on function public\.submit_online_account_deletion_request_v1\(uuid,text,uuid\) to authenticated/i);
assert.ok(!sql.includes('delete from auth.users')&&!sql.includes('admin.deleteUser'),'Request-only migration cannot erase an account');

console.log('PASS account deletion intake: unreleased gate, independent UI, typed confirmation, owner/active-session guards, no destructive Auth operations');
