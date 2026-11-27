-- Local disposable PostgreSQL fixture only. Never run on Supabase.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key);
create table public.parties(id uuid primary key,status text not null);
create table public.characters(id uuid primary key,account_id uuid not null references auth.users(id),
 class_id text not null,level integer not null,unique(id,account_id));
create table public.chat_messages(id uuid primary key,account_id uuid,channel_type text not null,channel_id text not null,is_system boolean not null);
create table public.party_members(party_id uuid not null references public.parties(id),
 character_id uuid not null references public.characters(id),account_id uuid not null,
 role text not null,joined_at timestamptz not null,left_at timestamptz,
 primary key(party_id,character_id));
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.parties values ('00000000-0000-0000-0000-000000000010','active');
insert into public.characters values
 ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','IRONWARDEN',25),
 ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','WAYFINDER',25),
 ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000002','RAVAGER',25),
 ('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000002','BASTION',25);
insert into public.party_members values
 ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','tank','2026-11-01 00:00:00+00',null),
 ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','damage','2026-10-01 00:00:00+00','2026-10-02 00:00:00+00'),
 ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000002','damage','2026-11-01 00:00:00+00',null);
