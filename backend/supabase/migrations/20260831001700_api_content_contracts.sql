-- v1.5: client bootstrap/content compatibility and API request receipts.
create table if not exists public.client_builds(
 build_number integer primary key, platform text not null, minimum_content_version text not null,
 latest_content_version text not null, force_update boolean not null default false,
 released_at timestamptz not null default now()
);
create table if not exists public.api_request_receipts(
 account_id uuid not null, endpoint text not null, idempotency_key text not null,
 request_hash text not null, response_json jsonb, status text not null default 'started',
 created_at timestamptz not null default now(), completed_at timestamptz,
 primary key(account_id,endpoint,idempotency_key)
);
create table if not exists public.content_manifests(
 content_version text primary key, schema_version integer not null, manifest_hash text not null,
 minimum_client_build integer not null, published_at timestamptz not null default now(), active boolean not null default false
);
