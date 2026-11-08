/** Hidden until the full server-owned Player Market has shipped.
 * Do not use the market's internal development flags to expose a vote card. */
export function communityRoadmapFeatureVisible(featureId:string):boolean {
  return featureId!=='player_market';
}
