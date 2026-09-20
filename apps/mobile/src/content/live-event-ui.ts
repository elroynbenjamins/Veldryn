import type {LiveEventDef} from './live-events';

export interface LiveEventUiCopy {
  prepareTitle:string;
  dailyGiftTitle:string;
  cacheName:string;
  communityName:string;
  projectTitle:string;
  projectNoun:string;
  contractsTitle:string;
  shopTitle:string;
  collectionTitle:string;
  closedTitle:string;
  closedBody:string;
}

const DEFAULT_UI:LiveEventUiCopy={
  prepareTitle:'Prepare for the event',
  dailyGiftTitle:'Today’s Event Gift',
  cacheName:'Event Cache',
  communityName:'Community Progress',
  projectTitle:'Event preparation',
  projectNoun:'event project',
  contractsTitle:'DAILY EVENT CONTRACTS',
  shopTitle:'EVENT SHOP',
  collectionTitle:'Event collection',
  closedTitle:'Event activities are closed',
  closedBody:'No new reputation, daily gifts, contracts, or contributions can be earned. Completed contracts, milestones, community stages, caches, and shop purchases remain claimable.',
};

export function eventUiCopy(definition:Pick<LiveEventDef,'name'|'ui'>):LiveEventUiCopy{
  return {
    ...DEFAULT_UI,
    collectionTitle:`${definition.name} collection`,
    ...(definition.ui??{}),
  };
}

export function validateLiveEventCatalog(events:readonly LiveEventDef[]):string[]{
  const errors:string[]=[];
  const seenEventIds=new Set<string>();
  const seenEventNames=new Set<string>();

  const duplicateIds=(label:string,ids:string[])=>{
    const seen=new Set<string>();
    for(const id of ids){
      if(!id.trim())errors.push(`${label} contains a blank id.`);
      else if(seen.has(id))errors.push(`${label} contains duplicate id ${id}.`);
      else seen.add(id);
    }
  };

  for(const event of events){
    if(seenEventIds.has(event.id))errors.push(`Duplicate live-event id ${event.id}.`);
    else seenEventIds.add(event.id);
    if(seenEventNames.has(event.name))errors.push(`Duplicate live-event name ${event.name}.`);
    else seenEventNames.add(event.name);

    if(event.maxProgress<=0)errors.push(`${event.id} must have positive maxProgress.`);
    if(event.claimGraceDays<0)errors.push(`${event.id} cannot have a negative claim grace period.`);
    if(!event.currencyId.trim()||!event.prestigeCurrencyId.trim())errors.push(`${event.id} must define both event currencies.`);
    if(Object.values(event.dropRates).some(value=>value<0||!Number.isFinite(value)))errors.push(`${event.id} has an invalid drop rate.`);

    duplicateIds(`${event.id} objectives`,event.objectives.map(row=>row.id));
    duplicateIds(`${event.id} weekly objectives`,event.weeklyObjectives.map(row=>row.id));
    duplicateIds(`${event.id} shop`,event.shop.map(row=>row.id));
    duplicateIds(`${event.id} choices`,event.choices.map(row=>row.id));
    duplicateIds(`${event.id} discoveries`,event.discoveries.map(row=>row.id));

    const copy=eventUiCopy(event);
    for(const [key,value] of Object.entries(copy)){
      if(!value.trim())errors.push(`${event.id} UI copy ${key} cannot be blank.`);
    }
  }
  return errors;
}
