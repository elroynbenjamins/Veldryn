import {eventRewardPlan,type LiveEventDef} from './live-events';

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

    if(!event.signature?.label.trim()||!event.signature?.title.trim()||!event.signature?.description.trim())errors.push(`${event.id} must define a complete signature mechanic.`);
    if(!event.signature?.highlights?.length||event.signature.highlights.length<2||event.signature.highlights.some(item=>!item.trim()))errors.push(`${event.id} signature mechanic needs at least two highlights.`);
    if(event.communityEnabled===true&&event.communityMilestones.length<4)errors.push(`${event.id} community event needs four shared milestones.`);

    const plan=eventRewardPlan(event,'IRONWARDEN');
    const milestones=event.milestones('IRONWARDEN');
    const milestonePets=milestones.filter(row=>row.reward.kind==='pet');
    const shopPets=event.shop.filter(row=>row.reward.kind==='pet');
    const companions=milestones.filter(row=>row.reward.kind==='companion');
    if(milestonePets.length!==1)errors.push(`${event.id} must have exactly one activity-meter pet.`);
    if(shopPets.length!==1)errors.push(`${event.id} must have exactly one shop pet.`);
    if(companions.length!==1)errors.push(`${event.id} must have exactly one milestone companion.`);
    if(plan&&plan.meterPet.points<event.maxProgress*.35||plan&&plan.meterPet.points>event.maxProgress*.55)errors.push(`${event.id} activity-meter pet should land between 35% and 55% of max progress.`);
    if(plan&&plan.finalCompanion.points!==event.maxProgress)errors.push(`${event.id} companion must be the final ${event.maxProgress}-point reward.`);

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
