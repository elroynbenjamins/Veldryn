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
const a='00000000-0000-4000-8000-000000000001';
const b='00000000-0000-4000-8000-000000000002';
const c='00000000-0000-4000-8000-000000000003';
const first=async(q,args=[])=> (await db.query(q,args)).rows[0];
const signIn=async id=>void await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
const self=async()=> (await first('select public.player_badge_self_v1() as data')).data;
const equipped=async id=> (await first('select public.update_player_equipped_badge_v2($1) as data',[id])).data;
const expectDenied=async(fn,code)=>{
 let err;try{await fn();}catch(e){err=e;}
 assert.ok(err,'expected rejected badge: '+code);
 assert.match(err.message,new RegExp(code));
};
try{
 await db.exec(fixture);
 console.log('BADGE_SQL_FIXTURE_READY');
 await db.exec(migration);
 console.log('BADGE_SQL_MIGRATION_PARSED');
 const rls=await first("select relrowsecurity as enabled from pg_class where oid='private.supporter_badge_progress_v2'::regclass");
 assert.equal(rls.enabled,true,'tenure table is RLS protected');
 const anonGrant=await first("select has_function_privilege('anon','public.update_player_equipped_badge_v2(text)','execute') as granted");
 assert.equal(anonGrant.granted,false,'anonymous users cannot equip badges');

 await signIn(a);
 let p=await self();
 assert.equal(p.identity.staff,'admin');
 assert.equal(p.identity.equippedBadgeId,'founder','first previously featured badge preserved');
 assert.deepEqual(p.featuredExtras,['founder'],'legacy two-badge selection is collapsed to one');
 assert.equal(p.supporterAvailable,true);
 assert.equal(p.supporterTierMonths,1,'prepaid seven-month expiry is not earned continuous tenure');
 const legacy=await first('select featured_badge_ids as items from private.player_badge_preferences_v1 where account_id=$1',[a]);
 assert.deepEqual(legacy.items,['founder']);
 await expectDenied(()=>equipped('admin'),'INVALID_BADGE_SELECTION');
 await expectDenied(()=>equipped('supporter_3m'),'BADGE_NOT_OWNED');
 await expectDenied(()=>equipped('supporter_6m'),'BADGE_NOT_OWNED');

 p=await equipped('supporter');
 assert.equal(p.identity.equippedBadgeId,'supporter');
 assert.equal(p.identity.staff,'admin','staff appears beside selected Supporter');
 assert.deepEqual(p.featuredExtras,[]);
 p=await equipped(null);
 assert.equal(p.identity.equippedBadgeId,null,'explicit None overrides legacy auto Supporter');
 assert.equal(p.identity.staff,'admin');

 await db.exec("update private.supporter_badge_progress_v2 set verified_since=now()-interval '4 months' where account_id='"+a+"'");
 p=await self();assert.equal(p.supporterTierMonths,3);
 p=await equipped('supporter_3m');assert.equal(p.identity.equippedBadgeId,'supporter_3m');
 await expectDenied(()=>equipped('supporter_6m'),'BADGE_NOT_OWNED');
 await db.exec("update private.supporter_badge_progress_v2 set verified_since=now()-interval '7 months' where account_id='"+a+"'");
 p=await equipped('supporter_6m');
 assert.equal(p.supporterTierMonths,6);
 assert.equal(p.identity.equippedBadgeId,'supporter_6m');

 p=(await first("select public.update_player_featured_badges_v1(array['beta_tester','founder']) as data")).data;
 assert.equal(p.identity.equippedBadgeId,'beta_tester');
 assert.deepEqual(p.featuredExtras,['beta_tester']);
 await expectDenied(()=>equipped('event_champion'),'BADGE_NOT_OWNED');
 await expectDenied(()=>equipped('moderator'),'INVALID_BADGE_SELECTION');

 p=await equipped('supporter_6m');
 await db.exec("update private.account_commerce_entitlements_v1 set supporter_active=false where account_id='"+a+"'");
 p=await self();
 assert.equal(p.supporterTierMonths,0);
 assert.equal(p.identity.equippedBadgeId,null,'expired supporter tier disappears');
 assert.equal(p.identity.staff,'admin');
 await expectDenied(()=>equipped('supporter'),'BADGE_NOT_OWNED');
 await db.exec("update private.account_commerce_entitlements_v1 set supporter_active=true,supporter_expires_at=now()+interval '1 month' where account_id='"+a+"'");
 p=await self();
 assert.equal(p.supporterTierMonths,1,'rejoining after lapse starts fresh verified streak');
 await expectDenied(()=>equipped('supporter_3m'),'BADGE_NOT_OWNED');

 await signIn(b);
 p=await self();assert.equal(p.supporterTierMonths,1,'fresh 6m paid term does not grant 6m badge');
 await expectDenied(()=>equipped('supporter_6m'),'BADGE_NOT_OWNED');
 p=await equipped('veteran');
 assert.equal(p.identity.equippedBadgeId,'veteran');
 assert.equal(p.identity.supporter,false,'a collectible does not force the Supporter icon');
 assert.equal(p.supporterAvailable,true);

 await signIn(c);
 p=await self();assert.equal(p.supporterAvailable,true);
 assert.equal(p.supporterTierMonths,1,'6m promo entitlement does not skip 6m elapsed time');
 await expectDenied(()=>equipped('supporter_3m'),'BADGE_NOT_OWNED');
 p=await equipped('supporter');assert.equal(p.identity.equippedBadgeId,'supporter');

 await signIn('');
 await expectDenied(()=>equipped('founder'),'AUTH_REQUIRED');
 console.log('PASS: real PostgreSQL badge migration, one equipped, automatic staff, verified 3/6m tenure, paid/promo non-spoofing, expiry reset, anonymous restrictions and private RLS');
}catch(e){
 console.error('FAIL: badge migration PostgreSQL '+e.message);
 if(e.where)console.error(e.where);
 if(e.internalQuery)console.error(e.internalQuery);
 process.exitCode=1;
}finally{await db.close();}
