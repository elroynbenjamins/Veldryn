import { collectRewardBundleIds, hashDefinition, normalizeDefinition, scheduleValidation, validateDefinition } from '../_shared/liveops.js';
import { validateRemoteConfig } from '../_shared/operations.js';
import { canReverse, commandStatusAfterQueue, confirmationPhrase, roleRank, validateCommandRequest } from '../_shared/admin-control.js';
import { generateRedeemCode, hashRedeemCode, redeemCodeHint, validateRedeemCode } from '../_shared/redeem-codes.js';

const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };
const MUTATING_ACTIONS = new Set([
  'saveDraft','deleteDraft','saveTemplate','disableTemplate','cloneTemplateToDraft','cloneDefinitionToDraft',
  'publishDraft','scheduleDefinition','rescheduleInstance','cancelInstance','archiveInstance','clonePlayerEventSeason','applySeasonalCalendarPreset','schedulePlayerEvent','setPlayerEventEnabled','goLivePlayerEvent','endPlayerEventNow','saveReward','retryDeadLetter',
  'saveRemoteConfig','updateAlert','saveResetDefinition','retryResetRun','createSupportCase','updateSupportCase','addSupportNote',
  'queueAdminCommand','approveAdminCommand','cancelAdminCommand','retryAdminCommand','reverseAdminCommand','saveAnnouncement','cancelAnnouncement','saveAdminUser',
  'createRedeemCode','setRedeemCodeEnabled'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
    },
  });
}

function envConfig(env) {
  const config = {
    url: String(env.SUPABASE_URL ?? '').replace(/\/$/, ''),
    anon: String(env.SUPABASE_ANON_KEY ?? ''),
    service: String(env.SUPABASE_SERVICE_ROLE_KEY ?? ''),
  };
  if (!config.url || !config.anon || !config.service) throw new Error('server_not_configured');
  return config;
}

function assertOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  const configured = String(env.CONTROL_ALLOWED_ORIGIN ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  if (origin === requestOrigin || configured.includes(origin)) return;
  throw new Error('origin_not_allowed');
}

async function supabaseFetch(env, path, { method = 'GET', body, query = '', headers = {}, prefer = '' } = {}) {
  const cfg = envConfig(env);
  const url = `${cfg.url}${path}${query ? `?${query}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: {
      apikey: cfg.service,
      authorization: `Bearer ${cfg.service}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`supabase_${response.status}:${text.slice(0, 800)}`);
    error.status = response.status;
    throw error;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function verifyUser(request, env) {
  const cfg = envConfig(env);
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) throw new Error('authentication_required');
  const response = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: { apikey: cfg.anon, authorization },
  });
  if (!response.ok) throw new Error('invalid_session');
  const user = await response.json();
  if (!user?.id) throw new Error('invalid_session');
  const rows = await supabaseFetch(env, '/rest/v1/liveops_admin_users', {
    query: `select=account_id,role,display_name,enabled&account_id=eq.${encodeURIComponent(user.id)}&enabled=eq.true&limit=1`,
  });
  const admin = rows?.[0];
  if (!admin) throw new Error('admin_access_required');
  return { user, admin };
}

function requireRole(actor, role) {
  if ((ROLE_RANK[actor.admin.role] ?? 0) < ROLE_RANK[role]) throw new Error('insufficient_admin_role');
}

async function audit(env, actor, action, targetType, targetId, detail = {}) {
  await supabaseFetch(env, '/rest/v1/liveops_admin_audit_log', {
    method: 'POST',
    body: {
      actor_account_id: actor.user.id,
      actor_email: actor.user.email ?? null,
      actor_role: actor.admin.role,
      action,
      target_type: targetType,
      target_id: String(targetId ?? ''),
      detail_json: detail,
    },
    prefer: 'return=minimal',
  });
}

function encodeEq(value) { return encodeURIComponent(String(value)); }
async function single(env, table, filters, select = '*') {
  const rows = await supabaseFetch(env, `/rest/v1/${table}`, { query: `select=${encodeURIComponent(select)}&${filters}&limit=1` });
  return rows?.[0] ?? null;
}
async function list(env, table, query) { return await supabaseFetch(env, `/rest/v1/${table}`, { query }); }
async function optionalList(env, table, query, warnings, label = table) {
  try { return await list(env, table, query) ?? []; }
  catch (error) { warnings?.push(`${label}: ${error instanceof Error ? error.message : String(error)}`); return []; }
}

async function countRows(env, table, filters = '') {
  const cfg = envConfig(env);
  const query = `select=*${filters ? `&${filters}` : ''}&limit=1`;
  const response = await fetch(`${cfg.url}/rest/v1/${table}?${query}`, {
    headers: { apikey: cfg.service, authorization: `Bearer ${cfg.service}`, prefer: 'count=exact' },
  });
  if (!response.ok) throw new Error(`count_failed:${table}`);
  const range = response.headers.get('content-range') ?? '0/0';
  return Number(range.split('/')[1] ?? 0) || 0;
}

async function loadRewardValidation(env, definition) {
  const ids = collectRewardBundleIds(definition);
  if (!ids.length) return { missing: [], unvalidated: [], disabled: [] };
  const query = `select=bundle_id,enabled,validated,label,tier&bundle_id=in.(${ids.map((id) => `"${id.replaceAll('"','')}"`).join(',')})`;
  const rows = await list(env, 'liveops_admin_reward_catalog', query);
  const byId = new Map((rows ?? []).map((row) => [row.bundle_id, row]));
  return {
    missing: ids.filter((id) => !byId.has(id)),
    unvalidated: ids.filter((id) => byId.has(id) && !byId.get(id).validated),
    disabled: ids.filter((id) => byId.has(id) && !byId.get(id).enabled),
  };
}

async function dashboard(env) {
  const [instances, playerEvents, drafts, audits, draftCount, healthRows, deadLetterCount, playerActivity,playerLifecycle] = await Promise.all([
    list(env, 'liveops_event_instances', 'select=id,event_id,definition_version,starts_at,ends_at,status,definition_snapshot&status=in.(scheduled,active,settling)&order=starts_at.asc&limit=40'),
    list(env, 'live_events', 'select=event_id,name,currency_id,enabled,starts_at,ends_at,grace_ends_at,priority,modules,config,updated_at&order=priority.desc,name.asc&limit=100'),
    list(env, 'liveops_event_drafts', 'select=id,name,status,updated_at,definition_json&status=eq.draft&order=updated_at.desc&limit=10'),
    list(env, 'liveops_admin_audit_log', 'select=id,actor_email,action,target_type,target_id,created_at&order=created_at.desc&limit=10'),
    countRows(env, 'liveops_event_drafts', 'status=eq.draft'),
    list(env, 'liveops_runtime_health', 'select=*&component=eq.party_liveops_worker&limit=1'),
    countRows(env, 'social_contribution_outbox', 'status=eq.dead_letter'),
    playerActivityAnalytics(env,{days:30}).catch(()=>null),
    playerLifecycleAnalytics(env,{days:30}).catch(()=>null),
  ]);
  const nowMs = Date.now();
  const active = (instances ?? []).filter((row) => row.status === 'active' || (row.status === 'scheduled' && Date.parse(row.starts_at) <= nowMs && Date.parse(row.ends_at) > nowMs));
  const scheduled = (instances ?? []).filter((row) => row.status === 'scheduled' && Date.parse(row.starts_at) > nowMs);
  const settling = (instances ?? []).filter((row) => row.status === 'settling');
  const visiblePlayerEvent=(playerEvents??[]).find(row=>['live','claiming'].includes(playerEventRuntimePhase(row,nowMs)))??null;
  let playerEventHealth=null;
  if(visiblePlayerEvent){
    try{playerEventHealth=await playerEventAnalytics(env,{eventId:visiblePlayerEvent.event_id});}
    catch{/* Keep the dashboard usable while the analytics migration is deploying. */}
  }
  return {
    counts: { active: active.length, scheduled: scheduled.length, settling: settling.length, drafts: draftCount, deadLetters: deadLetterCount },
    active: active[0] ?? null,
    next: scheduled[0] ?? null,
    workerHealth: healthRows?.[0] ?? null,
    playerEvents: playerEvents ?? [],
    playerEventHealth,
    playerActivity,
    playerLifecycle,
    drafts: drafts ?? [],
    audits: audits ?? [],
  };
}

async function saveDraft(env, actor, payload) {
  requireRole(actor, 'editor');
  const definition = normalizeDefinition(payload.definition);
  const schedule = payload.schedule && typeof payload.schedule === 'object' ? payload.schedule : {};
  const name = String(payload.name || definition.name || 'Untitled event').trim().slice(0, 120);
  const existing = payload.id ? await single(env, 'liveops_event_drafts', `id=eq.${encodeEq(payload.id)}`) : null;
  let row;
  if (existing) {
    const rows = await supabaseFetch(env, '/rest/v1/liveops_event_drafts', {
      method: 'PATCH',
      query: `id=eq.${encodeEq(payload.id)}`,
      body: { name, definition_json: definition, schedule_json: schedule, status: 'draft', updated_by: actor.user.id, updated_at: new Date().toISOString() },
      prefer: 'return=representation',
    });
    row = rows?.[0];
  } else {
    const rows = await supabaseFetch(env, '/rest/v1/liveops_event_drafts', {
      method: 'POST',
      body: { name, definition_json: definition, schedule_json: schedule, status: 'draft', created_by: actor.user.id, updated_by: actor.user.id },
      prefer: 'return=representation',
    });
    row = rows?.[0];
  }
  await audit(env, actor, existing ? 'draft.update' : 'draft.create', 'event_draft', row?.id, { name, eventId: definition.id, version: definition.version });
  return row;
}

async function deleteDraft(env, actor, payload) {
  requireRole(actor, 'editor');
  const draft = await single(env, 'liveops_event_drafts', `id=eq.${encodeEq(payload.id)}`);
  if (!draft) throw new Error('draft_not_found');
  await supabaseFetch(env, '/rest/v1/liveops_event_drafts', { method: 'DELETE', query: `id=eq.${encodeEq(payload.id)}`, prefer: 'return=minimal' });
  await audit(env, actor, 'draft.delete', 'event_draft', payload.id, { name: draft.name });
  return { deleted: true };
}

async function saveTemplate(env, actor, payload) {
  requireRole(actor, 'editor');
  const result = validateDefinition(payload.definition);
  if (result.errors.length) return { saved: false, validation: result };
  const templateId = String(payload.templateId || result.definition.id).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 80);
  const body = {
    template_id: templateId,
    name: String(payload.name || result.definition.name).slice(0,120),
    description: String(payload.description || result.definition.shortDescription).slice(0,300),
    definition_json: result.definition,
    enabled: payload.enabled !== false,
    source: 'admin',
    updated_by: actor.user.id,
    updated_at: new Date().toISOString(),
  };
  const rows = await supabaseFetch(env, '/rest/v1/liveops_admin_templates', { method: 'POST', body, query: 'on_conflict=template_id', prefer: 'resolution=merge-duplicates,return=representation' });
  await audit(env, actor, 'template.save', 'event_template', templateId, { name: body.name });
  return { saved: true, template: rows?.[0], validation: result };
}

async function cloneToDraft(env, actor, definition, name, source) {
  requireRole(actor, 'editor');
  const rows = await supabaseFetch(env, '/rest/v1/liveops_event_drafts', {
    method: 'POST',
    body: { name, definition_json: normalizeDefinition(definition), schedule_json: {}, status: 'draft', created_by: actor.user.id, updated_by: actor.user.id },
    prefer: 'return=representation',
  });
  const row = rows?.[0];
  await audit(env, actor, 'draft.clone', 'event_draft', row?.id, { source });
  return row;
}

async function publishDraft(env, actor, payload) {
  requireRole(actor, 'editor');
  const draft = await single(env, 'liveops_event_drafts', `id=eq.${encodeEq(payload.id)}`);
  if (!draft) throw new Error('draft_not_found');
  const validation = validateDefinition(draft.definition_json);
  if (validation.errors.length) return { published: false, validation };
  const rewardValidation = await loadRewardValidation(env, validation.definition);
  if (rewardValidation.missing.length || rewardValidation.unvalidated.length || rewardValidation.disabled.length) {
    return { published: false, validation, rewardValidation, error: 'reward_catalog_not_ready' };
  }
  const hash = await hashDefinition(validation.definition);
  const existing = await single(env, 'liveops_event_definitions', `event_id=eq.${encodeEq(validation.definition.id)}&version=eq.${validation.definition.version}`);
  let inserted = false;
  if (existing) {
    if (existing.config_hash !== hash) throw new Error('event_definition_version_conflict');
  } else {
    await supabaseFetch(env, '/rest/v1/liveops_event_definitions', {
      method: 'POST',
      body: { event_id: validation.definition.id, version: validation.definition.version, scope: 'party', definition_json: validation.definition, config_hash: hash, created_by: actor.user.id },
      prefer: 'return=minimal',
    });
    inserted = true;
  }
  await supabaseFetch(env, '/rest/v1/liveops_event_drafts', {
    method: 'PATCH',
    query: `id=eq.${encodeEq(payload.id)}`,
    body: { status: 'published', published_event_id: validation.definition.id, published_version: validation.definition.version, updated_by: actor.user.id, updated_at: new Date().toISOString() },
    prefer: 'return=minimal',
  });
  await audit(env, actor, 'definition.publish', 'event_definition', `${validation.definition.id}@${validation.definition.version}`, { draftId: payload.id, hash, inserted });
  return { published: true, inserted, configHash: hash, validation, rewardValidation };
}

async function scheduleDefinition(env, actor, payload) {
  requireRole(actor, 'editor');
  const eventId = String(payload.eventId ?? '');
  const version = Number(payload.version);
  const definitionRow = await single(env, 'liveops_event_definitions', `event_id=eq.${encodeEq(eventId)}&version=eq.${version}`);
  if (!definitionRow) throw new Error('definition_not_found');
  const definition = normalizeDefinition(definitionRow.definition_json);
  const startsAt = new Date(payload.startsAt).toISOString();
  const endsAt = new Date(payload.endsAt ?? (Date.parse(startsAt) + definition.durationHours * 3600000)).toISOString();
  const grace = Number(payload.settlementGraceMinutes ?? 10);
  const scheduleErrors = scheduleValidation(definition, startsAt, endsAt, grace);
  if (scheduleErrors.length) return { scheduled: false, errors: scheduleErrors };
  const rows = await supabaseFetch(env, '/rest/v1/liveops_event_instances', {
    method: 'POST',
    body: {
      event_id: eventId,
      definition_version: version,
      definition_snapshot: definition,
      config_hash: definitionRow.config_hash,
      starts_at: startsAt,
      ends_at: endsAt,
      settlement_grace_minutes: grace,
      status: 'scheduled',
    },
    prefer: 'return=representation',
  });
  const row = rows?.[0];
  await audit(env, actor, 'event.schedule', 'event_instance', row?.id, { eventId, version, startsAt, endsAt, grace });
  return { scheduled: true, instance: row };
}

async function rescheduleInstance(env, actor, payload) {
  requireRole(actor, 'editor');
  const row = await single(env, 'liveops_event_instances', `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error('event_instance_not_found');
  if (row.status !== 'scheduled') throw new Error('only_scheduled_events_can_be_rescheduled');
  const startsAt = new Date(payload.startsAt).toISOString();
  const endsAt = new Date(payload.endsAt).toISOString();
  const grace = Number(payload.settlementGraceMinutes ?? row.settlement_grace_minutes);
  const errors = scheduleValidation(row.definition_snapshot, startsAt, endsAt, grace);
  if (errors.length) return { rescheduled: false, errors };
  const rows = await supabaseFetch(env, '/rest/v1/liveops_event_instances', {
    method: 'PATCH', query: `id=eq.${encodeEq(payload.id)}`,
    body: { starts_at: startsAt, ends_at: endsAt, settlement_grace_minutes: grace }, prefer: 'return=representation'
  });
  await audit(env, actor, 'event.reschedule', 'event_instance', payload.id, { before: { startsAt: row.starts_at, endsAt: row.ends_at }, after: { startsAt, endsAt }, grace });
  return { rescheduled: true, instance: rows?.[0] };
}

async function cancelInstance(env, actor, payload) {
  requireRole(actor, 'editor');
  const row = await single(env, 'liveops_event_instances', `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error('event_instance_not_found');
  if (!['scheduled','active','settling'].includes(row.status)) throw new Error('event_cannot_be_cancelled');
  const reason = String(payload.reason ?? '').trim();
  if (row.status !== 'scheduled') {
    requireRole(actor, 'owner');
    if (reason.length < 10) throw new Error('active_event_cancellation_requires_reason');
  }
  const rows = await supabaseFetch(env, '/rest/v1/liveops_event_instances', {
    method: 'PATCH', query: `id=eq.${encodeEq(payload.id)}`, body: { status: 'cancelled' }, prefer: 'return=representation'
  });
  await audit(env, actor, 'event.cancel', 'event_instance', payload.id, { priorStatus: row.status, reason });
  return { cancelled: true, instance: rows?.[0] };
}

async function archiveInstance(env, actor, payload) {
  requireRole(actor, 'editor');
  const row = await single(env, 'liveops_event_instances', `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error('event_instance_not_found');
  if (!['finalized','cancelled'].includes(row.status)) throw new Error('only_finalized_or_cancelled_events_can_be_archived');
  const rows = await supabaseFetch(env, '/rest/v1/liveops_event_instances', {
    method: 'PATCH', query: `id=eq.${encodeEq(payload.id)}`, body: { status: 'archived' }, prefer: 'return=representation'
  });
  await audit(env, actor, 'event.archive', 'event_instance', payload.id, { priorStatus: row.status });
  return { archived: true, instance: rows?.[0] };
}


function playerEventGraceDays(row) {
  const value = Number(row?.config?.claimGraceDays ?? 7);
  return Number.isFinite(value) ? Math.max(0, Math.min(30, Math.floor(value))) : 7;
}

function parsePlayerEventDate(value, errorCode) {
  const ms = Date.parse(String(value ?? ''));
  if (!Number.isFinite(ms)) throw new Error(errorCode);
  return { ms, iso: new Date(ms).toISOString() };
}

async function listPlayerEvents(env) {
  return await list(env, 'live_events', 'select=event_id,name,currency_id,enabled,starts_at,ends_at,grace_ends_at,priority,modules,config,updated_at&order=priority.desc,name.asc&limit=100') ?? [];
}

function annualPlayerEventParts(eventId) {
  const match = String(eventId ?? '').match(/^(EVT_ANNUAL_\d{3})_(\d{4})$/);
  return match ? { seriesId: match[1], year: Number(match[2]) } : null;
}
function assertPlayerEventSeasonStart(eventId, startsAtMs) {
  const parts = annualPlayerEventParts(eventId);
  if (!parts) return;
  const start = new Date(startsAtMs);
  const year = start.getUTCFullYear();
  const turningOfAgeCrossover = parts.seriesId === 'EVT_ANNUAL_001' && year === parts.year + 1 && start.getUTCMonth() === 0 && start.getUTCDate() <= 7;
  if (year !== parts.year && !turningOfAgeCrossover) throw new Error('player_event_wrong_season_use_clone');
}

async function clonePlayerEventSeason(env, actor, payload) {
  requireRole(actor, 'owner');
  const sourceEventId = String(payload.eventId ?? '');
  const source = await single(env, 'live_events', `event_id=eq.${encodeEq(sourceEventId)}`);
  if (!source) throw new Error('player_event_not_found');
  const parts = annualPlayerEventParts(sourceEventId);
  if (!parts) throw new Error('player_event_not_annual');
  const targetYear = Number(payload.targetYear);
  if (!Number.isInteger(targetYear) || targetYear < 2026 || targetYear > 2100 || targetYear === parts.year) throw new Error('player_event_target_year_invalid');
  const targetEventId = `${parts.seriesId}_${targetYear}`;
  if (await single(env, 'live_events', `event_id=eq.${encodeEq(targetEventId)}`)) throw new Error('player_event_season_exists');
  const now = new Date().toISOString();
  const rows = await supabaseFetch(env, '/rest/v1/live_events', {
    method: 'POST',
    body: {
      event_id: targetEventId,
      name: source.name,
      currency_id: source.currency_id,
      enabled: false,
      starts_at: null,
      ends_at: null,
      grace_ends_at: null,
      priority: Number(source.priority ?? 0),
      modules: Array.isArray(source.modules) ? source.modules : [],
      config: { ...(source.config ?? {}), seasonYear: targetYear, clonedFromEventId: sourceEventId },
      updated_at: now,
    },
    prefer: 'return=representation',
  });
  await audit(env, actor, 'player_event.clone_season', 'player_event', targetEventId, { sourceEventId, sourceYear: parts.year, targetYear, enabled: false });
  return rows?.[0];
}

function seasonalCalendarPreset(startYear) {
  const year=Number(startYear);
  if(!Number.isInteger(year)||year<2026||year>2099)throw new Error('seasonal_preset_year_invalid');
  const iso=(y,m,d)=>new Date(Date.UTC(y,m-1,d,0,0,0,0)).toISOString();
  return [
    {eventId:`EVT_ANNUAL_010_${year}`,templateId:'EVT_ANNUAL_010_2026',name:'The Veilbreak',startsAt:iso(year,10,23),endsAt:iso(year,11,3),graceDays:7},
    {eventId:`EVT_ANNUAL_011_${year}`,templateId:'EVT_ANNUAL_011_2026',name:'Merchant & Guild Festival',startsAt:iso(year,11,13),endsAt:iso(year,11,28),graceDays:7},
    {eventId:`EVT_ANNUAL_012_${year}`,templateId:'EVT_ANNUAL_012_2026',name:'Frostfall Festival',startsAt:iso(year,12,6),endsAt:iso(year,12,22),graceDays:7},
    {eventId:`EVT_ANNUAL_001_${year}`,templateId:'EVT_ANNUAL_001_2026',name:'Turning of the Age',startsAt:iso(year,12,29),endsAt:iso(year+1,1,5),graceDays:7},
    {eventId:`EVT_ANNUAL_002_${year+1}`,templateId:'EVT_ANNUAL_002_2026',name:'Heartbond Festival',startsAt:iso(year+1,2,7),endsAt:iso(year+1,2,17),graceDays:7},
    {eventId:`EVT_ANNUAL_003_${year+1}`,templateId:'EVT_ANNUAL_003_2026',name:'Bloomwake',startsAt:iso(year+1,3,20),endsAt:iso(year+1,4,6),graceDays:7},
  ];
}

async function ensurePlayerEventSeason(env, actor, templateId, eventId) {
  const existing=await single(env,'live_events',`event_id=eq.${encodeEq(eventId)}`);
  if(existing)return existing;
  const template=await single(env,'live_events',`event_id=eq.${encodeEq(templateId)}`);
  if(!template)throw new Error(`player_event_template_not_found:${templateId}`);
  const match=eventId.match(/_(\d{4})$/),seasonYear=match?Number(match[1]):null;
  const rows=await supabaseFetch(env,'/rest/v1/live_events',{
    method:'POST',
    body:{
      event_id:eventId,name:template.name,currency_id:template.currency_id,enabled:false,
      starts_at:null,ends_at:null,grace_ends_at:null,priority:Number(template.priority??0),
      modules:Array.isArray(template.modules)?template.modules:[],
      config:{...(template.config??{}),seasonYear,clonedFromEventId:template.event_id},
      updated_at:new Date().toISOString(),
    },
    prefer:'return=representation',
  });
  await audit(env,actor,'player_event.clone_season','player_event',eventId,{sourceEventId:template.event_id,targetYear:seasonYear,source:'seasonal_calendar_preset'});
  return rows?.[0];
}

async function applySeasonalCalendarPreset(env, actor, payload) {
  requireRole(actor,'owner');
  const startYear=Number(payload.startYear);
  const reason=String(payload.reason??'').trim();
  if(reason.length<10)throw new Error('seasonal_preset_reason_too_short');
  const preset=seasonalCalendarPreset(startYear);
  const nowMs=Date.now();
  if(preset.some(entry=>Date.parse(entry.startsAt)<=nowMs))throw new Error('seasonal_preset_has_started_events');

  // Ensure future-year rows exist before validating the complete visible schedule.
  const rows=[];
  for(const entry of preset)rows.push(await ensurePlayerEventSeason(env,actor,entry.templateId,entry.eventId));

  // Preflight the preset internally and against all other enabled events.
  for(let i=0;i<preset.length;i++){
    const a=preset[i],aStart=Date.parse(a.startsAt),aGrace=Date.parse(a.endsAt)+a.graceDays*86400000;
    for(let j=i+1;j<preset.length;j++){
      const b=preset[j],bStart=Date.parse(b.startsAt),bGrace=Date.parse(b.endsAt)+b.graceDays*86400000;
      if(aStart<bGrace&&bStart<aGrace)throw new Error(`seasonal_preset_internal_overlap:${a.eventId}:${b.eventId}`);
    }
    const enabled=await list(env,'live_events','select=event_id,name,enabled,starts_at,ends_at,grace_ends_at,config&enabled=eq.true&limit=100');
    for(const other of enabled??[]){
      if(preset.some(entry=>entry.eventId===other.event_id)||!other.starts_at||!other.ends_at)continue;
      const otherStart=Date.parse(other.starts_at),otherEnd=Date.parse(other.ends_at),otherGrace=other.grace_ends_at?Date.parse(other.grace_ends_at):otherEnd+playerEventGraceDays(other)*86400000;
      if(aStart<otherGrace&&otherStart<aGrace)throw new Error(`seasonal_preset_visibility_overlap:${other.event_id}`);
    }
  }

  // First schedule every row disabled, then enable in chronological order.
  const applied=[];
  for(const entry of preset){
    const row=await single(env,'live_events',`event_id=eq.${encodeEq(entry.eventId)}`);
    if(!row)throw new Error('player_event_not_found');
    if(row.enabled)throw new Error(`seasonal_preset_event_already_enabled:${entry.eventId}`);
    const graceEndsAt=new Date(Date.parse(entry.endsAt)+entry.graceDays*86400000).toISOString();
    const patched=await supabaseFetch(env,'/rest/v1/live_events',{
      method:'PATCH',query:`event_id=eq.${encodeEq(entry.eventId)}`,
      body:{enabled:false,starts_at:entry.startsAt,ends_at:entry.endsAt,grace_ends_at:graceEndsAt,config:{...(row.config??{}),claimGraceDays:entry.graceDays,calendarPreset:`${startYear}-${startYear+1}`},updated_at:new Date().toISOString()},
      prefer:'return=representation',
    });
    applied.push(patched?.[0]);
  }
  for(const entry of preset){
    await supabaseFetch(env,'/rest/v1/live_events',{
      method:'PATCH',query:`event_id=eq.${encodeEq(entry.eventId)}`,
      body:{enabled:true,updated_at:new Date().toISOString()},prefer:'return=minimal',
    });
  }
  await audit(env,actor,'player_event.calendar_preset.apply','player_event_calendar',`${startYear}-${startYear+1}`,{reason,events:preset});
  return {startYear,endYear:startYear+1,events:preset,enabled:true};
}

const PLAYER_EVENT_EXPEDITION_SERIES = new Set([
  'EVT_ANNUAL_001','EVT_ANNUAL_002','EVT_ANNUAL_003','EVT_ANNUAL_006',
  'EVT_ANNUAL_008','EVT_ANNUAL_010','EVT_ANNUAL_011','EVT_ANNUAL_012',
]);

function playerEventHasSeasonalExpedition(eventId) {
  const match = String(eventId ?? '').match(/^(EVT_ANNUAL_\d{3})(?:_|$)/);
  return Boolean(match && PLAYER_EVENT_EXPEDITION_SERIES.has(match[1]));
}

function playerEventRuntimePhase(row, nowMs = Date.now()) {
  if (!row?.enabled) return 'disabled';
  const startsAtMs = row.starts_at ? Date.parse(row.starts_at) : NaN;
  const endsAtMs = row.ends_at ? Date.parse(row.ends_at) : NaN;
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) return 'needs_schedule';
  if (nowMs < startsAtMs) return 'scheduled';
  if (nowMs < endsAtMs) return 'live';
  const fallbackGraceEndMs = endsAtMs + playerEventGraceDays(row) * 86400000;
  const claimEndMs = row.grace_ends_at ? Date.parse(row.grace_ends_at) : fallbackGraceEndMs;
  if (Number.isFinite(claimEndMs) && nowMs < claimEndMs) return 'claiming';
  return 'expired';
}

async function playerEventVisibilityConflicts(env, eventId, startsAtMs, visibleEndsAtMs) {
  const rows = await list(env, 'live_events', 'select=event_id,name,enabled,starts_at,ends_at,grace_ends_at,config&enabled=eq.true&limit=100');
  const conflicts = [];
  for (const row of rows ?? []) {
    if (row.event_id === eventId || !row.starts_at || !row.ends_at) continue;
    const rowStart = Date.parse(row.starts_at), rowEnd = Date.parse(row.ends_at);
    const rowGraceEnd = row.grace_ends_at ? Date.parse(row.grace_ends_at) : rowEnd + playerEventGraceDays(row) * 86400000;
    if (!Number.isFinite(rowStart) || !Number.isFinite(rowEnd)) continue;
    const rowVisibleEnd = Number.isFinite(rowGraceEnd) ? rowGraceEnd : rowEnd;
    if (startsAtMs < rowVisibleEnd && rowStart < visibleEndsAtMs) {
      conflicts.push({ eventId: row.event_id, name: row.name ?? row.event_id, startsAt: row.starts_at, endsAt: row.ends_at, graceEndsAt: row.grace_ends_at ?? null });
    }
  }
  return conflicts;
}

async function playerEventPreflight(env, payload) {
  const eventId = String(payload.eventId ?? '');
  const row = await single(env, 'live_events', `event_id=eq.${encodeEq(eventId)}`);
  if (!row) throw new Error('player_event_not_found');
  const nowMs = Date.now(), phase = playerEventRuntimePhase(row, nowMs), checks = [];
  const add = (key, status, label, detail) => checks.push({ key, status, label, detail });

  let startMs = row.starts_at ? Date.parse(row.starts_at) : NaN;
  let endMs = row.ends_at ? Date.parse(row.ends_at) : NaN;
  let graceEndMs = row.grace_ends_at ? Date.parse(row.grace_ends_at) : NaN;
  let scheduleValid = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
  let seasonValid = false;
  let scheduleConflicts = [];

  if (!scheduleValid) add('schedule','error','Schedule','A valid start and end time are required before enabling the saved schedule.');
  else {
    add('schedule','pass','Schedule',`${new Date(startMs).toISOString()} → ${new Date(endMs).toISOString()}`);
    try { assertPlayerEventSeasonStart(eventId, startMs); seasonValid = true; add('season','pass','Season year','The scheduled start matches this annual season ID.'); }
    catch { add('season','error','Season year','The scheduled start belongs to a different annual season. Clone the event into the correct year instead.'); }
    if (!Number.isFinite(graceEndMs)) graceEndMs = endMs + playerEventGraceDays(row) * 86400000;
    if (graceEndMs < endMs) add('claim_window','error','Claim window','Claim grace ends before event earning ends.');
    else add('claim_window','pass','Claim window',`Claims remain visible through ${new Date(graceEndMs).toISOString()}.`);
    scheduleConflicts = await playerEventVisibilityConflicts(env, eventId, startMs, Math.max(endMs, graceEndMs));
    if (scheduleConflicts.length) add('overlap','error','Visibility overlap',`Conflicts with ${scheduleConflicts.map(item=>item.name).join(', ')}.`);
    else add('overlap','pass','Visibility overlap','No other enabled Player Event overlaps this earning + claim window.');
  }

  const durationDays = payload.durationDays === undefined ? 14 : Number(payload.durationDays);
  if (!Number.isFinite(durationDays) || durationDays < 0.25 || durationDays > 60) throw new Error('player_event_duration_invalid');
  const goLiveEndMs = nowMs + Math.round(durationDays * 86400000);
  const goLiveGraceEndMs = goLiveEndMs + playerEventGraceDays(row) * 86400000;
  let goLiveSeasonValid = false, goLiveConflicts = [];
  try { assertPlayerEventSeasonStart(eventId, nowMs); goLiveSeasonValid = true; }
  catch {}
  if (goLiveSeasonValid) goLiveConflicts = await playerEventVisibilityConflicts(env, eventId, nowMs, goLiveGraceEndMs);

  const expedition = playerEventHasSeasonalExpedition(eventId);
  add('expedition', expedition ? 'pass' : 'info', 'Seasonal dungeon', expedition ? (phase === 'live' ? 'Persistent event-dungeon transport is LIVE for this event.' : 'Persistent event-dungeon transport is wired and will become launchable while earning is live.') : 'This event series does not have a seasonal co-op expedition.');
  if (phase === 'claiming') add('phase','warning','Current phase','Claims are open. Re-starting earning is intentionally blocked until this claim window closes or the event is hard-disabled.');
  else if (phase === 'expired' && row.enabled) add('phase','warning','Current phase','The master switch is still ON for an expired event. Disable or reschedule it before the next season.');
  else add('phase','pass','Current phase',phase.replaceAll('_',' '));

  const claimWindowFuture = scheduleValid && Number.isFinite(graceEndMs) && graceEndMs > nowMs;
  const canEnableSchedule = !row.enabled && scheduleValid && seasonValid && claimWindowFuture && scheduleConflicts.length === 0;
  const canGoLiveNow = phase !== 'live' && phase !== 'claiming' && goLiveSeasonValid && goLiveConflicts.length === 0;
  return {
    eventId,
    name: row.name ?? eventId,
    phase,
    enabled: row.enabled === true,
    seasonalExpedition: expedition,
    checks,
    blocking: checks.some(check => check.status === 'error'),
    scheduleConflicts,
    goLivePreview: {
      durationDays,
      startsAt: new Date(nowMs).toISOString(),
      endsAt: new Date(goLiveEndMs).toISOString(),
      graceEndsAt: new Date(goLiveGraceEndMs).toISOString(),
      seasonValid: goLiveSeasonValid,
      conflicts: goLiveConflicts,
    },
    actions: { canEnableSchedule, canGoLiveNow },
  };
}

async function assertNoPlayerEventOverlap(env, eventId, startsAtMs, endsAtMs, graceEndsAtMs = endsAtMs) {
  const conflicts = await playerEventVisibilityConflicts(env, eventId, startsAtMs, graceEndsAtMs);
  if (conflicts.length) throw new Error(`player_event_visibility_overlap:${conflicts[0].eventId}`);
}

async function playerActivityAnalytics(env, payload = {}) {
  const days=Number(payload.days??30);
  const raw=await supabaseFetch(env,'/rest/v1/rpc/player_activity_analytics_server_v1',{
    method:'POST',body:{p_days:Number.isInteger(days)?Math.max(7,Math.min(90,days)):30},
  });
  return Array.isArray(raw)?(raw[0]??{}):(raw??{});
}
async function playerLifecycleAnalytics(env,payload={}){
  const days=Number(payload.days??30);
  const raw=await supabaseFetch(env,'/rest/v1/rpc/player_lifecycle_analytics_server_v1',{
    method:'POST',body:{p_days:Number.isInteger(days)?Math.max(7,Math.min(90,days)):30},
  });
  return Array.isArray(raw)?(raw[0]??{}):(raw??{});
}

async function playerEventAnalytics(env, payload) {
  const eventId = String(payload.eventId ?? '');
  const row = await single(env, 'live_events', `event_id=eq.${encodeEq(eventId)}`);
  if (!row) throw new Error('player_event_not_found');

  const [raw,funnelRaw,activity] = await Promise.all([
    supabaseFetch(env,'/rest/v1/rpc/player_event_analytics_server_v1',{method:'POST',body:{p_event_id:eventId}}),
    supabaseFetch(env,'/rest/v1/rpc/player_event_funnel_server_v1',{method:'POST',body:{p_event_id:eventId}}).catch(()=>null),
    payload.includeGlobalActivity===false?Promise.resolve(null):playerActivityAnalytics(env,{days:30}).catch(()=>null),
  ]);
  const analytics = Array.isArray(raw) ? (raw[0] ?? {}) : (raw ?? {});
  const funnelPayload = Array.isArray(funnelRaw) ? (funnelRaw[0] ?? {}) : (funnelRaw ?? {});
  const funnel = funnelPayload.funnel ?? {};
  const phase = playerEventRuntimePhase(row);
  const progress = analytics.progress ?? {};
  const dungeons = analytics.dungeons ?? {};
  const health = [];
  const add = (severity, code, title, detail) => health.push({ severity, code, title, detail });

  const participants = Number(progress.participants ?? 0);
  const anomalies = Number(progress.balanceAnomalies ?? 0);
  const starts = Number(dungeons.starts ?? 0);
  const completed = Number(dungeons.completed ?? 0);
  const failed = Number(dungeons.failed ?? 0);
  const pendingSettlement = Number(dungeons.pendingSettlement ?? 0);
  const resolved = completed + failed;
  const failureRate = resolved > 0 ? failed / resolved : 0;
  const dungeonExpected = playerEventHasSeasonalExpedition(eventId);

  if (anomalies > 0) add('error','event_balance_invariant','Balance invariant issue',`${anomalies} participant record${anomalies===1?'':'s'} have a negative value or a common-currency balance above lifetime reputation.`);
  if (pendingSettlement > 0) add('warning','event_dungeon_pending_settlement','Dungeon settlements pending',`${pendingSettlement} completed seasonal run${pendingSettlement===1?' is':'s are'} waiting for player settlement.`);
  if (resolved >= 5 && failureRate >= 0.5) add('warning','event_dungeon_failure_rate','High dungeon failure rate',`${Math.round(failureRate*100)}% of resolved seasonal dungeon runs have failed (${failed}/${resolved}).`);
  if (phase === 'live' && participants === 0) add('info','event_no_participation_yet','No participation yet','The event is live but no account has recorded event progress yet.');
  if (phase === 'live' && dungeonExpected && starts === 0) add('info','event_dungeon_no_starts_yet','No seasonal dungeon starts yet','The event dungeon is wired, but no persistent seasonal run has started for this season yet.');
  if (!health.length) add('pass','event_health_clear','No detected event health issues','Current aggregate event telemetry is internally consistent.');

  return {
    event: {
      eventId: row.event_id,
      name: row.name ?? row.event_id,
      phase,
      enabled: row.enabled === true,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      graceEndsAt: row.grace_ends_at,
      seasonalExpedition: dungeonExpected,
    },
    analytics,
    health,
    derived: {
      resolvedDungeonRuns: resolved,
      dungeonClearRate: resolved > 0 ? completed / resolved : null,
      dungeonFailureRate: resolved > 0 ? failureRate : null,
      currencyRetentionRate: Number(progress.progressTotal ?? 0) > 0 ? Number(progress.currencyBalance ?? 0) / Number(progress.progressTotal ?? 0) : null,
      dailyGiftReach: participants > 0 ? Number(funnel.dailyGiftClaimers ?? 0) / participants : null,
      projectChoiceReach: participants > 0 ? Number(funnel.projectChoosers ?? 0) / participants : null,
      contractAcceptReach: participants > 0 ? Number(funnel.contractAcceptors ?? 0) / participants : null,
      contractCompletionRate: Number(funnel.contractAcceptors ?? 0) > 0 ? Number(funnel.contractClaimers ?? 0) / Number(funnel.contractAcceptors ?? 0) : null,
      shopBuyerReach: participants > 0 ? Number(funnel.shopBuyers ?? 0) / participants : null,
      milestoneClaimReach: participants > 0 ? Number(funnel.milestoneClaimers ?? 0) / participants : null,
      dungeonStartReach: participants > 0 ? starts / participants : null,
      eventParticipantVsMau: activity&&Number(activity.mau??0)>0 ? participants / Number(activity.mau) : null,
    },
    funnel:funnelPayload,
    playerActivity:activity,
  };
}

async function playerEventSeriesComparison(env, payload) {
  const eventId=String(payload.eventId??'');
  const match=eventId.match(/^(EVT_ANNUAL_\d{3})(?:_|$)/);
  if(!match)throw new Error('player_event_series_invalid');
  const series=match[1];
  const rows=(await list(env,'live_events','select=event_id,name,enabled,starts_at,ends_at,grace_ends_at&order=starts_at.desc.nullslast,event_id.desc&limit=200')??[])
    .filter(row=>String(row.event_id??'').startsWith(series+'_'))
    .slice(0,8);
  const seasons=[];
  for(const row of rows){
    try{
      const result=await playerEventAnalytics(env,{eventId:row.event_id,includeGlobalActivity:false});
      const p=result.analytics?.progress??{},d=result.analytics?.dungeons??{},f=result.funnel?.funnel??{};
      seasons.push({
        eventId:row.event_id,name:row.name??row.event_id,startsAt:row.starts_at,endsAt:row.ends_at,
        participants:Number(p.participants??0),medianReputation:Number(p.progressMedian??0),p90Reputation:Number(p.progressP90??0),
        dailyGiftReach:result.derived?.dailyGiftReach??null,contractCompletionRate:result.derived?.contractCompletionRate??null,
        shopBuyerReach:result.derived?.shopBuyerReach??null,dungeonStartReach:result.derived?.dungeonStartReach??null,
        dungeonClearRate:result.derived?.dungeonClearRate??null,shopPurchases:Number(f.shopPurchases??0),
      });
    }catch(error){
      seasons.push({eventId:row.event_id,name:row.name??row.event_id,startsAt:row.starts_at,endsAt:row.ends_at,error:error instanceof Error?error.message:'analytics_unavailable'});
    }
  }
  return {series,seasons};
}

async function schedulePlayerEvent(env, actor, payload) {
  requireRole(actor, 'editor');
  const eventId = String(payload.eventId ?? '');
  const row = await single(env, 'live_events', `event_id=eq.${encodeEq(eventId)}`);
  if (!row) throw new Error('player_event_not_found');
  let reason = '';
  if (row.enabled) {
    requireRole(actor, 'owner');
    reason = String(payload.reason ?? '').trim();
    if (reason.length < 10) throw new Error('player_event_change_reason_too_short');
  }
  const start = parsePlayerEventDate(payload.startsAt, 'player_event_start_invalid');
  assertPlayerEventSeasonStart(eventId, start.ms);
  const end = parsePlayerEventDate(payload.endsAt, 'player_event_end_invalid');
  if (end.ms <= start.ms) throw new Error('player_event_end_before_start');
  const graceDays = payload.claimGraceDays === undefined ? playerEventGraceDays(row) : Number(payload.claimGraceDays);
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 30) throw new Error('player_event_claim_grace_invalid');
  const graceEndsAtMs = end.ms + graceDays * 86400000;
  if (row.enabled) await assertNoPlayerEventOverlap(env, eventId, start.ms, end.ms, graceEndsAtMs);
  const graceEndsAt = new Date(graceEndsAtMs).toISOString();
  const rows = await supabaseFetch(env, '/rest/v1/live_events', {
    method: 'PATCH',
    query: `event_id=eq.${encodeEq(eventId)}`,
    body: { starts_at: start.iso, ends_at: end.iso, grace_ends_at: graceEndsAt, config: { ...(row.config ?? {}), claimGraceDays: graceDays }, updated_at: new Date().toISOString() },
    prefer: 'return=representation',
  });
  await audit(env, actor, 'player_event.schedule', 'player_event', eventId, {
    reason: row.enabled ? reason : null,
    before: { startsAt: row.starts_at, endsAt: row.ends_at, graceEndsAt: row.grace_ends_at, enabled: row.enabled },
    after: { startsAt: start.iso, endsAt: end.iso, graceEndsAt },
  });
  return rows?.[0];
}
async function setPlayerEventEnabled(env, actor, payload) {
  requireRole(actor, 'owner');
  const eventId = String(payload.eventId ?? '');
  const row = await single(env, 'live_events', `event_id=eq.${encodeEq(eventId)}`);
  if (!row) throw new Error('player_event_not_found');
  const enabled = payload.enabled === true;
  const reason = String(payload.reason ?? '').trim();
  if (reason.length < 10) throw new Error('player_event_change_reason_too_short');
  if (enabled) {
    if (!row.starts_at || !row.ends_at) throw new Error('player_event_schedule_required_before_enable');
    const startMs = Date.parse(row.starts_at), endMs = Date.parse(row.ends_at);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) throw new Error('player_event_schedule_invalid');
    assertPlayerEventSeasonStart(eventId, startMs);
    const graceEndMs = row.grace_ends_at ? Date.parse(row.grace_ends_at) : endMs + playerEventGraceDays(row) * 86400000;
    if (Number.isFinite(graceEndMs) && graceEndMs <= Date.now()) throw new Error('player_event_window_expired_use_go_live');
    await assertNoPlayerEventOverlap(env, eventId, startMs, endMs, Number.isFinite(graceEndMs) ? graceEndMs : endMs);
  }
  const rows = await supabaseFetch(env, '/rest/v1/live_events', {
    method: 'PATCH',
    query: `event_id=eq.${encodeEq(eventId)}`,
    body: { enabled, updated_at: new Date().toISOString() },
    prefer: 'return=representation',
  });
  await audit(env, actor, enabled ? 'player_event.enable' : 'player_event.hard_disable', 'player_event', eventId, {
    reason,
    priorEnabled: row.enabled,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    graceEndsAt: row.grace_ends_at,
  });
  return rows?.[0];
}

async function goLivePlayerEvent(env, actor, payload) {
  requireRole(actor, 'owner');
  const eventId = String(payload.eventId ?? '');
  const row = await single(env, 'live_events', `event_id=eq.${encodeEq(eventId)}`);
  if (!row) throw new Error('player_event_not_found');
  const reason = String(payload.reason ?? '').trim();
  if (reason.length < 10) throw new Error('player_event_change_reason_too_short');
  const currentPhase = playerEventRuntimePhase(row);
  if (currentPhase === 'live') throw new Error('player_event_already_live');
  if (currentPhase === 'claiming') throw new Error('player_event_claim_window_open');
  const startMs = Date.now();
  assertPlayerEventSeasonStart(eventId, startMs);
  let endMs;
  if (payload.endsAt) endMs = parsePlayerEventDate(payload.endsAt, 'player_event_end_invalid').ms;
  else {
    const durationDays = Number(payload.durationDays ?? 14);
    if (!Number.isFinite(durationDays) || durationDays < 0.25 || durationDays > 60) throw new Error('player_event_duration_invalid');
    endMs = startMs + Math.round(durationDays * 86400000);
  }
  if (endMs <= startMs) throw new Error('player_event_end_before_start');
  const graceDays = playerEventGraceDays(row);
  const graceEndsAtMs = endMs + graceDays * 86400000;
  await assertNoPlayerEventOverlap(env, eventId, startMs, endMs, graceEndsAtMs);
  const startsAt = new Date(startMs).toISOString(), endsAt = new Date(endMs).toISOString();
  const graceEndsAt = new Date(graceEndsAtMs).toISOString();
  const rows = await supabaseFetch(env, '/rest/v1/live_events', {
    method: 'PATCH',
    query: `event_id=eq.${encodeEq(eventId)}`,
    body: { enabled: true, starts_at: startsAt, ends_at: endsAt, grace_ends_at: graceEndsAt, updated_at: new Date().toISOString() },
    prefer: 'return=representation',
  });
  await audit(env, actor, 'player_event.go_live', 'player_event', eventId, {
    reason,
    before: { enabled: row.enabled, startsAt: row.starts_at, endsAt: row.ends_at, graceEndsAt: row.grace_ends_at },
    after: { enabled: true, startsAt, endsAt, graceEndsAt },
  });
  return rows?.[0];
}

async function endPlayerEventNow(env, actor, payload) {
  requireRole(actor, 'owner');
  const eventId = String(payload.eventId ?? '');
  const row = await single(env, 'live_events', `event_id=eq.${encodeEq(eventId)}`);
  if (!row) throw new Error('player_event_not_found');
  const reason = String(payload.reason ?? '').trim();
  if (reason.length < 10) throw new Error('player_event_change_reason_too_short');
  if (!row.enabled || !row.starts_at || Date.parse(row.starts_at) > Date.now()) throw new Error('player_event_not_live');
  const nowMs = Date.now();
  const startsAtMs = Date.parse(row.starts_at);
  const endsAtMs = Math.max(nowMs, startsAtMs + 1000);
  const graceDays = playerEventGraceDays(row);
  const endsAt = new Date(endsAtMs).toISOString(), graceEndsAt = new Date(endsAtMs + graceDays * 86400000).toISOString();
  const rows = await supabaseFetch(env, '/rest/v1/live_events', {
    method: 'PATCH',
    query: `event_id=eq.${encodeEq(eventId)}`,
    body: { enabled: true, ends_at: endsAt, grace_ends_at: graceEndsAt, updated_at: new Date().toISOString() },
    prefer: 'return=representation',
  });
  await audit(env, actor, 'player_event.end_now', 'player_event', eventId, {
    reason,
    priorEndsAt: row.ends_at,
    endsAt,
    graceEndsAt,
    claimsRemainOpen: graceDays > 0,
  });
  return rows?.[0];
}

async function saveReward(env, actor, payload) {
  requireRole(actor, 'owner');
  const bundleId = String(payload.bundleId ?? '').trim();
  if (!/^[a-zA-Z0-9_.:-]{3,120}$/.test(bundleId)) throw new Error('reward_bundle_id_invalid');
  const tier = String(payload.tier ?? 'milestone');
  if (!['participation','milestone','prestige'].includes(tier)) throw new Error('reward_tier_invalid');
  const body = {
    bundle_id: bundleId,
    label: String(payload.label ?? bundleId).trim().slice(0,120),
    tier,
    enabled: payload.enabled !== false,
    validated: payload.validated === true,
    notes: String(payload.notes ?? '').trim().slice(0,1000),
    updated_by: actor.user.id,
    updated_at: new Date().toISOString(),
  };
  const rows = await supabaseFetch(env, '/rest/v1/liveops_admin_reward_catalog', {
    method: 'POST', body, query: 'on_conflict=bundle_id', prefer: 'resolution=merge-duplicates,return=representation'
  });
  await audit(env, actor, 'reward_catalog.save', 'reward_bundle', bundleId, { validated: body.validated, enabled: body.enabled, tier });
  return rows?.[0];
}

async function leaderboard(env, payload) {
  const instance = await single(env, 'liveops_event_instances', `id=eq.${encodeEq(payload.instanceId)}`);
  if (!instance) throw new Error('event_instance_not_found');
  const finalized = instance.status === 'finalized' || instance.status === 'archived';
  if (finalized) {
    const rows = await list(env, 'liveops_event_rank_snapshots', `select=party_id,party_name_snapshot,rank,eligible_party_count,score,percentile,reward_band,meaningful_contributors,snapshotted_at&event_instance_id=eq.${encodeEq(payload.instanceId)}&order=rank.asc&limit=200`);
    return { instance, finalized: true, rows: rows ?? [] };
  }
  const rows = await list(env, 'liveops_event_party_progress', `select=party_id,party_name_snapshot,score,combat_points,skilling_points,meaningful_contributors,ranked_eligible,last_score_at&event_instance_id=eq.${encodeEq(payload.instanceId)}&order=ranked_eligible.desc,score.desc,last_score_at.asc&limit=200`);
  return { instance, finalized: false, rows: (rows ?? []).map((row, index) => ({ ...row, rank: row.ranked_eligible ? index + 1 : null })) };
}

async function eventStats(env, payload) {
  const id = encodeEq(payload.instanceId);
  const [instance, parties, partyCount, qualifiedPartyCount, claims, outboxDead] = await Promise.all([
    single(env, 'liveops_event_instances', `id=eq.${id}`),
    list(env, 'liveops_event_party_progress', `select=party_id,score&event_instance_id=eq.${id}&order=score.desc&limit=1000`),
    countRows(env, 'liveops_event_party_progress', `event_instance_id=eq.${id}`),
    countRows(env, 'liveops_event_party_progress', `event_instance_id=eq.${id}&ranked_eligible=eq.true`),
    countRows(env, 'liveops_event_reward_claims', `event_instance_id=eq.${id}`),
    countRows(env, 'social_contribution_outbox', 'status=eq.dead_letter'),
  ]);
  if (!instance) throw new Error('event_instance_not_found');
  const rows = parties ?? [];
  return {
    instance,
    partyCount,
    qualifiedPartyCount,
    totalPartyPoints: rows.reduce((sum,p) => sum + Number(p.score ?? 0), 0),
    totalPartyPointsIsPartial: partyCount > rows.length,
    rewardClaimCount: claims,
    deadLetterOutboxCount: outboxDead,
  };
}

async function operations(env) {
  const [healthRows, deadLetters, deadLetterCount, pendingCount] = await Promise.all([
    list(env, 'liveops_runtime_health', 'select=*&component=eq.party_liveops_worker&limit=1'),
    list(env, 'social_contribution_outbox', 'select=id,source_event_id,account_id,party_id_at_settlement,party_name_at_settlement,event_json,targets_json,attempts,last_error,available_at,created_at&status=eq.dead_letter&order=created_at.desc&limit=100'),
    countRows(env, 'social_contribution_outbox', 'status=eq.dead_letter'),
    countRows(env, 'social_contribution_outbox', 'status=in.(pending,processing)'),
  ]);
  return { workerHealth: healthRows?.[0] ?? null, deadLetters: deadLetters ?? [], deadLetterCount, pendingCount };
}

async function retryDeadLetter(env, actor, payload) {
  requireRole(actor, 'owner');
  const row = await single(env, 'social_contribution_outbox', `id=eq.${encodeEq(payload.id)}`);
  if (!row) throw new Error('outbox_row_not_found');
  if (row.status !== 'dead_letter') throw new Error('outbox_row_not_dead_letter');
  const rows = await supabaseFetch(env, '/rest/v1/social_contribution_outbox', {
    method: 'PATCH', query: `id=eq.${encodeEq(payload.id)}`,
    body: { status: 'pending', attempts: 0, last_error: null, available_at: new Date().toISOString(), locked_at: null, processed_at: null },
    prefer: 'return=representation'
  });
  await audit(env, actor, 'outbox.retry_dead_letter', 'social_contribution_outbox', payload.id, { sourceEventId: row.source_event_id, priorAttempts: row.attempts, priorError: row.last_error });
  return rows?.[0];
}


function metricSummaries(rows, cutoffMs) {
  const byKey = new Map();
  for (const row of rows ?? []) {
    if (Date.parse(row.bucket_start) < cutoffMs) continue;
    const key = row.metric_key;
    const current = byKey.get(key) ?? { metricKey:key, total:0, samples:0, min:null, max:null, last:null, lastAt:null, dimensions:new Map() };
    const value = Number(row.sum_value ?? 0);
    current.total += value;
    current.samples += Number(row.sample_count ?? 0);
    if (row.min_value !== null && row.min_value !== undefined) current.min = current.min === null ? Number(row.min_value) : Math.min(current.min, Number(row.min_value));
    if (row.max_value !== null && row.max_value !== undefined) current.max = current.max === null ? Number(row.max_value) : Math.max(current.max, Number(row.max_value));
    if (!current.lastAt || Date.parse(row.bucket_start) > Date.parse(current.lastAt)) { current.last = Number(row.last_value ?? value); current.lastAt = row.bucket_start; }
    const dimensionKey = row.dimension_key || 'all';
    current.dimensions.set(dimensionKey, (current.dimensions.get(dimensionKey) ?? 0) + value);
    byKey.set(key,current);
  }
  return [...byKey.values()].map((row) => ({ ...row, dimensions:[...row.dimensions.entries()].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,12).map(([key,value])=>({key,value})) }));
}

async function remoteConfig(env) {
  const [rows,revisions] = await Promise.all([
    list(env,'ops_remote_config','select=*&order=category.asc,risk_tier.desc,label.asc&limit=300'),
    list(env,'ops_remote_config_revisions','select=id,config_key,actor_account_id,actor_role,reason,prior_json,next_json,created_at&order=created_at.desc&limit=100'),
  ]);
  return { rows:rows ?? [], revisions:revisions ?? [] };
}

function coerceRemoteValue(valueType, value) {
  if (valueType === 'boolean') return value === true || value === 'true';
  if (valueType === 'integer') return Number.parseInt(String(value),10);
  if (valueType === 'number') return Number(value);
  if (valueType === 'string') return String(value ?? '');
  return value;
}

async function saveRemoteConfig(env, actor, payload) {
  const key = String(payload.configKey ?? '').trim();
  const prior = await single(env,'ops_remote_config',`config_key=eq.${encodeEq(key)}`);
  if (!prior) throw new Error('remote_config_not_found');
  requireRole(actor, prior.risk_tier === 'critical' ? 'owner' : 'editor');
  if (!prior.live_change_safe) throw new Error('remote_config_not_live_change_safe');
  const reason = String(payload.reason ?? '').trim();
  if (reason.length < (prior.risk_tier === 'critical' ? 10 : 5)) throw new Error('config_change_reason_too_short');
  const next = {
    ...prior,
    current_value: coerceRemoteValue(prior.value_type, payload.currentValue),
    enabled: payload.enabled !== false,
    rollout_percent: Number(payload.rolloutPercent ?? prior.rollout_percent),
    active_from: payload.activeFrom ? new Date(payload.activeFrom).toISOString() : null,
    active_until: payload.activeUntil ? new Date(payload.activeUntil).toISOString() : null,
    notes: payload.notes === undefined ? prior.notes : String(payload.notes ?? '').trim().slice(0,1200),
    updated_by: actor.user.id,
    updated_at: new Date().toISOString(),
  };
  const validation = validateRemoteConfig(next);
  if (validation.errors.length) return { saved:false, errors:validation.errors };
  const body = { current_value:next.current_value, enabled:next.enabled, rollout_percent:next.rollout_percent, active_from:next.active_from, active_until:next.active_until, notes:next.notes, updated_by:actor.user.id, updated_at:next.updated_at };
  const rows = await supabaseFetch(env,'/rest/v1/ops_remote_config',{ method:'PATCH',query:`config_key=eq.${encodeEq(key)}`,body,prefer:'return=representation' });
  const saved = rows?.[0];
  await supabaseFetch(env,'/rest/v1/ops_remote_config_revisions',{ method:'POST',body:{config_key:key,actor_account_id:actor.user.id,actor_role:actor.admin.role,reason,prior_json:prior,next_json:saved},prefer:'return=minimal' });
  await audit(env,actor,'remote_config.update','remote_config',key,{reason,riskTier:prior.risk_tier,priorValue:prior.current_value,nextValue:saved?.current_value,rolloutPercent:saved?.rollout_percent,enabled:saved?.enabled});
  return { saved:true, row:saved };
}

async function healthEconomy(env) {
  const since7 = new Date(Date.now()-7*86400000).toISOString();
  const [metrics,alerts,health,deadResets,deadSocial,playerActivity,playerLifecycle] = await Promise.all([
    list(env,'ops_metric_buckets',`select=metric_key,bucket_start,bucket_minutes,dimension_key,dimensions_json,metric_type,sum_value,sample_count,min_value,max_value,last_value&bucket_start=gte.${encodeEq(since7)}&order=bucket_start.desc&limit=5000`),
    list(env,'ops_alerts','select=*&status=neq.resolved&order=severity.desc,last_seen_at.desc&limit=200'),
    list(env,'liveops_runtime_health','select=*&order=component.asc&limit=100'),
    countRows(env,'ops_reset_runs','status=eq.dead_letter'),
    countRows(env,'social_contribution_outbox','status=eq.dead_letter'),
    playerActivityAnalytics(env,{days:30}).catch(()=>null),
    playerLifecycleAnalytics(env,{days:30}).catch(()=>null),
  ]);
  const now=Date.now();
  const m24=metricSummaries(metrics,now-24*3600000), m7=metricSummaries(metrics,now-7*86400000);
  const by24=new Map(m24.map(x=>[x.metricKey,x]));
  const goldCreated=by24.get('economy.gold.created')?.total ?? 0;
  const goldDestroyed=by24.get('economy.gold.destroyed')?.total ?? 0;
  return { metrics24:m24, metrics7:m7, gold:{created24:goldCreated,destroyed24:goldDestroyed,net24:goldCreated-goldDestroyed}, playerActivity,playerLifecycle, alerts:alerts ?? [], health:health ?? [], deadLetters:{resets:deadResets,social:deadSocial} };
}

async function updateAlert(env,actor,payload){
  requireRole(actor,'editor');
  const row=await single(env,'ops_alerts',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('alert_not_found');
  const status=String(payload.status ?? ''); if(!['acknowledged','resolved'].includes(status)) throw new Error('alert_status_invalid');
  if(status==='resolved' && row.severity==='critical') requireRole(actor,'owner');
  const reason=String(payload.reason ?? '').trim(); if(reason.length<5) throw new Error('alert_reason_too_short');
  const now=new Date().toISOString(); const body=status==='acknowledged'?{status,acknowledged_by:actor.user.id,acknowledged_at:now}:{status,resolved_by:actor.user.id,resolved_at:now};
  const rows=await supabaseFetch(env,'/rest/v1/ops_alerts',{method:'PATCH',query:`id=eq.${encodeEq(payload.id)}`,body,prefer:'return=representation'});
  await audit(env,actor,`alert.${status}`,'ops_alert',payload.id,{reason,title:row.title,severity:row.severity}); return rows?.[0];
}

async function resets(env){
  const [definitions,runs,health] = await Promise.all([
    list(env,'ops_reset_definitions','select=*&order=reset_key.asc&limit=100'),
    list(env,'ops_reset_runs','select=*&order=due_at.desc&limit=250'),
    list(env,'liveops_runtime_health','select=*&component=eq.central_reset_worker&limit=1'),
  ]);
  return {definitions:definitions??[],runs:runs??[],workerHealth:health?.[0]??null};
}

async function saveResetDefinition(env,actor,payload){
  requireRole(actor,'owner'); const key=String(payload.resetKey??''); const row=await single(env,'ops_reset_definitions',`reset_key=eq.${encodeEq(key)}`); if(!row) throw new Error('reset_definition_not_found');
  const reason=String(payload.reason??'').trim(); if(reason.length<10) throw new Error('reset_change_reason_too_short');
  const cadence=String(payload.cadence??row.cadence); if(!['daily','weekly','monthly'].includes(cadence)) throw new Error('reset_cadence_invalid');
  const hour=Number(payload.utcHour??row.utc_hour), minute=Number(payload.utcMinute??row.utc_minute), dow=payload.dayOfWeek===null?null:Number(payload.dayOfWeek??row.day_of_week), dom=payload.dayOfMonth===null?null:Number(payload.dayOfMonth??row.day_of_month);
  if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59) throw new Error('reset_time_invalid');
  if(cadence==='weekly'&&(!Number.isInteger(dow)||dow<0||dow>6)) throw new Error('reset_weekday_invalid');
  if(cadence==='monthly'&&(!Number.isInteger(dom)||dom<1||dom>28)) throw new Error('reset_monthday_invalid');
  const body={cadence,utc_hour:hour,utc_minute:minute,day_of_week:cadence==='weekly'?dow:null,day_of_month:cadence==='monthly'?dom:null,catch_up_policy:String(payload.catchUpPolicy??row.catch_up_policy),max_catchup_runs:Number(payload.maxCatchupRuns??row.max_catchup_runs),enabled:payload.enabled!==false,updated_by:actor.user.id,updated_at:new Date().toISOString()};
  if(!['latest_only','all_missed','skip_missed'].includes(body.catch_up_policy)) throw new Error('reset_catchup_invalid'); if(!Number.isInteger(body.max_catchup_runs)||body.max_catchup_runs<1||body.max_catchup_runs>31) throw new Error('reset_catchup_count_invalid');
  const rows=await supabaseFetch(env,'/rest/v1/ops_reset_definitions',{method:'PATCH',query:`reset_key=eq.${encodeEq(key)}`,body,prefer:'return=representation'}); await audit(env,actor,'reset_definition.update','reset_definition',key,{reason,before:row,after:rows?.[0]}); return rows?.[0];
}

async function retryResetRun(env,actor,payload){
  requireRole(actor,'owner'); const row=await single(env,'ops_reset_runs',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('reset_run_not_found'); if(!['failed','dead_letter'].includes(row.status)) throw new Error('reset_run_not_retryable');
  const reason=String(payload.reason??'').trim(); if(reason.length<10) throw new Error('reset_retry_reason_too_short');
  const rows=await supabaseFetch(env,'/rest/v1/ops_reset_runs',{method:'PATCH',query:`id=eq.${encodeEq(payload.id)}`,body:{status:'pending',attempts:0,last_error:null,available_at:new Date().toISOString(),locked_at:null,completed_at:null},prefer:'return=representation'}); await audit(env,actor,'reset_run.retry','reset_run',payload.id,{reason,resetKey:row.reset_key,periodKey:row.period_key,priorStatus:row.status,priorError:row.last_error}); return rows?.[0];
}

function isUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));}
function supportTerm(value){return String(value??'').trim().slice(0,80).replace(/[^a-zA-Z0-9 _.-]/g,'');}
async function supportSearch(env,payload){
  const q=supportTerm(payload.query); if(q.length<2) return [];
  if(isUuid(q)) return await list(env,'ops_support_accounts',`select=account_id,public_player_id,display_name,primary_character_id,last_seen_at,tags,updated_at&account_id=eq.${encodeEq(q)}&limit=25`)??[];
  const or=encodeURIComponent(`(public_player_id.ilike.*${q}*,display_name.ilike.*${q}*)`);
  return await list(env,'ops_support_accounts',`select=account_id,public_player_id,display_name,primary_character_id,last_seen_at,tags,updated_at&or=${or}&order=last_seen_at.desc.nullslast&limit=25`)??[];
}

async function authUserById(env,accountId){
  try { const cfg=envConfig(env); const response=await fetch(`${cfg.url}/auth/v1/admin/users/${encodeURIComponent(accountId)}`,{headers:{apikey:cfg.service,authorization:`Bearer ${cfg.service}`}}); if(!response.ok)return null; const user=await response.json(); return {id:user.id,created_at:user.created_at,last_sign_in_at:user.last_sign_in_at,email:user.email?String(user.email).replace(/^(.{2}).*(@.*)$/,'$1***$2'):null}; } catch { return null; }
}
async function supportAccount(env,payload){
  const accountId=String(payload.accountId??''); if(!isUuid(accountId)) throw new Error('account_id_invalid'); const warnings=[];
  const [index,authUser,characters,partyMembers,guildMembers,eventProgress,claims,redeemClaims,bindings,cases,notes,alerts,adminCommands] = await Promise.all([
    single(env,'ops_support_accounts',`account_id=eq.${encodeEq(accountId)}`), authUserById(env,accountId),
    optionalList(env,'characters',`select=*&account_id=eq.${encodeEq(accountId)}&limit=10`,warnings,'characters'),
    optionalList(env,'party_members',`select=party_id,character_id,role,joined_at&account_id=eq.${encodeEq(accountId)}&limit=10`,warnings,'party_members'),
    optionalList(env,'guild_members',`select=guild_id,role,contribution_xp,joined_at&account_id=eq.${encodeEq(accountId)}&limit=10`,warnings,'guild_members'),
    optionalList(env,'liveops_event_account_progress',`select=event_instance_id,personal_points,combat_points,skilling_points,last_contribution_at&account_id=eq.${encodeEq(accountId)}&order=last_contribution_at.desc.nullslast&limit=30`,warnings,'event_progress'),
    optionalList(env,'liveops_event_reward_claims',`select=event_instance_id,party_id,reward_kind,milestone_points,reward_bundle_id,claimed_at&account_id=eq.${encodeEq(accountId)}&order=claimed_at.desc&limit=30`,warnings,'reward_claims'),
    optionalList(env,'ops_redeem_code_claims',`select=code_id,reward_bundle_id,status,error_text,created_at,granted_at&account_id=eq.${encodeEq(accountId)}&order=created_at.desc&limit=30`,warnings,'redeem_claims'),
    optionalList(env,'liveops_event_party_bindings',`select=event_instance_id,party_id,locked_at,points_at_lock&account_id=eq.${encodeEq(accountId)}&order=locked_at.desc&limit=20`,warnings,'party_bindings'),
    list(env,'ops_support_cases',`select=*&account_id=eq.${encodeEq(accountId)}&order=updated_at.desc&limit=50`),
    list(env,'ops_support_notes',`select=*&account_id=eq.${encodeEq(accountId)}&order=created_at.desc&limit=100`),
    list(env,'ops_alerts',`select=*&account_id=eq.${encodeEq(accountId)}&order=last_seen_at.desc&limit=50`),
    list(env,'ops_admin_commands',`select=*&target_account_id=eq.${encodeEq(accountId)}&order=created_at.desc&limit=100`),
  ]);
  const partyIds=[...new Set((partyMembers??[]).map(x=>x.party_id).filter(Boolean))], guildIds=[...new Set((guildMembers??[]).map(x=>x.guild_id).filter(Boolean))];
  const parties=partyIds.length?await optionalList(env,'parties',`select=id,name,status,activity_preference,play_style,created_at&id=in.(${partyIds.map(encodeEq).join(',')})`,warnings,'parties'):[];
  const guilds=guildIds.length?await optionalList(env,'guilds',`select=id,name,level,xp,member_cap,created_at&id=in.(${guildIds.map(encodeEq).join(',')})`,warnings,'guilds'):[];
  return {account:index??{account_id:accountId},authUser,characters,partyMembers,parties,guildMembers,guilds,eventProgress,claims,redeemClaims,bindings,cases:cases??[],notes:notes??[],alerts:alerts??[],adminCommands:adminCommands??[],warnings};
}

async function createSupportCase(env,actor,payload){
  requireRole(actor,'editor'); const accountId=String(payload.accountId??''); if(!isUuid(accountId)) throw new Error('account_id_invalid'); const title=String(payload.title??'').trim().slice(0,160); if(title.length<3) throw new Error('support_case_title_too_short'); const priority=String(payload.priority??'normal'); if(!['low','normal','high','urgent'].includes(priority)) throw new Error('support_priority_invalid');
  const rows=await supabaseFetch(env,'/rest/v1/ops_support_cases',{method:'POST',body:{account_id:accountId,title,summary:String(payload.summary??'').trim().slice(0,4000),priority,status:'open',created_by:actor.user.id},prefer:'return=representation'}); const row=rows?.[0]; await audit(env,actor,'support_case.create','support_case',row?.id,{accountId,title,priority}); return row;
}
async function updateSupportCase(env,actor,payload){
  requireRole(actor,'editor'); const row=await single(env,'ops_support_cases',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('support_case_not_found'); const status=String(payload.status??row.status); if(!['open','waiting','resolved'].includes(status)) throw new Error('support_case_status_invalid'); const priority=String(payload.priority??row.priority); if(!['low','normal','high','urgent'].includes(priority)) throw new Error('support_priority_invalid'); const body={status,priority,summary:payload.summary===undefined?row.summary:String(payload.summary??'').trim().slice(0,4000),updated_at:new Date().toISOString(),resolved_at:status==='resolved'?new Date().toISOString():null}; const rows=await supabaseFetch(env,'/rest/v1/ops_support_cases',{method:'PATCH',query:`id=eq.${encodeEq(payload.id)}`,body,prefer:'return=representation'}); await audit(env,actor,'support_case.update','support_case',payload.id,{accountId:row.account_id,before:{status:row.status,priority:row.priority},after:{status,priority}}); return rows?.[0];
}
async function addSupportNote(env,actor,payload){
  requireRole(actor,'editor'); const accountId=String(payload.accountId??''); if(!isUuid(accountId)) throw new Error('account_id_invalid'); const note=String(payload.note??'').trim(); if(note.length<3||note.length>4000) throw new Error('support_note_length_invalid'); const category=String(payload.category??'general'); if(!['general','bug','economy','social','event','moderation','recovery'].includes(category)) throw new Error('support_note_category_invalid');
  const rows=await supabaseFetch(env,'/rest/v1/ops_support_notes',{method:'POST',body:{account_id:accountId,case_id:payload.caseId||null,category,note,created_by:actor.user.id},prefer:'return=representation'}); const row=rows?.[0]; await audit(env,actor,'support_note.add','support_account',accountId,{noteId:row?.id,caseId:payload.caseId||null,category}); return row;
}


async function appendCommandEvent(env, commandId, eventType, actor = null, detail = {}) {
  await supabaseFetch(env,'/rest/v1/ops_admin_command_events',{method:'POST',body:{command_id:commandId,event_type:eventType,actor_account_id:actor?.user?.id||null,actor_email:actor?.user?.email||null,detail_json:detail},prefer:'return=minimal'});
}

async function catalogRows(env) {
  const [rows,rewards] = await Promise.all([
    list(env,'ops_admin_content_catalog','select=*&enabled=eq.true&order=entity_type.asc,label.asc&limit=5000'),
    list(env,'liveops_admin_reward_catalog','select=bundle_id,label,tier,enabled,validated&enabled=eq.true&order=label.asc&limit=500'),
  ]);
  const merged=[...(rows??[])];
  const seen=new Set(merged.map(x=>`${x.entity_type}:${x.entity_key}`));
  for(const reward of rewards??[]){
    const key=`reward_bundle:${reward.bundle_id}`;
    if(seen.has(key)) continue;
    merged.push({entity_type:'reward_bundle',entity_key:reward.bundle_id,label:reward.label,description:`Reward bundle · ${reward.tier}`,metadata_json:{tier:reward.tier,validated:reward.validated},enabled:reward.enabled,synced_at:null});
  }
  return merged;
}

async function validateCatalogReferences(env, registry, parameters) {
  const errors=[];
  for(const field of registry?.params_schema?.fields || []){
    if(!['catalog','catalog_multi'].includes(field.type)) continue;
    const raw=parameters?.[field.name];
    const values=field.type==='catalog_multi'?(Array.isArray(raw)?raw:[]):[raw];
    for(const value of values){
      if(!value) continue;
      if(field.catalogType==='reward_bundle'){
        const reward=await single(env,'liveops_admin_reward_catalog',`bundle_id=eq.${encodeEq(value)}&enabled=eq.true`);
        if(!reward || !reward.validated) errors.push(`${field.name}: reward bundle ${value} is missing, disabled, or not validated`);
        continue;
      }
      const row=await single(env,'ops_admin_content_catalog',`entity_type=eq.${encodeEq(field.catalogType)}&entity_key=eq.${encodeEq(value)}&enabled=eq.true`);
      if(!row) errors.push(`${field.name}: ${field.catalogType} ${value} is not in the synced content catalog`);
    }
  }
  return errors;
}

async function controlCenter(env) {
  const [registry,commands,content,health,announcements] = await Promise.all([
    list(env,'ops_admin_command_registry','select=*&enabled=eq.true&order=category.asc,risk_tier.asc,label.asc&limit=300'),
    list(env,'ops_admin_commands','select=*&order=created_at.desc&limit=250'),
    catalogRows(env),
    list(env,'liveops_runtime_health','select=*&component=eq.admin_command_worker&limit=1'),
    list(env,'ops_admin_announcements','select=*&order=starts_at.desc&limit=100'),
  ]);
  return { registry:registry??[],commands:commands??[],content:content??[],workerHealth:health?.[0]??null,announcements:announcements??[],dualApprovalCritical:String(env.CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL||'false').toLowerCase()==='true' };
}

async function commandTimeline(env,payload){
  const id=String(payload.id||''); if(!isUuid(id)) throw new Error('command_id_invalid');
  const [command,events]=await Promise.all([single(env,'ops_admin_commands',`id=eq.${encodeEq(id)}`),list(env,'ops_admin_command_events',`select=*&command_id=eq.${encodeEq(id)}&order=created_at.asc&limit=200`)]);
  if(!command) throw new Error('admin_command_not_found'); return {command,events:events??[]};
}

async function queueAdminCommand(env,actor,payload){
  const commandKey=String(payload.commandKey||'');
  const registry=await single(env,'ops_admin_command_registry',`command_key=eq.${encodeEq(commandKey)}&enabled=eq.true`);
  if(!registry) throw new Error('admin_command_not_found');
  const dualApprovalCritical=String(env.CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL||'false').toLowerCase()==='true';
  const validation=validateCommandRequest(registry,actor.admin.role,payload,{dualApprovalCritical});
  validation.errors.push(...await validateCatalogReferences(env,registry,validation.normalized.parameters));
  if(validation.errors.length) return {queued:false,errors:validation.errors};
  const status=commandStatusAfterQueue(registry,{dualApprovalCritical});
  const now=new Date().toISOString();
  const body={command_key:registry.command_key,target_account_id:validation.normalized.targetAccountId,target_character_id:validation.normalized.targetCharacterId,target_ref:validation.normalized.targetRef,parameters_json:validation.normalized.parameters,reason:validation.normalized.reason,risk_tier:registry.risk_tier,status,requested_by:actor.user.id,requested_by_email:actor.user.email||null,requested_by_role:actor.admin.role,approved_by:status==='approved'?actor.user.id:null,approved_at:status==='approved'?now:null,confirmation_text:validation.normalized.confirmation||null,idempotency_key:payload.idempotencyKey&&isUuid(payload.idempotencyKey)?payload.idempotencyKey:crypto.randomUUID(),execute_after:payload.executeAfter?new Date(payload.executeAfter).toISOString():now,reversible:Boolean(registry.reversible)};
  const rows=await supabaseFetch(env,'/rest/v1/ops_admin_commands',{method:'POST',body,prefer:'return=representation'}); const row=rows?.[0];
  await appendCommandEvent(env,row.id,'requested',actor,{commandKey:registry.command_key,status,targetAccountId:body.target_account_id,targetCharacterId:body.target_character_id,reason:body.reason,parameters:body.parameters_json});
  if(status==='approved') await appendCommandEvent(env,row.id,'approved',actor,{automatic:true});
  await audit(env,actor,'admin_command.queue','admin_command',row.id,{commandKey:registry.command_key,riskTier:registry.risk_tier,status,targetAccountId:body.target_account_id,targetCharacterId:body.target_character_id,reason:body.reason});
  return {queued:true,command:row,confirmationPhrase:confirmationPhrase(registry.command_key)};
}

async function approveAdminCommand(env,actor,payload){
  requireRole(actor,'owner'); const row=await single(env,'ops_admin_commands',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('admin_command_not_found'); if(row.status!=='pending_approval') throw new Error('admin_command_not_pending_approval');
  const dual=String(env.CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL||'false').toLowerCase()==='true'; if(dual&&row.requested_by===actor.user.id) throw new Error('second_owner_approval_required');
  if(String(payload.confirmation||'').trim()!==`APPROVE ${row.command_key}`) throw new Error(`confirmation_must_match:APPROVE ${row.command_key}`);
  const reason=String(payload.reason||'').trim(); if(reason.length<10) throw new Error('approval_reason_too_short'); const now=new Date().toISOString();
  const rows=await supabaseFetch(env,'/rest/v1/ops_admin_commands',{method:'PATCH',query:`id=eq.${encodeEq(row.id)}&status=eq.pending_approval`,body:{status:'approved',approved_by:actor.user.id,approved_at:now,available_at:now,updated_at:now},prefer:'return=representation'}); if(!rows?.[0]) throw new Error('admin_command_approval_conflict');
  await appendCommandEvent(env,row.id,'approved',actor,{reason,dualApproval:dual}); await audit(env,actor,'admin_command.approve','admin_command',row.id,{commandKey:row.command_key,reason}); return rows[0];
}

async function cancelAdminCommand(env,actor,payload){
  requireRole(actor,'editor'); const row=await single(env,'ops_admin_commands',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('admin_command_not_found'); if(!['pending_approval','approved','failed'].includes(row.status)) throw new Error('admin_command_not_cancellable'); if(row.risk_tier==='critical') requireRole(actor,'owner');
  const reason=String(payload.reason||'').trim(); if(reason.length<8) throw new Error('cancel_reason_too_short'); const now=new Date().toISOString();
  const rows=await supabaseFetch(env,'/rest/v1/ops_admin_commands',{method:'PATCH',query:`id=eq.${encodeEq(row.id)}`,body:{status:'cancelled',cancelled_by:actor.user.id,cancelled_at:now,updated_at:now},prefer:'return=representation'});
  await appendCommandEvent(env,row.id,'cancelled',actor,{reason,priorStatus:row.status}); await audit(env,actor,'admin_command.cancel','admin_command',row.id,{commandKey:row.command_key,reason}); return rows?.[0];
}

async function retryAdminCommand(env,actor,payload){
  requireRole(actor,'owner'); const row=await single(env,'ops_admin_commands',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('admin_command_not_found'); if(row.status!=='failed'||Number(row.attempts)>=5) throw new Error('admin_command_not_retryable'); const reason=String(payload.reason||'').trim(); if(reason.length<10) throw new Error('retry_reason_too_short'); const now=new Date().toISOString();
  const rows=await supabaseFetch(env,'/rest/v1/ops_admin_commands',{method:'PATCH',query:`id=eq.${encodeEq(row.id)}`,body:{status:'approved',available_at:now,locked_at:null,error_text:null,updated_at:now},prefer:'return=representation'}); await appendCommandEvent(env,row.id,'retried',actor,{reason,priorError:row.error_text}); await audit(env,actor,'admin_command.retry','admin_command',row.id,{commandKey:row.command_key,reason}); return rows?.[0];
}

async function reverseAdminCommand(env,actor,payload){
  requireRole(actor,'owner'); const original=await single(env,'ops_admin_commands',`id=eq.${encodeEq(payload.id)}`); if(!original) throw new Error('admin_command_not_found'); if(!canReverse(original)) throw new Error('admin_command_not_reversible'); const reversal=original.result_json.reversal; const queued=await queueAdminCommand(env,actor,{commandKey:reversal.commandKey,targetAccountId:original.target_account_id,targetCharacterId:original.target_character_id,targetRef:original.target_ref,parameters:reversal.parameters,reason:String(payload.reason||`Reversal of command ${original.id}`),confirmation:payload.confirmation}); if(!queued.queued) return queued;
  await supabaseFetch(env,'/rest/v1/ops_admin_commands',{method:'PATCH',query:`id=eq.${encodeEq(queued.command.id)}`,body:{reversal_of:original.id,updated_at:new Date().toISOString()},prefer:'return=minimal'}); await appendCommandEvent(env,original.id,'reversal_requested',actor,{reversalCommandId:queued.command.id}); return queued;
}


async function contentCatalog(env){
  const rows=await catalogRows(env); const counts={};
  for(const row of rows) counts[row.entity_type]=(counts[row.entity_type]||0)+1;
  return {rows,counts,total:rows.length};
}

async function listRedeemCodes(env){
  const [codes,claims]=await Promise.all([
    list(env,'ops_redeem_codes','select=id,code_hint,label,reward_bundle_id,max_total_claims,max_claims_per_account,claims_count,starts_at,ends_at,enabled,created_by,updated_by,created_at,updated_at&order=created_at.desc&limit=500'),
    list(env,'ops_redeem_code_claims','select=id,code_id,account_id,claim_sequence,reward_bundle_id,status,error_text,created_at,granted_at&order=created_at.desc&limit=250'),
  ]);
  return {codes:codes??[],claims:claims??[]};
}

async function createRedeemCode(env,actor,payload){
  requireRole(actor,'owner');
  const label=String(payload.label||'').trim().slice(0,120); if(label.length<3) throw new Error('redeem_code_label_too_short');
  const bundleId=String(payload.rewardBundleId||'').trim();
  const reward=await single(env,'liveops_admin_reward_catalog',`bundle_id=eq.${encodeEq(bundleId)}&enabled=eq.true&validated=eq.true`);
  if(!reward) throw new Error('redeem_reward_bundle_not_validated');
  const custom=String(payload.customCode||'').trim();
  const plaintext=custom||generateRedeemCode(String(payload.prefix||'VELD'));
  const validation=validateRedeemCode(plaintext); if(validation.errors.length) throw new Error(`redeem_code_invalid:${validation.errors.join(' ')}`);
  const codeHash=await hashRedeemCode(plaintext), hint=redeemCodeHint(plaintext);
  const maxTotalRaw=payload.maxTotalClaims===null||payload.maxTotalClaims===''||payload.maxTotalClaims===undefined?null:Number(payload.maxTotalClaims);
  const maxPer=Number(payload.maxClaimsPerAccount??1);
  if(maxTotalRaw!==null&&(!Number.isInteger(maxTotalRaw)||maxTotalRaw<1||maxTotalRaw>1000000)) throw new Error('redeem_max_total_invalid');
  if(!Number.isInteger(maxPer)||maxPer<1||maxPer>20) throw new Error('redeem_max_per_account_invalid');
  const startsAt=payload.startsAt?new Date(payload.startsAt).toISOString():null, endsAt=payload.endsAt?new Date(payload.endsAt).toISOString():null;
  if(endsAt&&startsAt&&Date.parse(endsAt)<=Date.parse(startsAt)) throw new Error('redeem_end_before_start');
  const rows=await supabaseFetch(env,'/rest/v1/ops_redeem_codes',{method:'POST',body:{code_hash:codeHash,code_hint:hint,label,reward_bundle_id:bundleId,max_total_claims:maxTotalRaw,max_claims_per_account:maxPer,starts_at:startsAt,ends_at:endsAt,enabled:true,created_by:actor.user.id,updated_by:actor.user.id},prefer:'return=representation'});
  const row=rows?.[0];
  await audit(env,actor,'redeem_code.create','redeem_code',row?.id,{label,rewardBundleId:bundleId,codeHint:hint,maxTotalClaims:maxTotalRaw,maxClaimsPerAccount:maxPer,startsAt,endsAt});
  // Plaintext is intentionally returned once and never persisted.
  return {row:{...row,code_hash:undefined},plaintextCode:plaintext};
}

async function setRedeemCodeEnabled(env,actor,payload){
  requireRole(actor,'owner'); const id=String(payload.id||''); if(!isUuid(id)) throw new Error('redeem_code_id_invalid');
  const row=await single(env,'ops_redeem_codes',`id=eq.${encodeEq(id)}`); if(!row) throw new Error('redeem_code_not_found');
  const reason=String(payload.reason||'').trim(); if(reason.length<10) throw new Error('redeem_code_change_reason_too_short');
  const enabled=payload.enabled===true; const rows=await supabaseFetch(env,'/rest/v1/ops_redeem_codes',{method:'PATCH',query:`id=eq.${encodeEq(id)}`,body:{enabled,updated_by:actor.user.id,updated_at:new Date().toISOString()},prefer:'return=representation'});
  await audit(env,actor,enabled?'redeem_code.enable':'redeem_code.disable','redeem_code',id,{reason,label:row.label,codeHint:row.code_hint,rewardBundleId:row.reward_bundle_id,claimsCount:row.claims_count});
  return rows?.[0];
}


async function listAdmins(env){ return await list(env,'liveops_admin_users','select=account_id,role,display_name,enabled,created_at,updated_at&order=enabled.desc,role.desc,display_name.asc&limit=100')??[]; }
async function saveAdminUser(env,actor,payload){
  requireRole(actor,'owner'); const accountId=String(payload.accountId||''); if(!isUuid(accountId)) throw new Error('admin_account_id_invalid'); const authUser=await authUserById(env,accountId); if(!authUser) throw new Error('admin_auth_user_not_found'); const role=String(payload.role||'viewer'); if(!['viewer','editor','owner'].includes(role)) throw new Error('admin_role_invalid'); const displayName=String(payload.displayName||'').trim().slice(0,80)||'VELDRYN Admin'; const enabled=payload.enabled!==false;
  const existing=await single(env,'liveops_admin_users',`account_id=eq.${encodeEq(accountId)}`); const owners=await list(env,'liveops_admin_users','select=account_id&role=eq.owner&enabled=eq.true&limit=100');
  const removesOwner=existing?.role==='owner'&&existing?.enabled===true&&(!enabled||role!=='owner'); if(removesOwner&&(owners??[]).length<=1) throw new Error('cannot_remove_last_enabled_owner');
  if(accountId===actor.user.id&&removesOwner&&(owners??[]).length<=1) throw new Error('cannot_self_remove_last_owner');
  let row; if(existing){ const rows=await supabaseFetch(env,'/rest/v1/liveops_admin_users',{method:'PATCH',query:`account_id=eq.${encodeEq(accountId)}`,body:{role,display_name:displayName,enabled,updated_at:new Date().toISOString()},prefer:'return=representation'}); row=rows?.[0]; }
  else { const rows=await supabaseFetch(env,'/rest/v1/liveops_admin_users',{method:'POST',body:{account_id:accountId,role,display_name:displayName,enabled},prefer:'return=representation'}); row=rows?.[0]; }
  await audit(env,actor,existing?'admin_user.update':'admin_user.create','admin_user',accountId,{before:existing?{role:existing.role,enabled:existing.enabled,displayName:existing.display_name}:null,after:{role,enabled,displayName}}); return row;
}

async function listAnnouncements(env){ return await list(env,'ops_admin_announcements','select=*&order=starts_at.desc&limit=250')??[]; }
async function saveAnnouncement(env,actor,payload){
  requireRole(actor,'editor'); const title=String(payload.title||'').trim().slice(0,120), bodyText=String(payload.body||'').trim().slice(0,2000), severity=String(payload.severity||'info'); if(!title||!bodyText) throw new Error('announcement_title_body_required'); if(!['info','success','warning','critical'].includes(severity)) throw new Error('announcement_severity_invalid'); if(severity==='critical'||payload.pushEnabled) requireRole(actor,'owner');
  const audience=payload.audience&&typeof payload.audience==='object'?payload.audience:{kind:'all'}; if(!['all','account','guild','event_participants'].includes(audience.kind)) throw new Error('announcement_audience_invalid'); if(audience.kind==='account'&&!isUuid(audience.accountId)) throw new Error('announcement_account_invalid'); if(audience.kind==='guild'&&!isUuid(audience.guildId)) throw new Error('announcement_guild_invalid'); if(audience.kind==='event_participants'&&!isUuid(audience.eventInstanceId)) throw new Error('announcement_event_invalid');
  const startsAt=payload.startsAt?new Date(payload.startsAt).toISOString():new Date().toISOString(), endsAt=payload.endsAt?new Date(payload.endsAt).toISOString():null; if(endsAt&&Date.parse(endsAt)<=Date.parse(startsAt)) throw new Error('announcement_end_before_start');
  const record={title,body:bodyText,severity,audience_json:audience,starts_at:startsAt,ends_at:endsAt,in_game_enabled:payload.inGameEnabled!==false,push_enabled:Boolean(payload.pushEnabled),status:payload.status==='draft'?'draft':'scheduled',updated_by:actor.user.id,updated_at:new Date().toISOString()};
  let row; if(payload.id){ const rows=await supabaseFetch(env,'/rest/v1/ops_admin_announcements',{method:'PATCH',query:`id=eq.${encodeEq(payload.id)}&status=in.(draft,scheduled)`,body:record,prefer:'return=representation'}); row=rows?.[0]; if(!row) throw new Error('announcement_not_editable'); }
  else { const rows=await supabaseFetch(env,'/rest/v1/ops_admin_announcements',{method:'POST',body:{...record,created_by:actor.user.id},prefer:'return=representation'}); row=rows?.[0]; }
  await audit(env,actor,payload.id?'announcement.update':'announcement.create','announcement',row.id,{severity,audience,status:row.status,startsAt,endsAt,pushEnabled:row.push_enabled}); return row;
}
async function cancelAnnouncement(env,actor,payload){ requireRole(actor,'editor'); const row=await single(env,'ops_admin_announcements',`id=eq.${encodeEq(payload.id)}`); if(!row) throw new Error('announcement_not_found'); if(row.severity==='critical'||row.push_enabled) requireRole(actor,'owner'); const reason=String(payload.reason||'').trim(); if(reason.length<5) throw new Error('announcement_cancel_reason_too_short'); const now=new Date().toISOString(); const rows=await supabaseFetch(env,'/rest/v1/ops_admin_announcements',{method:'PATCH',query:`id=eq.${encodeEq(row.id)}`,body:{status:'cancelled',cancelled_by:actor.user.id,cancelled_at:now,updated_by:actor.user.id,updated_at:now},prefer:'return=representation'}); await audit(env,actor,'announcement.cancel','announcement',row.id,{reason,title:row.title}); return rows?.[0]; }

async function routeAction(env, actor, action, payload) {
  switch (action) {
    case 'me': return { user: { id: actor.user.id, email: actor.user.email }, admin: actor.admin };
    case 'dashboard': return await dashboard(env);
    case 'listDrafts': return await list(env, 'liveops_event_drafts', 'select=*&order=updated_at.desc&limit=100');
    case 'saveDraft': return await saveDraft(env, actor, payload);
    case 'deleteDraft': return await deleteDraft(env, actor, payload);
    case 'listTemplates': return await list(env, 'liveops_admin_templates', 'select=*&enabled=eq.true&order=name.asc&limit=100');
    case 'saveTemplate': return await saveTemplate(env, actor, payload);
    case 'disableTemplate': {
      requireRole(actor, 'editor');
      await supabaseFetch(env, '/rest/v1/liveops_admin_templates', { method: 'PATCH', query: `template_id=eq.${encodeEq(payload.templateId)}`, body: { enabled: false, updated_by: actor.user.id, updated_at: new Date().toISOString() }, prefer: 'return=minimal' });
      await audit(env, actor, 'template.disable', 'event_template', payload.templateId);
      return { disabled: true };
    }
    case 'cloneTemplateToDraft': {
      const template = await single(env, 'liveops_admin_templates', `template_id=eq.${encodeEq(payload.templateId)}&enabled=eq.true`);
      if (!template) throw new Error('template_not_found');
      const definition = normalizeDefinition(template.definition_json);
      if (payload.nextVersion) definition.version = Number(definition.version) + 1;
      return await cloneToDraft(env, actor, definition, `${template.name} draft`, `template:${template.template_id}`);
    }
    case 'listDefinitions': return await list(env, 'liveops_event_definitions', 'select=event_id,version,scope,definition_json,config_hash,created_at,created_by&order=event_id.asc,version.desc&limit=200');
    case 'cloneDefinitionToDraft': {
      const definitionRow = await single(env, 'liveops_event_definitions', `event_id=eq.${encodeEq(payload.eventId)}&version=eq.${Number(payload.version)}`);
      if (!definitionRow) throw new Error('definition_not_found');
      const definition = normalizeDefinition(definitionRow.definition_json);
      definition.version += 1;
      return await cloneToDraft(env, actor, definition, `${definition.name} v${definition.version}`, `definition:${payload.eventId}@${payload.version}`);
    }
    case 'publishDraft': return await publishDraft(env, actor, payload);
    case 'scheduleDefinition': return await scheduleDefinition(env, actor, payload);
    case 'listInstances': return await list(env, 'liveops_event_instances', 'select=*&order=starts_at.desc&limit=200');
    case 'listPlayerEvents': return await listPlayerEvents(env);
    case 'playerEventPreflight': return await playerEventPreflight(env, payload);
    case 'playerEventAnalytics': return await playerEventAnalytics(env, payload);
    case 'playerActivityAnalytics': return await playerActivityAnalytics(env, payload);
    case 'playerLifecycleAnalytics': return await playerLifecycleAnalytics(env, payload);
    case 'playerEventSeriesComparison': return await playerEventSeriesComparison(env, payload);
    case 'clonePlayerEventSeason': return await clonePlayerEventSeason(env, actor, payload);
    case 'applySeasonalCalendarPreset': return await applySeasonalCalendarPreset(env, actor, payload);
    case 'schedulePlayerEvent': return await schedulePlayerEvent(env, actor, payload);
    case 'setPlayerEventEnabled': return await setPlayerEventEnabled(env, actor, payload);
    case 'goLivePlayerEvent': return await goLivePlayerEvent(env, actor, payload);
    case 'endPlayerEventNow': return await endPlayerEventNow(env, actor, payload);
    case 'rescheduleInstance': return await rescheduleInstance(env, actor, payload);
    case 'cancelInstance': return await cancelInstance(env, actor, payload);
    case 'archiveInstance': return await archiveInstance(env, actor, payload);
    case 'listRewards': return await list(env, 'liveops_admin_reward_catalog', 'select=*&order=tier.asc,label.asc&limit=300');
    case 'saveReward': return await saveReward(env, actor, payload);
    case 'leaderboard': return await leaderboard(env, payload);
    case 'eventStats': return await eventStats(env, payload);
    case 'operations': return await operations(env);
    case 'retryDeadLetter': return await retryDeadLetter(env, actor, payload);
    case 'remoteConfig': return await remoteConfig(env);
    case 'saveRemoteConfig': return await saveRemoteConfig(env, actor, payload);
    case 'healthEconomy': return await healthEconomy(env);
    case 'updateAlert': return await updateAlert(env, actor, payload);
    case 'resets': return await resets(env);
    case 'saveResetDefinition': return await saveResetDefinition(env, actor, payload);
    case 'retryResetRun': return await retryResetRun(env, actor, payload);
    case 'supportSearch': return await supportSearch(env, payload);
    case 'supportAccount': return await supportAccount(env, payload);
    case 'createSupportCase': return await createSupportCase(env, actor, payload);
    case 'updateSupportCase': return await updateSupportCase(env, actor, payload);
    case 'addSupportNote': return await addSupportNote(env, actor, payload);
    case 'controlCenter': return await controlCenter(env);
    case 'contentCatalog': return await contentCatalog(env);
    case 'listRedeemCodes': return await listRedeemCodes(env);
    case 'createRedeemCode': return await createRedeemCode(env, actor, payload);
    case 'setRedeemCodeEnabled': return await setRedeemCodeEnabled(env, actor, payload);
    case 'commandTimeline': return await commandTimeline(env, payload);
    case 'queueAdminCommand': return await queueAdminCommand(env, actor, payload);
    case 'approveAdminCommand': return await approveAdminCommand(env, actor, payload);
    case 'cancelAdminCommand': return await cancelAdminCommand(env, actor, payload);
    case 'retryAdminCommand': return await retryAdminCommand(env, actor, payload);
    case 'reverseAdminCommand': return await reverseAdminCommand(env, actor, payload);
    case 'listAdmins': return await listAdmins(env);
    case 'saveAdminUser': return await saveAdminUser(env, actor, payload);
    case 'listAnnouncements': return await listAnnouncements(env);
    case 'saveAnnouncement': return await saveAnnouncement(env, actor, payload);
    case 'cancelAnnouncement': return await cancelAnnouncement(env, actor, payload);
    case 'audit': return await list(env, 'liveops_admin_audit_log', 'select=*&order=created_at.desc&limit=300');
    default: throw new Error('unknown_action');
  }
}

function errorStatus(message) {
  if (['authentication_required','invalid_session'].includes(message)) return 401;
  if (['admin_access_required','insufficient_admin_role','origin_not_allowed'].includes(message)) return 403;
  if (message.includes('not_found')) return 404;
  if (message.includes('conflict') || message.includes('overlap')) return 409;
  return 400;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const body = await request.json();
    const action = String(body?.action ?? '');
    if (!action) throw new Error('action_required');
    if (MUTATING_ACTIONS.has(action)) assertOrigin(request, env);
    const actor = await verifyUser(request, env);
    const data = await routeAction(env, actor, action, body?.payload ?? {});
    return json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error('VELDRYN Control API error', message);
    return json({ ok: false, error: message }, errorStatus(message));
  }
}
