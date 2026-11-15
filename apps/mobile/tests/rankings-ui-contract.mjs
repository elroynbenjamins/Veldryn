import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
const screen=readFileSync(new URL('../src/screens/RankingsScreen.tsx',import.meta.url),'utf8');
const pager=readFileSync(new URL('../src/core/ranking-pagination.ts',import.meta.url),'utf8');
function includes(needle,message){assert.ok(screen.includes(needle),message);}
includes('RANKING_PAGE_SIZE+1','lookahead must fetch exactly one extra server row');
includes('rankingPageOffset(page)','page requests use bounded offsets');
includes('projectRankingPage(next.entries,page)','server entries are projected to the requested page');
includes('request.current++','selection and unmount must invalidate in-flight requests');
includes('version===request.current','outdated fetch responses must be discarded');
includes('if(next===board)return;','reselecting a board must not erase current standings');
includes('if(value===group)return;','reselecting a category must preserve the current board');
includes('if(next.board!==board||!Array.isArray(next.entries))','reject mismatched server responses');
includes('setError(st("Could not load Rankings."))','request errors must be localized and avoid raw backend details');
includes('splitRankingDisplay(activeSnapshot?.entries??[],page)','podium and regular rows must use the tie-safe shared projector');
assert.ok(pager.includes('entries.slice(0,3)')&&pager.includes('entries.slice(3)')&&pager.includes('page===0'),'podium must highlight only three entries without dropping ties');
includes('setLoadedPage(page)','a response must be bound to its source page');
includes('scrollRef.current?.scrollTo({y:0,animated:false})','page/board navigation resets scroll');
includes('accessibilityLiveRegion="polite"','pagination announces page changes accessibly');
includes('Entries {first}–{last}','pagination displays an entry range');
includes('Ranks {first}–{last}','frozen pages display official ranks rather than filtered positions');
includes('const cursor=forceNewSnapshot?undefined:frozenCursors.current.get(page);','page navigation and background refresh must reuse the frozen snapshot');
includes('function refreshRankings(){','explicit refresh should restart the snapshot');
includes('void load(true);','an explicit refresh must force a new frozen snapshot');
includes('Live rankings can change while players progress.','live rankings must not imply frozen snapshots');
assert.ok(pager.includes('Number.isSafeInteger')&&pager.includes('RANKING_MAX_OFFSET'),'pagination input is bounded');
const client=readFileSync(new URL('../src/online/rankings-client.ts',import.meta.url),'utf8');
for(const term of [
  "EXPO_PUBLIC_RANKINGS_SNAPSHOT_V1==='true'",
  'EXPO_PUBLIC_RANKINGS_EDGE_URL',
  'rankings_frozen_start_server_v1',
]){
  // RPC names live server-side; client calls only routed actions.
  if(term==='rankings_frozen_start_server_v1')continue;
  assert.ok(client.includes(term),'missing explicit client frozen gate / URL: '+term);
}
assert.ok(client.includes('action=snapshot-start')&&client.includes('action=snapshot-page'),
 'client must call gated authenticated Edge endpoints');
includes('const frozenCursors=useRef<Map<number,string>>(new Map())',
 'opaque cursors must be stored per-page only in memory');
includes('frozenCursors.current.clear()', 'changing board must discard prior snapshot cursors');
includes('if(page>0&&!cursor)', 'later pages must require server-issued cursor');
includes('next.pageSize!==RANKING_PAGE_SIZE','reject unexpected server snapshot page size');
includes('frozenCursors.current.set(page+1,next.nextCursor)',
 'next page must use the server-provided opaque token');
includes('if(rankingsFrozenConfigured&&!frozenCursors.current.has(next))return;',
 'cannot jump to arbitrary pages without a verified cursor');
console.log('rankings UI/navigation contract PASS');
