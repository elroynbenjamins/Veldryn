export type ResourceMappingStatusV25='READY'|'NEEDS_ITEM_ID';
export interface CanonicalResourceV25{
  key:string;region:'Asterfall'|'Sunscar'|'Frostmarch';name:string;
  globalResourceId?:string;regionalResourceId?:string;itemId?:string;
  minLevel:number;source:string;status:ResourceMappingStatusV25;
}
const r=(v:CanonicalResourceV25)=>v;
export const EQUIPMENT_RESOURCE_MAP_V25:readonly CanonicalResourceV25[]=[
 r({key:'asterfall.copper_ore',region:'Asterfall',name:'Copper Ore',globalResourceId:'RES_001',itemId:'ITEM_0009',minLevel:1,source:'Old Mines / Mining',status:'READY'}),
 r({key:'asterfall.iron_ore',region:'Asterfall',name:'Iron Ore',globalResourceId:'RES_002',itemId:'ITEM_0010',minLevel:5,source:'Old Mines / Mining',status:'READY'}),
 r({key:'asterfall.dense_iron',region:'Asterfall',name:'Dense Iron Chunk',globalResourceId:'RES_003',itemId:'ITEM_0028',minLevel:15,source:'Old Mines / Mining',status:'READY'}),
 r({key:'asterfall.echo_quartz',region:'Asterfall',name:'Echo Quartz',globalResourceId:'RES_004',itemId:'ITEM_0029',minLevel:20,source:'Old Mines / Mining',status:'READY'}),
 r({key:'asterfall.oathsilver',region:'Asterfall',name:'Oathsilver Ore',globalResourceId:'RES_005',itemId:'ITEM_0030',minLevel:25,source:'Old Mines Deep / Mining',status:'READY'}),
 r({key:'asterfall.ironwood_log',region:'Asterfall',name:'Ironwood Log',globalResourceId:'RES_008',itemId:'ITEM_0008',minLevel:1,source:'Ironwood Forest / Woodcutting',status:'READY'}),
 r({key:'asterfall.heartwood_log',region:'Asterfall',name:'Heartwood Log',globalResourceId:'RES_009',itemId:'ITEM_0031',minLevel:15,source:'Ironwood Forest / Woodcutting',status:'READY'}),
 r({key:'asterfall.ironwood_resin',region:'Asterfall',name:'Ironwood Resin',globalResourceId:'RES_010',itemId:'ITEM_0032',minLevel:20,source:'Ironwood Forest / Woodcutting',status:'READY'}),
 r({key:'asterfall.ancient_timber',region:'Asterfall',name:'Ancient Timber',globalResourceId:'RES_011',itemId:'ITEM_0033',minLevel:25,source:'Ancient Growth / Woodcutting',status:'READY'}),
 r({key:'asterfall.greenleaf',region:'Asterfall',name:'Greenleaf',globalResourceId:'RES_020',itemId:'ITEM_0037',minLevel:1,source:'Greenfields / Herbalism',status:'READY'}),
 r({key:'asterfall.briarleaf',region:'Asterfall',name:'Briarleaf',globalResourceId:'RES_021',itemId:'ITEM_0038',minLevel:5,source:'Ironwood Forest / Herbalism',status:'READY'}),
 r({key:'asterfall.gloamcap',region:'Asterfall',name:'Gloamcap',globalResourceId:'RES_022',itemId:'ITEM_0039',minLevel:15,source:'Ironwood Forest / Herbalism',status:'READY'}),
 r({key:'asterfall.sunpetal',region:'Asterfall',name:'Sunpetal',globalResourceId:'RES_023',itemId:'ITEM_0040',minLevel:20,source:'Greenfields / Herbalism',status:'READY'}),
 r({key:'asterfall.oathbloom',region:'Asterfall',name:'Oathbloom',globalResourceId:'RES_024',itemId:'ITEM_0041',minLevel:25,source:"King's Road / Herbalism",status:'READY'}),
 r({key:'asterfall.wolf_pelt',region:'Asterfall',name:'Wolf Pelt',globalResourceId:'RES_026',itemId:'ITEM_0002',minLevel:5,source:'Ironwood Wolf / Hunting',status:'READY'}),
 r({key:'asterfall.fine_wolf_hide',region:'Asterfall',name:'Fine Wolf Hide',globalResourceId:'RES_027',itemId:'ITEM_0043',minLevel:15,source:'Ironwood Forest / Hunting',status:'READY'}),
 r({key:'asterfall.briarhorn',region:'Asterfall',name:'Briarhorn',globalResourceId:'RES_028',itemId:'ITEM_0044',minLevel:20,source:'Ironwood Forest / Hunting',status:'READY'}),
 r({key:'asterfall.echo_touched_pelt',region:'Asterfall',name:'Echo-Touched Pelt',globalResourceId:'RES_029',itemId:'ITEM_0045',minLevel:25,source:'Echo Hunt / Hunting',status:'READY'}),
 r({key:'asterfall.wisp_thread',region:'Asterfall',name:'Wisp Thread',itemId:'ITEM_0070',minLevel:5,source:'Field Wisp / Monster Drop',status:'READY'}),
 r({key:'asterfall.boar_tusk',region:'Asterfall',name:'Boar Tusk',itemId:'ITEM_0071',minLevel:8,source:'Roadside Boar / Monster Drop',status:'READY'}),
 r({key:'asterfall.mire_feather',region:'Asterfall',name:'Mire Feather',itemId:'ITEM_0073',minLevel:12,source:'Mire Heron / Monster Drop',status:'READY'}),
 r({key:'asterfall.drowned_token',region:'Asterfall',name:'Drowned Token',itemId:'ITEM_0074',minLevel:15,source:'Drowned Pilgrim / Monster Drop',status:'READY'}),
 r({key:'asterfall.ironback_plate',region:'Asterfall',name:'Ironback Plate',itemId:'ITEM_0076',minLevel:15,source:'Ironback Mole / Monster Drop',status:'READY'}),
 r({key:'asterfall.echo_bat_wing',region:'Asterfall',name:'Echo Bat Wing',itemId:'ITEM_0077',minLevel:15,source:'Echo Bat / Monster Drop',status:'READY'}),
 r({key:'asterfall.runebound_core',region:'Asterfall',name:'Runebound Core',itemId:'ITEM_0078',minLevel:20,source:'Runebound Miner / Monster Drop',status:'READY'}),
 r({key:'asterfall.torn_oathcloth',region:'Asterfall',name:'Torn Oathcloth',itemId:'ITEM_0079',minLevel:12,source:'Oathbound Squire / Monster Drop',status:'READY'}),
 r({key:'asterfall.banner_ash',region:'Asterfall',name:'Banner Ash',itemId:'ITEM_0080',minLevel:15,source:'Banner Shade / Monster Drop',status:'READY'}),
 r({key:'asterfall.fallen_rivet',region:'Asterfall',name:'Fallen Rivet',itemId:'ITEM_0081',minLevel:18,source:'Fallen Sentinel / Monster Drop',status:'READY'}),
 r({key:'asterfall.oathglass_fragment',region:'Asterfall',name:'Oathglass Fragment',itemId:'ITEM_0082',minLevel:22,source:'Oathglass Revenant / Monster Drop',status:'READY'}),
 r({key:'asterfall.rootbound_fibers',region:'Asterfall',name:'Rootbound Fibers',itemId:'ITEM_0083',minLevel:12,source:'COP_001 Rootbound Vault',status:'READY'}),
 r({key:'asterfall.lanternsteel_shard',region:'Asterfall',name:'Lanternsteel Shard',itemId:'ITEM_0084',minLevel:18,source:'COP_002 Lanternwatch Siege',status:'READY'}),

 r({key:'sunscar.sunstone_ore',region:'Sunscar',name:'Sunstone Ore',globalResourceId:'RES_006',regionalResourceId:'SUNRES_001',itemId:'SUNSTONE_ORE',minLevel:28,source:'Scorchwind Flats / Mining',status:'READY'}),
 r({key:'sunscar.amberglass',region:'Sunscar',name:'Amberglass',globalResourceId:'RES_030',regionalResourceId:'SUNRES_002',itemId:'AMBERGLASS',minLevel:36,source:'Buried Observatory / Mining',status:'READY'}),
 r({key:'sunscar.saffron_reed',region:'Sunscar',name:'Saffron Reed',globalResourceId:'RES_031',regionalResourceId:'SUNRES_003',itemId:'SAFFRON_REED',minLevel:32,source:'Mirage Basin / Herbalism',status:'READY'}),
 r({key:'sunscar.mirage_bloom',region:'Sunscar',name:'Mirage Bloom',regionalResourceId:'SUNRES_004',itemId:'MIRAGE_BLOOM',minLevel:36,source:'Mirage Basin / Herbalism',status:'READY'}),
 r({key:'sunscar.dunewood',region:'Sunscar',name:'Dunewood',globalResourceId:'RES_012',regionalResourceId:'SUNRES_005',itemId:'DUNEWOOD',minLevel:26,source:'Saffron Gate / Woodcutting',status:'READY'}),
 r({key:'sunscar.charbark',region:'Sunscar',name:'Charbark',regionalResourceId:'SUNRES_006',itemId:'CHARBARK',minLevel:33,source:'Scorchwind Flats / Woodcutting',status:'READY'}),
 r({key:'sunscar.oasis_carp',region:'Sunscar',name:'Oasis Carp',globalResourceId:'RES_018',regionalResourceId:'SUNRES_007',itemId:'OASIS_CARP',minLevel:32,source:'Mirage Basin / Fishing',status:'READY'}),
 r({key:'sunscar.glassfin',region:'Sunscar',name:'Glassfin',regionalResourceId:'SUNRES_008',itemId:'GLASSFIN',minLevel:37,source:'Mirage Basin / Fishing',status:'READY'}),
 r({key:'sunscar.scorpion_venom',region:'Sunscar',name:'Scorpion Venom',regionalResourceId:'SUNRES_009',itemId:'SCORPION_VENOM',minLevel:32,source:'Sunspine Scorpion / Hunting',status:'READY'}),
 r({key:'sunscar.royal_chitin',region:'Sunscar',name:'Royal Chitin',regionalResourceId:'SUNRES_010',itemId:'ROYAL_CHITIN',minLevel:43,source:"Tyrant's Crown / Combat",status:'READY'}),
 r({key:'sunscar.astral_script',region:'Sunscar',name:'Astral Script',regionalResourceId:'SUNRES_011',itemId:'ASTRAL_SCRIPT',minLevel:39,source:'Buried Observatory / Combat',status:'READY'}),
 r({key:'sunscar.tyrant_seal',region:'Sunscar',name:'Tyrant Seal',regionalResourceId:'SUNRES_012',itemId:'TYRANT_SEAL',minLevel:45,source:'Tyrant Herald/Boss / Combat',status:'READY'}),

 r({key:'frostmarch.whitepine_log',region:'Frostmarch',name:'Whitepine Log',globalResourceId:'RES_013',regionalResourceId:'FRRES_001',itemId:'WHITEPINE_LOG',minLevel:48,source:'Whitepine Reach / Woodcutting',status:'READY'}),
 r({key:'frostmarch.rime_resin',region:'Frostmarch',name:'Rime Resin',regionalResourceId:'FRRES_002',itemId:'RIME_RESIN',minLevel:53,source:'Whitepine Reach / Woodcutting',status:'READY'}),
 r({key:'frostmarch.frostiron',region:'Frostmarch',name:'Frostiron',globalResourceId:'RES_007',regionalResourceId:'FRRES_003',itemId:'FROSTIRON',minLevel:46,source:'Thawgate / Mining',status:'READY'}),
 r({key:'frostmarch.rimeglass',region:'Frostmarch',name:'Rimeglass',globalResourceId:'RES_032',regionalResourceId:'FRRES_004',itemId:'RIMEGLASS',minLevel:60,source:'Choir Caverns / Mining',status:'READY'}),
 r({key:'frostmarch.wintermint',region:'Frostmarch',name:'Wintermint',globalResourceId:'RES_033',regionalResourceId:'FRRES_005',itemId:'WINTERMINT',minLevel:49,source:'Whitepine Reach / Herbalism',status:'READY'}),
 r({key:'frostmarch.choir_bloom',region:'Frostmarch',name:'Choir Bloom',regionalResourceId:'FRRES_006',itemId:'CHOIR_BLOOM',minLevel:61,source:'Choir Caverns / Herbalism',status:'READY'}),
 r({key:'frostmarch.icefin',region:'Frostmarch',name:'Icefin',globalResourceId:'RES_019',regionalResourceId:'FRRES_007',itemId:'ICEFIN',minLevel:52,source:'Shiverlake / Fishing',status:'READY'}),
 r({key:'frostmarch.bellfin_scale',region:'Frostmarch',name:'Bellfin Scale',regionalResourceId:'FRRES_008',itemId:'BELLFIN_SCALE',minLevel:57,source:'Shiverlake / Fishing',status:'READY'}),
 r({key:'frostmarch.wyrm_scale',region:'Frostmarch',name:'Wyrm Scale',regionalResourceId:'FRRES_009',itemId:'WYRMSCALE',minLevel:67,source:'Wyrmspine / Combat',status:'READY'}),
 r({key:'frostmarch.frozen_heart',region:'Frostmarch',name:'Frozen Heart',regionalResourceId:'FRRES_010',itemId:'FROZEN_HEART',minLevel:70,source:'Frost Wyrm / Boss',status:'READY'})
];
const byKey=new Map(EQUIPMENT_RESOURCE_MAP_V25.map(v=>[v.key,v] as const));
export function canonicalResourceV25(key:string):CanonicalResourceV25{const v=byKey.get(key);if(!v)throw new Error(`unknown_equipment_resource:${key}`);return v;}
export function resourceAvailableAtLevelV25(key:string,requiredLevel:number):boolean{return canonicalResourceV25(key).minLevel<=requiredLevel;}
export function inventoryItemIdV25(key:string):string{const v=canonicalResourceV25(key);if(!v.itemId)throw new Error(`equipment_resource_item_registration_required:${key}:${v.regionalResourceId??v.globalResourceId??'no_resource_id'}`);return v.itemId;}
export function missingItemRegistrationsV25(){return EQUIPMENT_RESOURCE_MAP_V25.filter(v=>!v.itemId);}
