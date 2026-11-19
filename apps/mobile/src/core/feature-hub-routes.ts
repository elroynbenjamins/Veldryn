/**
 * Screen-only rollout boundary. These are developer previews, NOT gameplay or
 * commerce release flags. Never infer server readiness from a rendered screen.
 */
export type FeatureHubPreviewRoute='WorldBossPreview'|'PartyEventPreview'|'PlayerMarketPreview';

export const FEATURE_HUB_PREVIEW_ROUTES:readonly FeatureHubPreviewRoute[]=[
  'WorldBossPreview','PartyEventPreview','PlayerMarketPreview',
];

export function isFeatureHubPreviewRoute(route:string):route is FeatureHubPreviewRoute{
  return FEATURE_HUB_PREVIEW_ROUTES.some(item=>item===route);
}

/** Keep navigation and offline activities alive while reclaiming vertical space. */
export function featureHubShellPolicy(route:string){
  const preview=isFeatureHubPreviewRoute(route);
  return {
    hideActivityBar:preview,
    hideGlobalChatDock:preview,
    showLocalPartyChatDock:route==='PartyEventPreview',
  } as const;
}

/** Debug builds only. Not a substitute for Market/World Boss/Party Event server gates. */
export const FEATURE_HUB_QA_ENABLED=typeof __DEV__!=='undefined'&&__DEV__===true;
