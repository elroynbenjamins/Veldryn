import type {ImageSourcePropType} from 'react-native';

/** Guild-exclusive crafted construction resources.
 * The keys are stable and separate from ordinary gatherable resources.
 * Only the authoritative server's active project requirements make them donatable.
 * No donor balance, recipe cost, or release gate is decided by this file.
 */
export const GUILD_UPGRADE_COMPONENTS={
 GUILD_REINFORCED_TIMBER:{name:'Reinforced Timber Bundle',skill:'Smithing'},
 GUILD_MASONS_KEYSTONE:{name:"Mason's Keystone",skill:'Smithing'},
 GUILD_FORGED_RIVETS:{name:'Forged Rivet Crate',skill:'Smithing'},
 GUILD_BANNERWEAVE:{name:'Bannerweave Cloth',skill:'Tailoring'},
 GUILD_HERALDIC_DYE:{name:'Heraldic Dye Flask',skill:'Tailoring'},
 GUILD_SEAL_WAX:{name:'Guild Seal Wax',skill:'Tailoring'},
 GUILD_FORTIFICATION_HINGES:{name:'Fortification Hinge Set',skill:'Smithing'},
 GUILD_BEACON_OIL:{name:'Beacon Oil Flask',skill:'Tailoring'},
} as const;

const images:Readonly<Record<keyof typeof GUILD_UPGRADE_COMPONENTS,ImageSourcePropType>>={
 GUILD_REINFORCED_TIMBER:require('../../assets/guild-components/guild_reinforced_timber.png'),
 GUILD_MASONS_KEYSTONE:require('../../assets/guild-components/guild_masons_keystone.png'),
 GUILD_FORGED_RIVETS:require('../../assets/guild-components/guild_forged_rivets.png'),
 GUILD_BANNERWEAVE:require('../../assets/guild-components/guild_bannerweave.png'),
 GUILD_HERALDIC_DYE:require('../../assets/guild-components/guild_heraldic_dye.png'),
 GUILD_SEAL_WAX:require('../../assets/guild-components/guild_seal_wax.png'),
 GUILD_FORTIFICATION_HINGES:require('../../assets/guild-components/guild_fortification_hinges.png'),
 GUILD_BEACON_OIL:require('../../assets/guild-components/guild_beacon_oil.png'),
};

/** Reusable in Guild Bank, Construction, Project resource goals and Recipe Codex. */
export function guildUpgradeComponentArtwork(key:string):ImageSourcePropType|undefined{
 return Object.prototype.hasOwnProperty.call(images,key)?images[key as keyof typeof images]:undefined;
}
export function guildUpgradeComponentName(key:string):string|undefined{
 return Object.prototype.hasOwnProperty.call(GUILD_UPGRADE_COMPONENTS,key)
  ?GUILD_UPGRADE_COMPONENTS[key as keyof typeof GUILD_UPGRADE_COMPONENTS].name:undefined;
}
