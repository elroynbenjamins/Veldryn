/** Proposed 2.0 presentation/content only. No live strings or achievement DB writes. */
export const SCOUTING_2_CONTENT_RELEASED=false as const;
export const EXPLORATION_2_SKILL_COPY={
 name:'Exploration',
 scopeLabel:'Account-wide skill',
 summary:'Send guides and companions to map routes, train Exploration and scout regional opportunities while your characters continue other activities.',
 passive:'Every 10 Exploration levels improves gathering speed and scouting speed for the whole account.',
 characterSlots:'Exploration does not count toward character-slot unlock requirements.',
} as const;
export const EXPLORATION_2_COMPANION_COPY={
 oldSection:'Expeditions',newSection:'Scouting',
 sanctuary:'Expedition Pens become Scouting Camps. Existing facility levels, capacity and duration reductions are preserved.',
 unlock:'Companions unlock through Into Ironwood as before. Basic Exploration never requires owning a companion.',
} as const;
export const EXPLORATION_2_QUEST_COPY={
 QST_003:{name:"A Hound's Trail",description:'Send a scout to trace the Ironwood paths and discover the Ironwood Wolf encounter.',story:'The wardens have found wolf tracks along the Ironwood verge. Send a local guide or spare companion ahead, then collect the report to reveal the pack’s trail. Existing Ironwood access is never removed.'},
} as const;
export const EXPLORATION_2_ACHIEVEMENTS=[
 {id:'exploration2_first_report',category:'Progression',name:'First Report',description:'Collect your first scouting report.',required:1,points:10,reward:{gold:100}},
 {id:'exploration2_asterfall_cartographer',category:'Collection',name:'Asterfall Cartographer',description:'Map every released Asterfall scouting route.',required:5,points:25,reward:{gold:500,titleId:'asterfall_trailblazer',titleName:'Asterfall Trailblazer'}},
 {id:'exploration2_sunscar_cartographer',category:'Collection',name:'Sunscar Cartographer',description:'Map every released Sunscar scouting route.',required:4,points:25,reward:{gold:750,titleId:'sunscar_cartographer',titleName:'Sunscar Cartographer'}},
 {id:'exploration2_frostmarch_cartographer',category:'Collection',name:'Frostmarch Cartographer',description:'Map every released Frostmarch scouting route.',required:4,points:25,reward:{gold:1000,titleId:'frostmarch_pathfinder',titleName:'Frostmarch Pathfinder'}},
 {id:'exploration2_known_realm',category:'Meta',name:'Cartographer of the Known Realm',description:'Complete every released regional scouting collection.',required:3,points:50,reward:{gold:2500,titleId:'known_realm_cartographer',titleName:'Cartographer of the Known Realm'}},
] as const;
