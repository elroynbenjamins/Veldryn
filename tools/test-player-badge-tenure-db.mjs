/** Actual single-badge/Supporter migration executed in disposable PostgreSQL.
 * No real account, Supabase project connection, network access or data write.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const backendRequire=createRequire(new URL('../backend/package.json',import.meta.url));
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE??backendRequire.resolve('@electric-sql/pglite')).href);
const db=new PGlite();
const fixture=readFileSync(new URL('../backend/supabase/tests/profile_badges_tenure_fixture.sql',import.meta.url),'utf8');
const migration=readFileSync(new URL('../backend/supabase/migrations/20261110153000_profile_badge_single_equip_supporter_tenure_v2.sql',import.meta.url),'utf8');
/** Applied on top of v2, exactly as production will: the worn badge keeps its v2 meaning
 * and the profile shelf becomes a separate ordered column of up to three. */
const shelfMigration=readFileSync(new URL('../backend/supabase/migrations/20261111113000_profile_badge_showcase_v3.sql',import.meta.url),'utf8');
/** Split on top-level semicolons, never within quoted PL/pgSQL. */
function statements(text){
 const out=[];let start=0,dollar=false,quote=false,lineComment=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i],next=text[i+1];
  if(lineComment){if(ch==='\n')lineComment=false;continue;}
  if(!dollar&&!quote&&ch==='-'&&next==='-'){lineComment=true;i++;continue;}
  if(!quote&&ch==='$'&&next==='$'){dollar=!dollar;i++;continue;}
  if(!dollar&&ch==="'"){
   if(quote&&next==="'"){i++;continue;}
   quote=!quote;continue;
  }
  if(!dollar&&!quote&&ch===';'){
   const part=text.slice(start,i+1).trim();if(part)out.push(part);
   start=i+1;
  }
 }
 const rest=text.slice(start).trim();
 if(rest&&!rest.startsWith('--'))throw Error('Unterminated statement: '+rest.slice(0,100));
 return out;
}
const a='00000000-0000-4000-8000-000000000001';
const b='00000000-0000-4000-8000-000000000002';
const c='00000000-0000-4000-8000-000000000003';
const first=async(q,args=[])=> (await db.query(q,args)).rows[0];
const signIn=async id=>void await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const self=async()=> (await first('select public.player_badge_self_v1() as data')).data;
const equipped=async id=> (await first('select public.update_player_equipped_badge_v2($1) as data',[id])).data;
const shelved=async ids=> (await first('select public.update_player_profile_badges_v3($1) as data',[ids])).data;
const expectDenied=async(fn,code)=>{
 let err;try{await fn();}catch(e){err=e;}
 assert.ok(err,'expected rejected badge: '+code);
 assert.match(err.message,new RegExp(code));
};
try{
 await db.exec(fixture);
 console.log('BADGE_SQL_FIXTURE_READY');
 let statementNumber=0;
 for(const statement of statements(migration)){
  statementNumber++;
  try{await db.exec(statement);}
  catch(error){console.error('BADGE_SQL_FAILED_STATEMENT_'+statementNumber+': '+statement.slice(0,180));throw error;}
 }
 console.log('BADGE_SQL_MIGRATION_PARSED statements='+statementNumber);
 let shelfStatement=0;
 for(const statement of statements(shelfMigration)){
  shelfStatement++;
  try{await db.exec(statement);}
  catch(error){console.error('BADGE_SHELF_SQL_FAILED_STATEMENT_'+shelfStatement+': '+statement.slice(0,180));throw error;}
 }
 console.log('BADGE_SHELF_SQL_MIGRATION_PARSED statements='+shelfStatement);
 const shelfAnon=await first("select has_function_privilege('anon','public.update_player_profile_badges_v3(text[])','execute') as granted");
 assert.equal(shelfAnon.granted,false,'anonymous users cannot write a profile shelf');
 const unseeded=await first('select count(*)::int as rows from private.player_badge_preferences_v1 where cardinality(profile_badge_ids)>0');
 assert.equal(unseeded.rows,0,'no shelf is seeded from the worn badge, which the name row already shows');
 const rls=await first("select relrowsecurity as enabled from pg_class where oid='private.supporter_badge_progress_v2'::regclass");
 assert.equal(rls.enabled,true,'tenure table is RLS protected');
 const anonGrant=await first("select has_function_privilege('anon','public.update_player_equipped_badge_v2(text)','execute') as granted");
 assert.equal(anonGrant.granted,false,'anonymous users cannot equip badges');

 await signIn(a);
 let p=await self();
 assert.equal(p.identity.staff,'admin');
 assert.equal(p.identity.equippedBadgeId,'founder','first previously featured badge preserved');
 assert.deepEqual(p.identity.extras,['founder'],'legacy two-badge selection is collapsed to one worn badge');
 assert.deepEqual(p.featuredExtras,[],'the profile shelf starts empty instead of echoing the worn badge');
 assert.equal(p.supporterAvailable,true);
 assert.equal(p.supporterTierMonths,1,'prepaid seven-month expiry is not earned continuous tenure');
 const legacy=await first('select featured_badge_ids as items from private.player_badge_preferences_v1 where account_id=$1',[a]);
 assert.deepEqual(legacy.items,['founder']);
 await expectDenied(()=>equipped('admin'),'INVALID_BADGE_SELECTION');
 await expectDenied(()=>equipped('supporter_3m'),'BADGE_NOT_OWNED');
 await expectDenied(()=>equipped('supporter_6m'),'BADGE_NOT_OWNED');
 await expectDenied(()=>equipped('supporter_12m'),'BADGE_NOT_OWNED');

 p=await equipped('supporter');
 assert.equal(p.identity.equippedBadgeId,'supporter');
 assert.equal(p.identity.staff,'admin','staff appears beside selected Supporter');
 assert.deepEqual(p.featuredExtras,[]);
 p=await equipped(null);
 assert.equal(p.identity.equippedBadgeId,null,'explicit None overrides legacy auto Supporter');
 assert.equal(p.identity.staff,'admin');

 await db.exec("update private.supporter_badge_progress_v2 set credited_seconds=extract(epoch from ((verified_since+interval '4 months')-verified_since)),last_checkpoint_at=now() where account_id='"+a+"'");
 p=await self();assert.equal(p.supporterTierMonths,3);
 p=await equipped('supporter_3m');assert.equal(p.identity.equippedBadgeId,'supporter_3m');
 await expectDenied(()=>equipped('supporter_6m'),'BADGE_NOT_OWNED');
 await db.exec("update private.supporter_badge_progress_v2 set credited_seconds=extract(epoch from ((verified_since+interval '7 months')-verified_since)),last_checkpoint_at=now() where account_id='"+a+"'");
 p=await equipped('supporter_6m');
 assert.equal(p.supporterTierMonths,6);
 assert.equal(p.identity.equippedBadgeId,'supporter_6m');

 await expectDenied(()=>equipped('supporter_12m'),'BADGE_NOT_OWNED');
 await db.exec("update private.supporter_badge_progress_v2 set credited_seconds=extract(epoch from ((verified_since+interval '13 months')-verified_since)),last_checkpoint_at=now() where account_id='"+a+"'");
 p=await equipped('supporter_12m');
 assert.equal(p.supporterTierMonths,12);
 assert.ok(p.supporterTotalDays>=365,'cumulative covered days are visible');

 p=(await first("select public.update_player_featured_badges_v1(array['beta_tester','founder']) as data")).data;
 assert.equal(p.identity.equippedBadgeId,'beta_tester');
 assert.deepEqual(p.identity.extras,['beta_tester'],'the legacy writer still sets exactly one worn badge');
 assert.deepEqual(p.featuredExtras,[],'a legacy writer never fills the profile shelf');
 await expectDenied(()=>equipped('event_champion'),'BADGE_NOT_OWNED');
 await expectDenied(()=>equipped('moderator'),'INVALID_BADGE_SELECTION');

 p=await equipped('supporter_12m');
 await db.exec("update private.account_commerce_entitlements_v1 set supporter_active=false where account_id='"+a+"'");
 p=await self();
 assert.equal(p.supporterTierMonths,0);
 assert.equal(p.identity.equippedBadgeId,null,'expired supporter tier disappears');
 assert.equal(p.identity.staff,'admin');
 await expectDenied(()=>equipped('supporter'),'BADGE_NOT_OWNED');
 await db.exec("update private.account_commerce_entitlements_v1 set supporter_active=true,supporter_expires_at=now()+interval '1 month' where account_id='"+a+"'");
 p=await self();
 assert.equal(p.supporterTierMonths,12,'rejoining preserves previously earned total months');
 assert.ok(p.supporterTotalDays>=365,'paused time does not wipe cumulative time');
 p=await equipped('supporter_12m');assert.equal(p.identity.equippedBadgeId,'supporter_12m');

 await signIn(b);
 p=await self();assert.equal(p.supporterTierMonths,1,'fresh 6m paid term does not grant 6m badge');
 await expectDenied(()=>equipped('supporter_6m'),'BADGE_NOT_OWNED');
 p=await equipped('veteran');
 assert.equal(p.identity.equippedBadgeId,'veteran');
 assert.equal(p.identity.supporter,false,'a collectible does not force the Supporter icon');
 assert.equal(p.supporterAvailable,true);
 // Old app's Show Supporter toggle still selects exactly one elective badge.
 p=(await first('select public.update_player_badge_preferences_v1(true) as data')).data;
 assert.equal(p.identity.equippedBadgeId,'supporter','legacy toggle on equips Supporter');
 p=(await first('select public.update_player_badge_preferences_v1(false) as data')).data;
 assert.equal(p.identity.equippedBadgeId,null,'legacy toggle off hides only Supporter');
 p=await equipped('veteran');
 assert.equal(p.identity.equippedBadgeId,'veteran');

 await signIn(c);
 p=await self();assert.equal(p.supporterAvailable,true);
 assert.equal(p.supporterTierMonths,1,'6m promo entitlement does not skip 6m elapsed time');
 await expectDenied(()=>equipped('supporter_3m'),'BADGE_NOT_OWNED');
 p=await equipped('supporter');assert.equal(p.identity.equippedBadgeId,'supporter');

 // The profile shelf: three of the player's choosing, independent of the worn badge.
 await signIn(a);
 p=await equipped('founder');
 assert.deepEqual(p.featuredExtras,[],'equipping a badge leaves the shelf alone');
 p=await shelved(['beta_tester','founder','supporter_12m']);
 assert.deepEqual(p.featuredExtras,['beta_tester','founder','supporter_12m'],'the shelf keeps the order it was given');
 assert.deepEqual(p.identity.featured,['beta_tester','founder','supporter_12m'],'other players read the same shelf off the public identity');
 assert.equal(p.identity.equippedBadgeId,'founder','writing a shelf never changes the badge worn beside the name');
 assert.deepEqual(p.identity.extras,['founder'],'the legacy one-badge field still mirrors the worn badge only');
 p=await equipped('beta_tester');
 assert.deepEqual(p.featuredExtras,['beta_tester','founder','supporter_12m'],'changing the worn badge never disturbs the shelf');

 await expectDenied(()=>shelved(['founder','beta_tester','supporter','supporter_3m']),'INVALID_BADGE_SELECTION');
 await expectDenied(()=>shelved(['founder','founder']),'INVALID_BADGE_SELECTION');
 await expectDenied(()=>shelved(['founder',null]),'INVALID_BADGE_SELECTION');
 await expectDenied(()=>shelved(['event_champion']),'BADGE_NOT_OWNED');
 await expectDenied(()=>shelved(['admin']),'BADGE_NOT_OWNED');
 await expectDenied(()=>shelved(['moderator']),'BADGE_NOT_OWNED');
 p=await self();
 assert.deepEqual(p.featuredExtras,['beta_tester','founder','supporter_12m'],'a rejected write leaves the stored shelf intact');

 // A lapsed Supporter stops showing a tier star without the client cooperating.
 await db.exec("update private.account_commerce_entitlements_v1 set supporter_active=false where account_id='"+a+"'");
 p=await self();
 assert.deepEqual(p.featuredExtras,['beta_tester','founder'],'an expired Supporter tier drops off the shelf, the collectibles stay');
 assert.deepEqual(p.identity.featured,['beta_tester','founder'],'the public identity hides it too');
 const stored=await first('select profile_badge_ids as items from private.player_badge_preferences_v1 where account_id=$1',[a]);
 assert.deepEqual(stored.items,['beta_tester','founder','supporter_12m'],'the stored choice survives the lapse and returns when they resubscribe');
 await db.exec("update private.account_commerce_entitlements_v1 set supporter_active=true,supporter_expires_at=now()+interval '1 month' where account_id='"+a+"'");
 p=await self();
 assert.deepEqual(p.featuredExtras,['beta_tester','founder','supporter_12m'],'resubscribing restores the shelved tier star in place');
 await expectDenied(()=>shelved(['supporter_12m','founder','veteran','beta_tester']),'INVALID_BADGE_SELECTION');
 p=await shelved([]);
 assert.deepEqual(p.featuredExtras,[],'a shelf can be cleared');
 assert.equal(p.identity.equippedBadgeId,'beta_tester','clearing the shelf still leaves the worn badge alone');

 await signIn(b);
 await expectDenied(()=>shelved(['founder']),'BADGE_NOT_OWNED');

 await signIn('');
 await expectDenied(()=>equipped('founder'),'AUTH_REQUIRED');
 await expectDenied(()=>shelved(['founder']),'AUTH_REQUIRED');
 console.log('PASS: real PostgreSQL badge migrations, one worn badge plus an independent three-badge profile shelf, automatic staff, verified cumulative 3/6/12m tenure, paid/promo non-spoofing, lapse preservation, anonymous restrictions and private RLS');
}catch(e){
 console.error('FAIL: badge migration PostgreSQL '+e.message);
 if(e.where)console.error(e.where);
 if(e.internalQuery)console.error(e.internalQuery);
 process.exitCode=1;
}finally{await db.close();}
