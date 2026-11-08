/** Roadmap visibility is controlled by the server-side published flag,
 * independently from whether the underlying gameplay feature has shipped.
 * The Player Market is a votable proposal, not a released marketplace. */
export function communityRoadmapFeatureVisible(_featureId:string):boolean {
  return true;
}
