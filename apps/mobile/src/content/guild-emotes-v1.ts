/**
 * Three exclusive five-emote packs using the existing authored pet-emote art.
 * Rewards are permanent account unlocks, not consumable inventory objects.
 * Every ID exists in chat-pilot/data/emotes.json and chat-emote-assets.ts.
 */
export const GUILD_EMOTE_PACKS={
 emotes_fellowship:['pet_set_a_01','pet_set_a_02','pet_set_a_03','pet_set_a_04','pet_set_a_05'],
 emotes_adventure:['pet_set_a_06','pet_set_a_07','pet_set_a_08','pet_set_a_09','pet_set_a_10'],
 emotes_legends:['pet_set_b_01','pet_set_b_02','pet_set_b_03','pet_set_b_04','pet_set_b_05'],
} as const;

export function guildEmotePackIds(id:string):readonly string[]{
 return Object.prototype.hasOwnProperty.call(GUILD_EMOTE_PACKS,id)
  ?GUILD_EMOTE_PACKS[id as keyof typeof GUILD_EMOTE_PACKS]:[];
}
