import type {RankingEntry} from './rankings';

/** Request one extra server row so a full last page cannot display a false Next button. */
export const RANKING_PAGE_SIZE=50;
export const RANKING_MAX_OFFSET=10000;
export function rankingPageOffset(page:number,pageSize=RANKING_PAGE_SIZE):number {
  if(!Number.isSafeInteger(page)||page<0||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>99)
    throw new Error('invalid_ranking_page');
  const offset=page*pageSize;
  if(!Number.isSafeInteger(offset)||offset>RANKING_MAX_OFFSET)
    throw new Error('ranking_page_out_of_range');
  return offset;
}
export function projectRankingPage(
  entries:readonly RankingEntry[],page:number,pageSize=RANKING_PAGE_SIZE,
):{entries:RankingEntry[];hasNext:boolean;firstPosition:number;lastPosition:number}{
  const offset=rankingPageOffset(page,pageSize);
  const visible=entries.slice(0,pageSize);
  return {
    entries:visible,
    hasNext:entries.length>pageSize&&offset+pageSize<=RANKING_MAX_OFFSET,
    firstPosition:visible.length?offset+1:0,
    lastPosition:visible.length?offset+visible.length:0,
  };
}
