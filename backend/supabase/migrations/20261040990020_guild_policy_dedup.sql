-- Remove equivalent permissive guild policies left by historical migrations.
-- Keep the canonical original names used by the current schema/tests.

drop policy if exists guild_public_browse on public.guilds;
drop policy if exists guild_application_owner_read on public.guild_applications;
