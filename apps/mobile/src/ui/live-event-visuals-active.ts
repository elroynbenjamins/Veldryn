import type {LiveEventVisualKey} from '../content/live-event-visual-keys';
export interface LiveEventVisualBundle{heroBackground:number;showcaseBackground?:number;badgeIcon?:number;commonCurrencyIcon?:number;prestigeCurrencyIcon?:number;candyIcon?:number;discoveryArt:Readonly<Record<string,number>>;rewardArt:Readonly<Record<string,number>>}
const EMPTY_ART:Readonly<Record<string,number>>=Object.freeze({});
const HARVESTWAKE:LiveEventVisualBundle={
 showcaseBackground:require('../../assets/events/harvestwake/showcase-guardian-v2.png'),
 heroBackground:require('../../assets/events/harvestwake/landscape-v2.png'),
 badgeIcon:require('../../assets/events/harvestwake/badge.png'),
 commonCurrencyIcon:require('../../assets/events/harvestwake/currency_harvest_mark.png'),
 prestigeCurrencyIcon:require('../../assets/events/harvestwake/currency_amber_seed.png'),
 candyIcon:require('../../assets/events/harvestwake/candy_harvest_taffy.png'),
 discoveryArt:{
  whispering_husk:require('../../assets/events/harvestwake/discovery_whispering_husk.png'),
  golden_field_feather:require('../../assets/events/harvestwake/discovery_golden_field_feather.png'),
  amber_artisan_seal:require('../../assets/events/harvestwake/discovery_amber_artisan_seal.png'),
  guardian_lantern:require('../../assets/events/harvestwake/discovery_guardian_lantern.png'),
 },
 rewardArt:{
  EVT_PET_011:require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_011_Pumpkin_Piglet.png'),
  EVT_PET_012:require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_012_Golden_Sheafling.png'),
  EVT_UNIT_006:require('../../assets/events/harvestwake/guardian-master-v2.png'),
  pet_harvest_fox:require('../../assets/events/harvestwake/pet_harvest_fox.png'),
  pet_field_mouse:require('../../assets/events/harvestwake/pet_field_mouse.png'),
  pet_straw_sparrow:require('../../assets/events/harvestwake/pet_straw_sparrow.png'),
  pet_amber_owl:require('../../assets/events/harvestwake/pet_amber_owl.png'),
  emote_harvest_cheer:require('../../assets/events/harvestwake/emote_harvest_cheer.png'),
  emote_scarecrow_salute:require('../../assets/events/harvestwake/emote_scarecrow_salute.png'),
  bg_grand_storehouse:require('../../assets/events/harvestwake/landscape-v2.png'),
  bg_harvestwake:require('../../assets/events/harvestwake/landscape-v2.png'),
  bg_spirit_storehouse:require('../../assets/events/harvestwake/landscape-v2.png'),
  frame_amber_vine:require('../../assets/profile-borders/frame_amber_vine.png'),
  frame_wheat_crown:require('../../assets/profile-borders/frame_wheat_crown.png'),
 },
};
const GENERIC:LiveEventVisualBundle={heroBackground:require('../../assets/events/harvestwake/landscape-v2.png'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART};
export function liveEventVisuals(visualKey?:LiveEventVisualKey){return visualKey==='harvestwake'?HARVESTWAKE:GENERIC;}
export function liveEventVisualCoverage(visualKey:LiveEventVisualKey,discoveryIds:readonly string[]=[]){
 const bundle=liveEventVisuals(visualKey);
 return {dedicatedBundle:visualKey==='harvestwake',badgeArt:!!bundle.badgeIcon,commonCurrencyArt:!!bundle.commonCurrencyIcon,prestigeCurrencyArt:!!bundle.prestigeCurrencyIcon,discoveryArtCount:discoveryIds.filter(id=>!!bundle.discoveryArt[id]).length,discoveryTotal:discoveryIds.length};
}
