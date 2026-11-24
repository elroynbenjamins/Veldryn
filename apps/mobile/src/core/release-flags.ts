/** Enable the event client; the authoritative server window controls access and rewards. */
export const EVENTS_RELEASED=true;
/** Prepared Frostfall rewards stay out of all player catalogs until the seasonal launch is explicitly approved. */
export const FROSTFALL_REWARDS_RELEASED=false;
/** Pause shared event-wide contribution goals until the active population can support them.
 * Preserve authored rewards and earned records for a future opt-in release. */
export const EVENT_COMMUNITY_ENABLED=false;
/** Arena is authored and testable, but stays out of the release build until its authenticated service ships. */
export const ARENA_RELEASED=false;

/** Prestige boards are paused while guild progression is being completed. */
export const RANKINGS_RELEASED=false;

/** Internal inventory audit only; no market UI, listings or transfers are released. */
export const PLAYER_MARKET_RELEASED=false;
/** Independent launch prerequisite: authenticated Market Edge write/read routes are not mounted. */
export const MARKET_AUTHENTICATED_SERVICE_READY=false;

/** Dungeon Marks Shop authored across three regions; keep collectible passives and shop UI hidden until server and art release. */
export const DUNGEON_MARKS_SHOP_RELEASED=false;

/** Keep manual translation invisible until the provider, public privacy disclosure and staging QA pass. */
export const CHAT_TRANSLATION_RELEASED=false;

/** Production RPC verified: authenticated-only roster, block filtering, no emails or session secrets. */
export const ONLINE_PLAYER_ROSTER_RELEASED=true;

/** Vendor equipment resale uplift is source-prepared only. Gameplay Edge and staging payout parity must be proved before activation. */
export const EQUIPMENT_RESALE_UPLIFT_RELEASED=false;

/** Account-wide Social Name and independent 3-hero showcases require production RPC/migration + Android approval. */
export const ACCOUNT_SOCIAL_IDENTITY_RELEASED=false;

/** Ascendant blessing settlement remains disabled until its server/economy implementation is released. */
export const ASCENDANT_PROGRESSION_BLESSINGS_RELEASED=false;
/** Separate non-P2W fuse: requires an approved gameplay-earned path to the same 5% pet and 3% background power. */
export const ASCENDANT_BLESSING_PARITY_APPROVED=false;

/** Animated profile collections are implemented for QA but stay hidden until binary art, public projection and native approval are complete. */
export const PROFILE_ANIMATED_COSMETICS_RELEASED=false;

/** Cosmetics catalog is authored but checkout/tab exposure stays hidden until commerce products, server grants, migration and native QA are approved. */
export const PROFILE_COSMETICS_STORE_RELEASED=false;
