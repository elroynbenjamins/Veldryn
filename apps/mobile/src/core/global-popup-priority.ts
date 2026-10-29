/** Single global presentation decision: never mount two automatic modal journeys at once.
 * Screen-local dialogs retain ownership of their actions; an open alert or user overlay
 * temporarily defers global announcements without consuming them.
 */
export type GlobalPopupKind=
  'character-welcome'|'activity-reward'|'story-boss'|'exceptional-forge'
  |'main-tour'|'feature-unlock'|'first-session'
  |'event-start'|'whats-new';

export interface GlobalPopupCandidates{
  blocked?:boolean;
  characterWelcome?:boolean;
  activityReward?:boolean;
  storyBoss?:boolean;
  exceptionalForge?:boolean;
  mainTour?:boolean;
  featureUnlock?:boolean;
  firstSession?:boolean;
  eventStart?:boolean;
  whatsNew?:boolean;
}

/** Returns the only global popup eligible to appear right now. No pending work is dropped. */
export function selectGlobalPopup(value:GlobalPopupCandidates):GlobalPopupKind|null{
  if(value.blocked)return null;
  if(value.characterWelcome)return 'character-welcome';
  if(value.activityReward)return 'activity-reward';
  if(value.storyBoss)return 'story-boss';
  if(value.exceptionalForge)return 'exceptional-forge';
  if(value.mainTour)return 'main-tour';
  if(value.featureUnlock)return 'feature-unlock';
  if(value.firstSession)return 'first-session';
  if(value.eventStart)return 'event-start';
  if(value.whatsNew)return 'whats-new';
  return null;
}
