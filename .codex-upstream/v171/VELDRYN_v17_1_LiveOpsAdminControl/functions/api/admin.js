import { collectRewardBundleIds, hashDefinition, normalizeDefinition, scheduleValidation, validateDefinition } from '../_shared/liveops.js';

const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };
const MUTATING_ACTIONS = new Set([
  'saveDraft','deleteDraft','saveTemplate','disableTemplate','cloneTemplateToDraft','cloneDefinitionToDraft',
  'publishDraft','scheduleDefinition','rescheduleInstance','cancelInstance','archiveInstance','saveReward','retryDeadLetter'
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
  const [instances, drafts, audits, draftCount, healthRows, deadLetterCount] = await Promise.all([
    list(env, 'liveops_event_instances', 'select=id,event_id,definition_version,starts_at,ends_at,status,definition_snapshot&status=in.(scheduled,active,settling)&order=starts_at.asc&limit=40'),
    list(env, 'liveops_event_drafts', 'select=id,name,status,updated_at,definition_json&status=eq.draft&order=updated_at.desc&limit=10'),
    list(env, 'liveops_admin_audit_log', 'select=id,actor_email,action,target_type,target_id,created_at&order=created_at.desc&limit=10'),
    countRows(env, 'liveops_event_drafts', 'status=eq.draft'),
    list(env, 'liveops_runtime_health', 'select=*&component=eq.party_liveops_worker&limit=1'),
    countRows(env, 'social_contribution_outbox', 'status=eq.dead_letter'),
  ]);
  const nowMs = Date.now();
  const active = (instances ?? []).filter((row) => row.status === 'active' || (row.status === 'scheduled' && Date.parse(row.starts_at) <= nowMs && Date.parse(row.ends_at) > nowMs));
  const scheduled = (instances ?? []).filter((row) => row.status === 'scheduled' && Date.parse(row.starts_at) > nowMs);
  const settling = (instances ?? []).filter((row) => row.status === 'settling');
  return {
    counts: { active: active.length, scheduled: scheduled.length, settling: settling.length, drafts: draftCount, deadLetters: deadLetterCount },
    active: active[0] ?? null,
    next: scheduled[0] ?? null,
    workerHealth: healthRows?.[0] ?? null,
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
    case 'rescheduleInstance': return await rescheduleInstance(env, actor, payload);
    case 'cancelInstance': return await cancelInstance(env, actor, payload);
    case 'archiveInstance': return await archiveInstance(env, actor, payload);
    case 'listRewards': return await list(env, 'liveops_admin_reward_catalog', 'select=*&order=tier.asc,label.asc&limit=300');
    case 'saveReward': return await saveReward(env, actor, payload);
    case 'leaderboard': return await leaderboard(env, payload);
    case 'eventStats': return await eventStats(env, payload);
    case 'operations': return await operations(env);
    case 'retryDeadLetter': return await retryDeadLetter(env, actor, payload);
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
