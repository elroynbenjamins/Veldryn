# Veldryn — Multi-character social identity and reward ownership v1

**Date:** 14 November 2026  
**Status:** implementation specification; party domain helper/tests drafted on feature branch. **Not a production migration.**

## Contract

**Account identity owns social memberships, votes, eligibility, limits, progress, currencies, and one-time claims. Characters own combat loadouts, class/role, equipment, level/XP, and personal battle records.** Switching characters must not leave a party, consume a second guild slot, mint additional reward eligibility, reset social progress, or turn one account into multiple leaderboard entrants.

| Feature | Membership / participation | Rewards and limits |
| --- | --- | --- |
| Guild, guild chat, projects, votes, shop | Account membership; any active owned character contributes | Account-wide membership, currency, contribution, voting, purchase/claim caps |
| Persistent Party, chat, contracts | One account per slot (max four accounts); active fighter may change | Account-wide contract contribution/reward records |
| Live Dungeons | Each queued *character* must be eligible; freeze selected character/loadout at ready check | Keep existing dungeon reward cadence, account-wide claim restrictions where applicable |
| Future Party Events | Account is roster participant; selected eligible owned character may vary until a documented lock/freeze boundary | Event progress, rank, contribution caps and reward cache one per account |
| World Boss | Any eligible owned character may initiate an attempt or publish its Echo; account owns the event attempt pool | Shared account attempts, milestones, War Supplies caps, World Sigils, and claim records |
| Guild PvE | Any eligible owned character may enter; preserve run snapshots | Account-based attempts and weekly event entitlement |
| Daily/weekly/monthly claims | Any owned character can open the UI | One grant per (account, period/event, reward identity) |

## Existing server findings

- `backend/src/server/social/party.ts` already validates unique account membership and account-based leadership.
- `public.party_members` already has `account_id` and a partial unique index ensuring only one active party per account.
- Guild repository membership is account keyed.
- `backend/src/server/liveops/reward-service.ts` grants Party Event milestone and ranking bundles with account keys and a claim lock; the party-binding IDs in some keys are safe only while binding remains immutable.
- `backend/src/server/shared-world/world-boss-service.ts` reserves attempts for an account and a selected character and counts attempted fights by account; settling validates the frozen character ID.
- **Known switching gap:** `public.commit_online_game_server_v1` (roster persistence migration dated 17 October) reads `public.party_members` by **active character ID**, and `public.settle_party_activity_v16` also joins party membership by **character ID**. An alternate character may therefore fail to credit Party Contract progress. `party_social_state_v16` still projects the character captured on party join rather than the currently selected character.
- The existing `party_members` primary key is `(party_id, character_id)`. Blindly changing `character_id` on switch can collide with historical membership rows and reset or confuse event attribution. **Do not patch this by leaving and rejoining, deleting historical rows, or directly rewriting primary keys.**

## Character switch invariants

1. Resolve the active character from trusted server roster state and verify `characters.account_id`. Never trust a client-supplied role/ownership list.
2. Party membership remains the same `party_id + account_id`, with the same `joined_at`, contribution balance, chat access, and party leadership.
3. Active character and class role may change **between** battles; Live Dungeon 1 Tank / 2 Damage / 1 Support composition is re-evaluated before ready-check. Never mutate a frozen run/boss snapshot mid-combat.
4. Maintain `character_selected_at` or a selection epoch alongside account-based party attribution, so banked activity started before selection cannot back-credit the new Party.
5. Social listing displays the selected character name/class/role; leadership is derived from `leader_account_id`, not the last joined character.
6. Revoked, deleted, locked, or not-yet-eligible characters cannot start new combat. This does not remove the account's Party/Guild membership.
7. A successful character switch must not generate a second entry in any event ranking or an additional claimable reward.

## Reward entitlement rules

- Store a **server-authored** logical entitlement identified by `(account_id, event_or_period_id, reward_kind, milestone_or_tier_id)`; guard uniqueness in the database and settlement layer. Return existing receipt on retries.
- Per-character combat results may include `character_id`, but **never** incorporate character ID into a one-claim-per-account entitlement key.
- Character-specific XP goes to the fighter frozen in the combat receipt. Account currencies/cosmetics go to the account regardless of who claims.
- For items requiring a character inventory, accept a server-verified eligible destination character at claim time and store that target on the immutable claim receipt. A failed delivery must not mark a successful claim; retries must not duplicate items.
- Existing Party Event binding to a party remains stable once locked. Future reward services should deduplicate by account and event entitlement even if party membership changes.
- Guild/Party Event leaderboards aggregate account participation; character-level statistics may be displayed as detail but cannot create new ranked entrants.

## World Boss detail

Every character can participate **in turn**, provided that character meets the content gate. They share the existing account attempt pool rather than receive one pool each. The server stores the initiating `character_id` on each attempt, freezes the loadout, and permits the next unspent account attempt to use another owned character. Echo appearances for other players never consume attempts or grant repeat rewards. World Sigils, supply caps, personal milestones and final claims remain account-bound.

## Rollout / completion gates

1. **Pure domain model/tests (this branch):** introduce `switchPersistentPartyCharacter`, preserving account slot and leader ownership, recomputing role, checking trusted character ownership and denying switches during locked activity.
2. **Database migration (not implemented by the helper alone):** decouple Party membership identity from currently selected character; update both online and receipt-based contribution attribution, plus Party roster projection. Preserve existing rows and joined-at timestamps. Test historical party joins, inactive members, rollback, concurrent switches/settlement, and pre-selection banked work before deploy.
3. **Server endpoint and client wiring (pending):** invoke the authoritative selection flow when roster changes. Refresh Party/Guild panels, ready-check and profile display. Show a concise `Character changed` toast, not a membership leave/join.
4. **Unified reward entitlements (pending):** audit daily, weekly, monthly, guild, Party Event and World Boss claim paths. Guard concurrency and delivery idempotency at the database level.
5. **Staging verification (pending):** two-character same-account checks; character switching while in guild/party; two simultaneous claim requests; boss attempts split across characters; role restrictions; out-of-order receipts; Guild leadership; fail/rollback recovery. No production deployment without staging pass.

## Acceptance scenarios

- Player joins Party as Damage, switches to Support, retains one slot and chat, and the lobby updates class/role. A Party Contract contribution earned by the new active character counts only once.
- Player leads a Party, switches characters, remains leader. Leaving transfers leadership by account.
- Four accounts with five characters each still form a four-member Party, not twenty members.
- All eligible characters can join World Boss attempts sequentially, but the account total cannot exceed the event cap; rewards and ranks cannot duplicate.
- Claiming an event cache on Character B marks it claimed for Characters A–E. Retrying or clicking concurrently never grants another copy.
- A fight started on Character A and completed after selecting B still attributes XP and combat details to A; battle snapshots are not retroactively changed.
