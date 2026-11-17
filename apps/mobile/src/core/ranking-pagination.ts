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

/**
 * Only actual official top-three positions can receive podium treatment.
 * Privacy or block filtering can hide #1–#3 without promoting the next visible
 * player. Show at most three visible top-three entries; extra tied entries
 * remain in the ordinary list with their original server-assigned rank.
 */
export function splitRankingDisplay(
  entries:readonly RankingEntry[],page:number,
):{podium:RankingEntry[];remaining:RankingEntry[]}{
  rankingPageOffset(page);
  if(page!==0)return {podium:[],remaining:entries.slice()};
  const podium:RankingEntry[]=[];
  const remaining:RankingEntry[]=[];
  for(const entry of entries){
    if(podium.length<3&&Number.isSafeInteger(entry.rank)&&entry.rank>=1&&entry.rank<=3){
      podium.push(entry);
    }else{
      remaining.push(entry);
    }
  }
  return {podium,remaining};
}
