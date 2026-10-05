import type {LiveEventVisualKey} from '../content/live-event-visual-keys';
export interface LiveEventVisualBundle{heroBackground:number;showcaseBackground?:number;badgeIcon?:number;commonCurrencyIcon?:number;prestigeCurrencyIcon?:number;candyIcon?:number;discoveryArt:Readonly<Record<string,number>>;rewardArt:Readonly<Record<string,number>>}
const EMPTY_ART:Readonly<Record<string,number>>=Object.freeze({});
const HARVESTWAKE:LiveEventVisualBundle={
 showcaseBackground:require('../../assets/events/harvestwake/showcase-guardian-v2.webp'),
 heroBackground:require('../../assets/events/harvestwake/landscape-v2.webp'),
 badgeIcon:require('../../assets/events/harvestwake/badge.webp'),
 commonCurrencyIcon:require('../../assets/events/harvestwake/currency_harvest_mark.webp'),
 prestigeCurrencyIcon:require('../../assets/events/harvestwake/currency_amber_seed.webp'),
 candyIcon:require('../../assets/events/harvestwake/candy_harvest_taffy.webp'),
 discoveryArt:{
  whispering_husk:require('../../assets/events/harvestwake/discovery_whispering_husk.webp'),
  golden_field_feather:require('../../assets/events/harvestwake/discovery_golden_field_feather.webp'),
  amber_artisan_seal:require('../../assets/events/harvestwake/discovery_amber_artisan_seal.webp'),
  guardian_lantern:require('../../assets/events/harvestwake/discovery_guardian_lantern.webp'),
 },
 rewardArt:{
  EVT_PET_011:require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_011_Pumpkin_Piglet.webp'),
  EVT_PET_012:require('../../assets/event_collectibles/harvestwake/pets/EVT_PET_012_Golden_Sheafling.webp'),
  EVT_UNIT_006:require('../../assets/events/harvestwake/guardian-master-v2.webp'),
  pet_harvest_fox:require('../../assets/events/harvestwake/pet_harvest_fox.webp'),
  pet_field_mouse:require('../../assets/events/harvestwake/pet_field_mouse.webp'),
  pet_straw_sparrow:require('../../assets/events/harvestwake/pet_straw_sparrow.webp'),
  pet_amber_owl:require('../../assets/events/harvestwake/pet_amber_owl.webp'),
  emote_harvest_cheer:require('../../assets/events/harvestwake/emote_harvest_cheer.webp'),
  emote_scarecrow_salute:require('../../assets/events/harvestwake/emote_scarecrow_salute.webp'),
  bg_grand_storehouse:require('../../assets/events/harvestwake/landscape-v2.webp'),
  bg_harvestwake:require('../../assets/events/harvestwake/landscape-v2.webp'),
  bg_spirit_storehouse:require('../../assets/events/harvestwake/landscape-v2.webp'),
  frame_amber_vine:require('../../assets/profile-borders/frame_amber_vine.webp'),
  frame_wheat_crown:require('../../assets/profile-borders/frame_wheat_crown.webp'),
 },
};
const GENERIC:LiveEventVisualBundle={heroBackground:require('../../assets/events/harvestwake/landscape-v2.webp'),discoveryArt:EMPTY_ART,rewardArt:EMPTY_ART};
export function liveEventVisuals(visualKey?:LiveEventVisualKey){return visualKey==='harvestwake'?HARVESTWAKE:GENERIC;}
export function liveEventVisualCoverage(visualKey:LiveEventVisualKey,discoveryIds:readonly string[]=[]){
 const bundle=liveEventVisuals(visualKey);
 return {dedicatedBundle:visualKey==='harvestwake',badgeArt:!!bundle.badgeIcon,commonCurrencyArt:!!bundle.commonCurrencyIcon,prestigeCurrencyArt:!!bundle.prestigeCurrencyIcon,discoveryArtCount:discoveryIds.filter(id=>!!bundle.discoveryArt[id]).length,discoveryTotal:discoveryIds.length};
}
