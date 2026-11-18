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
includes('if(next.board!==board||!Array.isArray(next.entries)||next.entries.some(entry=>','reject mismatched or invalid server responses');
includes('setError(st("Could not load Rankings."))','request errors must be localized and avoid raw backend details');
includes('splitRankingDisplay(activeSnapshot?.entries??[],page)','podium and regular rows must use the tie-safe shared projector');
assert.ok(pager.includes('entry.rank>=1&&entry.rank<=3')&&pager.includes('podium.length<3')&&pager.includes('remaining.push(entry)'),'podium must only highlight actual official top-three ranks without promoting privacy-filtered entries or dropping ties');
includes('accessibilityLabel={st("Rankings guide")}','rankings guide must be accessible by screen reader');
includes('setGuideOpen(true)','rankings guide must be reachable from the header');
includes('firstPlaceCard','official first place needs a distinct visual treatment');
for(const asset of [
  '../../assets/ui-icons-v2/small/account.webp',
  '../../assets/ui-icons-v2/small/skills.webp',
  '../../assets/navigation-icons-v4/training.webp',
  '../../assets/navigation-icons-v4/dungeon.webp',
  '../../assets/navigation-icons-v4/guild.webp',
])includes(asset,'Rankings must use existing pixel-art navigation sprites: '+asset);
includes('source={RANKING_GROUP_ART[group]}','board picker must display the canonical group sprite');
includes('status={entry.isSelf?st("YOU"):undefined}','do not clutter all leaderboard names with redundant PLAYER or GUILD labels');
includes('toLocaleTimeString(language)','snapshot time must use the player-selected language');
includes('HALL OF RENOWN','Rankings hero must use the approved Hall of Renown identity');
includes("value==='Professions'?'Skills':value==='Competitive'?'Arena':value",'display tabs must use understandable Skills and Arena names without changing backend groups');
includes('accessibilityLabel={loading?st("Loading rankings"):st("Refresh")}','refresh icon must announce its busy state');
includes('stackRows&&s.heroCompact','hero must adapt to narrow screens and large fonts');
includes("fontVariant:['tabular-nums']",'scores and standings should use tabular digits');
includes('st("Verified score")','self card must distinguish verified score from official rank');
includes('st("Updated {time}"','timestamp must come from the authoritative snapshot');
includes('new Date(activeSnapshot.generatedAtMs)','last-updated label must use the server timestamp');
includes('!activeSnapshot&&rankingsOnlineConfigured?<GameButton','empty failed requests must provide a direct retry');
includes('entry.rank===1&&s.firstPlaceCard','only official rank one gets leader treatment');
includes('next.entries.some(entry=>','reject malformed server rows gracefully');
includes('entry.rank<1','invalid or missing official rank must be rejected');
includes('Server-ranked · Privacy protected','trust note must remain visible without opening help');
const flags=readFileSync(new URL('../src/core/release-flags.ts',import.meta.url),'utf8');
assert.ok(flags.includes('export const RANKINGS_RELEASED=false;'),'Rankings must remain hidden from all player navigation');
includes('setLoadedPage(page)','a response must be bound to its source page');
includes('const inFlight=useRef<','Rankings must retain a request-ownership slot');
includes("const scope=board+':'+page",'request dedupe must be scoped to the selected board and page');
includes('Date.now()-inFlight.current.startedAt<30000','background polling must not overlap active reads indefinitely');
includes('if(inFlight.current?.version===version)inFlight.current=null','only the owned request may release the single-flight slot');
includes('if(version===request.current)setLoading(false)','stale reads must never clear a newer spinner');
includes('Showing last verified standings. Retry to update.','failed refresh must distinguish stale but valid standings from a successful update');
includes('scrollRef.current?.scrollTo({y:0,animated:false})','page/board navigation resets scroll');
includes('accessibilityLiveRegion="polite"','pagination announces page changes accessibly');
includes('Entries {first}–{last}','pagination displays an entry range');
includes('Live rankings can change while players progress.','live rankings must not imply frozen snapshots');
assert.ok(pager.includes('Number.isSafeInteger')&&pager.includes('RANKING_MAX_OFFSET'),'pagination input is bounded');
console.log('rankings UI/navigation contract PASS');
