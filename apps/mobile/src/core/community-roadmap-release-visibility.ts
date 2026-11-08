/** Unreleased features must not be announced by a stale Roadmap response. */
export function communityRoadmapFeatureVisible(featureId:string):boolean {
  return featureId!=='player_market';
}
