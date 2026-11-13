-- Disposable PostgreSQL TEST DATABASE bootstrap only. NEVER run on production.
-- No private Veldryn table or account data is loaded by this file.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public.characters (
 id uuid PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);
