/** Draft material-funded Guild Construction upgrades.
 * Requirements are EXACTLY 10x the earlier 12–40 / 8–35 commission proposals.
 * They are separate from automatic Guild Hall v44 facility tiers.
 * No entry becomes spendable until its SQL release flag is explicitly enabled
 * AND its promised rewards are implemented and verified in staging.
 */
export interface GuildConstructionBlueprint {
 id:string;name:string;requiredGuildLevel:number;
 materials:ReadonlyArray<{itemId:string;amount:number}>;
 benefit:string;description:string;rewardKind:'appearance'|'utility'|'future';
}
export const GUILD_CONSTRUCTION_BLUEPRINTS:readonly GuildConstructionBlueprint[]=[
 {id:"construction_hall_1",name:"Guild Hall I",requiredGuildLevel:1,materials:[{itemId:'GUILD_IRON_BRACKET',amount:120},{itemId:'GUILD_PENNANT',amount:100}],benefit:"Founder's Hall facade",description:"A headquarters milestone and first guild construction showcase.",rewardKind:'appearance'},
 {id:"construction_forge_1",name:"Guild Forge I",requiredGuildLevel:5,materials:[{itemId:'GUILD_IRON_BRACKET',amount:180},{itemId:'GUILD_PENNANT',amount:80}],benefit:"Commission forge",description:"Visual guild workshop and Smithing commission collection.",rewardKind:'utility'},
 {id:"construction_library_1",name:"Guild Library I",requiredGuildLevel:5,materials:[{itemId:'GUILD_IRON_BRACKET',amount:80},{itemId:'GUILD_PENNANT',amount:200}],benefit:"Research library",description:"Guild research archive and Tailoring commission showcase.",rewardKind:'utility'},
 {id:"construction_treasury_1",name:"Guild Treasury I",requiredGuildLevel:8,materials:[{itemId:'GUILD_IRON_BRACKET',amount:160},{itemId:'GUILD_RESINBOUND_CANVAS',amount:120}],benefit:"Contribution archive",description:"Persistent donation history and contribution milestones.",rewardKind:'utility'},
 {id:"construction_hall_2",name:"Guild Hall II",requiredGuildLevel:10,materials:[{itemId:'GUILD_HEARTIRON_SUPPORT',amount:300},{itemId:'GUILD_RESINBOUND_CANVAS',amount:240}],benefit:"Established Hall facade",description:"Expanded guild identity and a second hall showcase.",rewardKind:'appearance'},
 {id:"construction_war_room_1",name:"War Room I",requiredGuildLevel:10,materials:[{itemId:'GUILD_HEARTIRON_SUPPORT',amount:200},{itemId:'GUILD_PENNANT',amount:180}],benefit:"Raid intelligence",description:"Dedicated guild-boss information and raid preparation summary.",rewardKind:'utility'},
 {id:"construction_expedition_1",name:"Expedition Lodge I",requiredGuildLevel:12,materials:[{itemId:'GUILD_HEARTIRON_SUPPORT',amount:240},{itemId:'GUILD_RESINBOUND_CANVAS',amount:240}],benefit:"Expedition contracts",description:"Future rotating guild expedition contract board.",rewardKind:'future'},
 {id:"construction_forge_2",name:"Guild Forge II",requiredGuildLevel:20,materials:[{itemId:'GUILD_OATHSILVER_FITTING',amount:300},{itemId:'GUILD_ECHO_WOVEN_BANNER',amount:160}],benefit:"Master forge",description:"Proposed +1% guild-only crafting speed (requires server integration).",rewardKind:'future'},
 {id:"construction_library_2",name:"Guild Library II",requiredGuildLevel:20,materials:[{itemId:'GUILD_OATHSILVER_FITTING',amount:160},{itemId:'GUILD_ECHO_WOVEN_BANNER',amount:300}],benefit:"Advanced research",description:"Proposed +1% non-combat Guild skill XP (requires server integration).",rewardKind:'future'},
 {id:"construction_treasury_2",name:"Guild Treasury II",requiredGuildLevel:25,materials:[{itemId:'GUILD_OATHSILVER_FITTING',amount:240},{itemId:'GUILD_ECHO_WOVEN_BANNER',amount:200}],benefit:"Grand treasury",description:"Additional contribution rankings and guild reserve history.",rewardKind:'future'},
 {id:"construction_hall_3",name:"Guild Hall III",requiredGuildLevel:25,materials:[{itemId:'GUILD_OATHSILVER_FITTING',amount:400},{itemId:'GUILD_ECHO_WOVEN_BANNER',amount:320}],benefit:"Great Hall facade",description:"Expanded trophy displays and a Guild Hall cosmetic milestone.",rewardKind:'appearance'},
 {id:"construction_war_room_2",name:"War Room II",requiredGuildLevel:30,materials:[{itemId:'GUILD_OATHSILVER_FITTING',amount:300},{itemId:'GUILD_ECHO_WOVEN_BANNER',amount:250}],benefit:"Battle doctrine",description:"Proposed +1% Guild boss damage (requires server integration).",rewardKind:'future'},
 {id:"construction_expedition_2",name:"Expedition Lodge II",requiredGuildLevel:30,materials:[{itemId:'GUILD_OATHSILVER_FITTING',amount:250},{itemId:'GUILD_ECHO_WOVEN_BANNER',amount:240}],benefit:"Master contracts",description:"Additional expedition contract rotation variety (future mode).",rewardKind:'future'},
 {id:"construction_forge_3",name:"Guild Forge III",requiredGuildLevel:35,materials:[{itemId:'GUILD_FROSTIRON_FRAME',amount:300},{itemId:'GUILD_WINTERVEIL_STANDARD',amount:240}],benefit:"Legendary forge",description:"Proposed +2% total guild-only crafting speed, not stacking +1%.",rewardKind:'future'},
 {id:"construction_library_3",name:"Guild Library III",requiredGuildLevel:35,materials:[{itemId:'GUILD_FROSTIRON_FRAME',amount:200},{itemId:'GUILD_WINTERVEIL_STANDARD',amount:300}],benefit:"Grand library",description:"Proposed +2% total non-combat Guild skill XP, not stacking +1%.",rewardKind:'future'},
 {id:"construction_hall_4",name:"Guild Hall IV",requiredGuildLevel:40,materials:[{itemId:'GUILD_FROSTIRON_FRAME',amount:400},{itemId:'GUILD_WINTERVEIL_STANDARD',amount:350}],benefit:"Grand Hall facade",description:"Prestige guild hall appearance and additional trophy display.",rewardKind:'appearance'},
 {id:"construction_war_room_3",name:"War Room III",requiredGuildLevel:45,materials:[{itemId:'GUILD_EMBERSTEEL_REINFORCEMENT',amount:320},{itemId:'GUILD_ASHEN_WAR_BANNER',amount:300}],benefit:"War council",description:"Proposed +2% total Guild boss damage, not stacking +1%.",rewardKind:'future'},
];
export const guildConstructionBlueprint=(id:string)=>GUILD_CONSTRUCTION_BLUEPRINTS.find(row=>row.id===id);
