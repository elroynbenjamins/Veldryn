import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/admin.js';

const feature={
  id:'party_events',title:'Party Events',description:'Cooperative seasonal encounters.',
  category:'Co-op',status:'considering',sort_order:10,published:true,
  release_version:null,updated_at:'2026-11-08T12:00:00.000Z',
};
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test',
  SUPABASE_SERVICE_ROLE_KEY:'server-only-test'};

async function withApi(action,payload,role='editor'){
  const originalFetch=globalThis.fetch, seen=[];
  globalThis.fetch=async(url,init={})=>{
    const path=String(url),method=init.method||'GET';
    seen.push({path,method,body:init.body?JSON.parse(init.body):null});
    if(path.includes('/auth/v1/user'))return Response.json({id:'11111111-1111-4111-8111-111111111111',email:'dev@example.com'});
    if(path.includes('/rest/v1/liveops_admin_users'))return Response.json([{role,enabled:true,account_id:'11111111-1111-4111-8111-111111111111'}]);
    if(path.includes('/rest/v1/community_roadmap_features')){
      if(method==='PATCH')return Response.json([{...feature,...JSON.parse(init.body)}]);
      return Response.json([feature]);
    }
    if(path.includes('/rest/v1/community_roadmap_votes'))
      return new Response('[]',{headers:{'content-range':'0/7'}});
    if(path.includes('/rest/v1/liveops_admin_audit_log'))return new Response(null,{status:201});
    throw Error('Unexpected URL: '+path);
  };
  try{
    const request=new Request('https://control.example/api/admin',{
      method:'POST',headers:{'content-type':'application/json',authorization:'Bearer tester',origin:'https://control.example'},
      body:JSON.stringify({action,payload}),
    });
    const response=await onRequest({request,env});
    return {status:response.status,data:await response.json(),seen};
  }finally{globalThis.fetch=originalFetch;}
}

test('roadmap admin read returns totals but no player voter identities',async()=>{
  const r=await withApi('communityRoadmapAdmin',{},'viewer');
  assert.equal(r.status,200);
  assert.equal(r.data.data.features[0].votes,7);
  assert.equal(r.data.data.features[0].id,'party_events');
  assert.ok(!('account_id' in r.data.data.features[0]));
});

test('editor can update an existing proposal with an audited reason',async()=>{
  const r=await withApi('saveCommunityRoadmapFeature',{
    id:'party_events',title:'Party Events',description:'Cooperative seasonal encounters.',
    category:'Co-op',status:'planned',sortOrder:10,published:true,releaseVersion:'',
    updatedAt:feature.updated_at,reason:'Prioritized after player feedback.',
  });
  assert.equal(r.status,200);
  assert.equal(r.data.data.status,'planned');
  assert.ok(r.seen.some(call=>call.method==='PATCH'&&call.path.includes('updated_at=eq.')));
  assert.ok(r.seen.some(call=>call.method==='POST'&&call.path.includes('liveops_admin_audit_log')));
});

test('server rejects premature Player Market visibility',async()=>{
  const r=await withApi('saveCommunityRoadmapFeature',{
    id:'player_market',title:'Player Market',description:'Trade equipment and resources securely.',
    category:'Economy',status:'considering',sortOrder:70,published:true,
    releaseVersion:'',updatedAt:feature.updated_at,reason:'Trying to publish early.',
  });
  assert.equal(r.status,400);
  assert.equal(r.data.error,'roadmap_market_not_released');
  assert.ok(!r.seen.some(call=>call.method==='PATCH'));
});

test('viewers cannot edit proposals',async()=>{
  const r=await withApi('saveCommunityRoadmapFeature',{
    id:'party_events',title:'Party Events',description:'Cooperative seasonal encounters.',
    category:'Co-op',status:'planned',sortOrder:10,published:true,releaseVersion:'',
    updatedAt:feature.updated_at,reason:'Publish this feature now.',
  },'viewer');
  assert.equal(r.status,403);
  assert.equal(r.data.error,'insufficient_admin_role');
});

test('stale updates are rejected instead of overwriting newer edits',async()=>{
  const r=await withApi('saveCommunityRoadmapFeature',{
    id:'party_events',title:'Party Events',description:'Cooperative seasonal encounters.',
    category:'Co-op',status:'planned',sortOrder:10,published:true,releaseVersion:'',
    updatedAt:'2026-11-07T12:00:00.000Z',reason:'Publish this feature now.',
  });
  assert.equal(r.status,409);
  assert.equal(r.data.error,'roadmap_conflict');
});
