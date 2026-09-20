import type {EventActivitySource} from './live-events';

export interface SeasonalStoryQuest {
  id:string;
  name:string;
  description:string;
  source:EventActivitySource;
  required:number;
  unlockReputation:number;
}

export interface SeasonalDungeonPreview {
  id:string;
  name:string;
  description:string;
  minLevel:number;
  routeHighlights:string[];
  enemyNames:string[];
  finalBoss:string;
}

export interface SeasonalEventAdventure {
  seriesId:string;
  storyTitle:string;
  storySummary:string;
  storyQuests:SeasonalStoryQuest[];
  dungeon:SeasonalDungeonPreview;
}

const adventures:Record<string,SeasonalEventAdventure>={
  EVT_ANNUAL_010:{
    seriesId:'EVT_ANNUAL_010',
    storyTitle:'The Lantern Ward',
    storySummary:'Follow the Veilbreak from the first failing wards to the source of the Gloam breach.',
    storyQuests:[
      {id:'lanterns_at_dusk',name:'Lanterns at Dusk',description:'Drive shades away from the outer lantern wards before night fully settles.',source:'combat',required:180,unlockReputation:0},
      {id:'breachwatch',name:'Breachwatch',description:'Recover ward materials while tracking where the veil is weakest.',source:'gathering',required:240,unlockReputation:1500},
      {id:'seal_the_gloam',name:'Seal the Gloam',description:'Defeat the guardian feeding the breach and secure the final ward.',source:'boss',required:2,unlockReputation:4500},
    ],
    dungeon:{id:'EVENT_VEILBREAK_HOLLOW_BELFRY',name:'The Hollow Belfry',description:'Descend through broken lantern wards and a cloister swallowed by the Gloam.',minLevel:25,routeHighlights:['Lantern Ward','Shattered Cloister','Gloam Stair'],enemyNames:['Gloam Stalker','Lantern Eater','Veilbound Penitent'],finalBoss:'The Pale Bellkeeper'},
  },
  EVT_ANNUAL_011:{
    seriesId:'EVT_ANNUAL_011',
    storyTitle:'The Broken Trade Road',
    storySummary:'Protect the festival caravans, expose a forged toll network, and reopen the road to the guild halls.',
    storyQuests:[
      {id:'caravan_muster',name:'Caravan Muster',description:'Clear raiders and beasts from the first merchant routes.',source:'combat',required:160,unlockReputation:0},
      {id:'lost_manifests',name:'The Lost Manifests',description:'Gather replacement supplies and recover marked cargo for the guild quartermasters.',source:'gathering',required:240,unlockReputation:1500},
      {id:'guildmasters_ledger',name:"The Guildmaster's Ledger",description:'Break the extortion ring controlling the old tollhouse.',source:'boss',required:2,unlockReputation:4500},
    ],
    dungeon:{id:'EVENT_MERCHANT_BROKEN_TOLLHOUSE',name:'The Broken Tollhouse',description:'Fight through seized caravan yards and the coin-vault beneath an abandoned guild tollhouse.',minLevel:20,routeHighlights:['Caravan Yard','Seized Ledger Hall','Coin Vault'],enemyNames:['Road Reaver','Contract Wraith','Coinbound Golem'],finalBoss:'The Gilded Extortioner'},
  },
  EVT_ANNUAL_012:{
    seriesId:'EVT_ANNUAL_012',
    storyTitle:'Bells Beneath the Snow',
    storySummary:'Relight the winter roads and follow a corrupted Frostbell signal into the old aurora foundry.',
    storyQuests:[
      {id:'light_winter_roads',name:'Light the Winter Roads',description:'Defeat threats gathering around the extinguished road lanterns.',source:'combat',required:180,unlockReputation:0},
      {id:'bells_beneath_snow',name:'Bells Beneath the Snow',description:'Gather winter provisions and bell-metal exposed by the deep freeze.',source:'gathering',required:260,unlockReputation:1500},
      {id:'auroras_last_chime',name:"Aurora's Last Chime",description:'Silence the beast twisting the Frostbell song beneath the foundry.',source:'boss',required:2,unlockReputation:4500},
    ],
    dungeon:{id:'EVENT_FROSTFALL_AURORA_BELLFOUNDRY',name:'Aurora Bellfoundry',description:'Cross frozen casting halls and aurora-lit bell chambers beneath the winter festival.',minLevel:25,routeHighlights:['Snowbound Causeway','Frozen Casting Hall','Aurora Belfry'],enemyNames:['Rimebound Marauder','Bellfrost Warden','Aurora Revenant'],finalBoss:'The White Bell Beast'},
  },
  EVT_ANNUAL_001:{
    seriesId:'EVT_ANNUAL_001',
    storyTitle:'The Last Hour',
    storySummary:'Chronicle the closing age as fractures in time lead toward a vault that should have vanished at midnight.',
    storyQuests:[
      {id:'chronicle_last_night',name:'Chronicle the Last Night',description:'Record victories against creatures warped by the final hours of the old age.',source:'combat',required:180,unlockReputation:0},
      {id:'fractures_hourglass',name:'Fractures in the Hourglass',description:'Gather ageglass and time-touched fragments from unstable places.',source:'gathering',required:240,unlockReputation:1500},
      {id:'first_dawn_vigil',name:'First Dawn Vigil',description:'Defeat the force holding the final hour in place and allow the new dawn to begin.',source:'boss',required:2,unlockReputation:4500},
    ],
    dungeon:{id:'EVENT_TURNING_VAULT_LAST_HOUR',name:'Vault of the Last Hour',description:'Enter a chronicle vault caught between the last midnight and the first dawn.',minLevel:25,routeHighlights:['Fading Gallery','Ageglass Archive','Midnight Orrery'],enemyNames:['Yearless Remnant','Ageglass Sentinel','Dawnless Chronicler'],finalBoss:'The Last Hour'},
  },
  EVT_ANNUAL_002:{
    seriesId:'EVT_ANNUAL_002',
    storyTitle:'Garden of Broken Vows',
    storySummary:'Missing gifts and broken promises reveal a hostile force feeding on abandoned bonds beneath the festival gardens.',
    storyQuests:[
      {id:'missing_invitations',name:'Missing Invitations',description:'Protect festival travelers and recover routes taken by missing couriers.',source:'combat',required:160,unlockReputation:0},
      {id:'threads_of_vow',name:'Threads of the Vow',description:'Gather enchanted flowers and vow-thread needed to mend the garden wards.',source:'gathering',required:240,unlockReputation:1500},
      {id:'unbound_heart',name:'The Unbound Heart',description:'Confront the creature severing bonds at the center of the forgotten garden.',source:'boss',required:2,unlockReputation:4500},
    ],
    dungeon:{id:'EVENT_HEARTBOND_GARDEN_BROKEN_VOWS',name:'Garden of Broken Vows',description:'Descend through overgrown vow gardens where old promises have become hostile magic.',minLevel:15,routeHighlights:['Rosegate Walk','Vowglass Conservatory','Forgotten Arbor'],enemyNames:['Thornbound Jealousy','Vowbreaker Shade','Heartglass Knight'],finalBoss:'The Unbound Heart'},
  },
  EVT_ANNUAL_003:{
    seriesId:'EVT_ANNUAL_003',
    storyTitle:'Wake the Elderbloom',
    storySummary:'The spring awakening is being consumed from below; restore the old grove before the blight reaches Asterfall.',
    storyQuests:[
      {id:'seed_old_grove',name:'Seed the Old Grove',description:'Push hostile creatures away from the first returning spring growth.',source:'combat',required:160,unlockReputation:0},
      {id:'blight_beneath_bloom',name:'Blight Beneath the Bloom',description:'Gather living herbs and clean growth needed to trace the spreading blight.',source:'gathering',required:260,unlockReputation:1500},
      {id:'wake_elderbloom',name:'Wake the Elderbloom',description:'Defeat the devourer at the grove heart so the Elderbloom can awaken safely.',source:'boss',required:2,unlockReputation:4500},
    ],
    dungeon:{id:'EVENT_BLOOMWAKE_ELDERBLOOM_HOLLOW',name:'Elderbloom Hollow',description:'Travel beneath a waking sacred grove through roots, pollen caverns, and a blighted heart chamber.',minLevel:20,routeHighlights:['Rootway Descent','Pollen Grotto','Elderbloom Heart'],enemyNames:['Blightcap Ravager','Rootwoken Stag','Pollen Wraith'],finalBoss:'Elderbloom Devourer'},
  },
};

export function seasonalEventSeriesId(eventId:string){return eventId.match(/^(EVT_ANNUAL_\d{3})_\d{4}$/)?.[1];}
export function seasonalEventAdventure(eventId:string):SeasonalEventAdventure|undefined{
  const series=seasonalEventSeriesId(eventId);
  return series?adventures[series]:undefined;
}
export const SEASONAL_EVENT_ADVENTURES=Object.freeze(Object.values(adventures));
