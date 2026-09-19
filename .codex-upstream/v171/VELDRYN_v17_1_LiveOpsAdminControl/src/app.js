import { ACTIVITY_KINDS, CHALLENGES, CATEGORIES, normalizeDefinition, validateDefinition } from './liveops.js';

const CONFIG = window.VELDRYN_CONTROL_CONFIG || {};
const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const SESSION_KEY = 'veldryn-control-session-v1';

const state = {
  session: loadSession(),
  me: null,
  page: 'dashboard',
  loading: false,
  dashboard: null,
  drafts: [],
  templates: [],
  definitions: [],
  instances: [],
  rewards: [],
  audits: [],
  operations: null,
  currentDraftId: null,
  leaderboardInstanceId: null,
  leaderboard: null,
  eventStats: null,
};

function h(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
}
function attr(value) { return h(value).replace(/`/g, '&#96;'); }
function fmtNumber(value) { return new Intl.NumberFormat().format(Number(value ?? 0)); }
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(d);
}
function utc(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().replace('.000Z','Z');
}
function localInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,16);
}
function localToIso(value) { return value ? new Date(value).toISOString() : null; }
function statusPill(status) {
  const map = { active:'good', scheduled:'info', settling:'warn', finalized:'info', archived:'', cancelled:'bad', draft:'warn', published:'good' };
  return `<span class="pill ${map[status] || ''}">${h(status || 'unknown')}</span>`;
}
function roleAtLeast(role) {
  const rank = { viewer:1, editor:2, owner:3 };
  return (rank[state.me?.admin?.role] || 0) >= rank[role];
}
function workerHealthView(health) {
  if (!health?.last_ok_at) return { state:'unknown', cls:'warn', label:'No heartbeat yet', detail:'Wire the v17 worker health adapter.' };
  const ageMs = Date.now() - Date.parse(health.last_ok_at);
  if (ageMs <= 5 * 60_000 && !health.last_error) return { state:'healthy', cls:'good', label:'Healthy', detail:`Last successful tick ${fmtDate(health.last_ok_at)}` };
  if (ageMs <= 5 * 60_000 && health.last_error_at && Date.parse(health.last_error_at) > Date.parse(health.last_ok_at)) return { state:'error', cls:'bad', label:'Latest tick failed', detail:health.last_error || 'Worker error' };
  return { state:'stale', cls:'bad', label:'Heartbeat stale', detail:`Last successful tick ${fmtDate(health.last_ok_at)}` };
}
function toast(message, kind = '') {
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.textContent = message;
  toastRoot.append(node);
  setTimeout(() => node.remove(), 4200);
}
function errorText(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/supabase_\d+:(.*)$/s);
  if (match) {
    try { return JSON.parse(match[1]).message || raw; } catch { return raw; }
  }
  return raw.replaceAll('_',' ');
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function saveSession(session) {
  state.session = session;
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}
function configured() { return /^https:\/\//.test(CONFIG.supabaseUrl || '') && (CONFIG.supabaseAnonKey || '').length > 20; }

async function authFetch(path, options = {}) {
  const response = await fetch(`${CONFIG.supabaseUrl}${path}`, {
    ...options,
    headers: { apikey: CONFIG.supabaseAnonKey, 'content-type':'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(body.error_description || body.msg || body.message || `auth_${response.status}`);
  return body;
}
async function signIn(email, password) {
  const body = await authFetch('/auth/v1/token?grant_type=password', { method:'POST', body: JSON.stringify({ email, password }) });
  saveSession({ access_token: body.access_token, refresh_token: body.refresh_token, expires_at: Date.now() + Number(body.expires_in || 3600) * 1000 });
}
async function refreshSession() {
  if (!state.session?.refresh_token) throw new Error('session_expired');
  const body = await authFetch('/auth/v1/token?grant_type=refresh_token', { method:'POST', body: JSON.stringify({ refresh_token: state.session.refresh_token }) });
  saveSession({ access_token: body.access_token, refresh_token: body.refresh_token || state.session.refresh_token, expires_at: Date.now() + Number(body.expires_in || 3600) * 1000 });
}
async function ensureSession() {
  if (!state.session?.access_token) throw new Error('authentication_required');
  if (Number(state.session.expires_at || 0) < Date.now() + 60000) await refreshSession();
}
async function api(action, payload = {}, retry = true) {
  await ensureSession();
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization: `Bearer ${state.session.access_token}` },
    body: JSON.stringify({ action, payload }),
  });
  const body = await response.json().catch(() => ({ ok:false, error:`http_${response.status}` }));
  if (!response.ok || !body.ok) {
    if (retry && (response.status === 401 || body.error === 'invalid_session')) {
      await refreshSession();
      return api(action, payload, false);
    }
    throw new Error(body.error || `api_${response.status}`);
  }
  return body.data;
}
async function signOut() {
  try {
    if (state.session?.access_token) await authFetch('/auth/v1/logout', { method:'POST', headers:{ authorization:`Bearer ${state.session.access_token}` } });
  } catch {}
  saveSession(null);
  state.me = null;
  render();
}

function renderLogin(message = '') {
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-card">
        <div class="login-banner">
          <div class="brand-mark"><span>V</span></div>
          <div class="eyebrow">Private developer console</div>
          <h1>VELDRYN Control</h1>
          <p>Live-Ops scheduling, event authoring, rewards and Party leaderboards.</p>
        </div>
        <div class="login-body">
          ${!configured() ? `<div class="validation-item error" style="margin-bottom:14px">This build has no Supabase public configuration. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY, then rebuild.</div>` : ''}
          ${message ? `<div class="validation-item error" style="margin-bottom:14px">${h(message)}</div>` : ''}
          <form id="login-form" class="grid" autocomplete="on">
            <div class="field"><label for="login-email">Admin email</label><input id="login-email" name="email" type="email" autocomplete="username" required /></div>
            <div class="field"><label for="login-password">Password</label><input id="login-password" name="password" type="password" autocomplete="current-password" required /></div>
            <button class="btn btn-primary" type="submit" ${configured() ? '' : 'disabled'}>Sign in securely</button>
          </form>
          <p class="small" style="margin-top:14px">Only accounts explicitly added to <span class="mono">liveops_admin_users</span> can access the API.</p>
        </div>
      </section>
    </main>`;
}

const NAV = [
  ['dashboard','◈','Dashboard'],['events','◷','Events'],['builder','✦','Builder'],['templates','▦','Templates'],['rewards','◇','Rewards'],['leaderboards','≋','Leaderboards'],['operations','⚙','Operations'],['audit','⌁','Audit']
];
function shell(content, title) {
  return `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="eyebrow">VELDRYN</div><h1>CONTROL</h1><p>Live-Ops administration</p></div>
      <nav class="nav">${NAV.map(([id,icon,label]) => `<button data-nav="${id}" class="${state.page === id ? 'active' : ''}"><span class="icon">${icon}</span><span class="label">${label}</span></button>`).join('')}</nav>
      <div class="sidebar-foot">
        <div class="admin-chip"><strong>${h(state.me?.admin?.display_name || state.me?.user?.email || 'Admin')}</strong><span>${h(state.me?.admin?.role || '')} · ${h(state.me?.user?.email || '')}</span></div>
        <button class="btn btn-ghost" style="width:100%" data-action="logout">Sign out</button>
      </div>
    </aside>
    <section class="main">
      <header class="topbar"><h2>${h(title)}</h2><div class="topbar-actions"><span class="pill good">API protected</span><button class="btn btn-sm btn-ghost" data-action="refresh-page">Refresh</button></div></header>
      <div class="content">${content}</div>
    </section>
  </div>`;
}

function loading() { return `<div class="loading"><div><div class="spinner"></div>Loading…</div></div>`; }
function empty(text) { return `<div class="empty">${h(text)}</div>`; }

function eventName(row) { return row?.definition_snapshot?.name || row?.event_id || 'Event'; }
function renderDashboard() {
  const d = state.dashboard;
  if (!d) return shell(loading(), 'Dashboard');
  const active = d.active;
  const next = d.next;
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Operations overview</div><h2>Live-Ops Dashboard</h2><p>Current event state, upcoming schedule and recent control-plane changes.</p></div></div>
    <div class="grid grid-4">
      <div class="card metric"><div class="label">Active events</div><div class="value">${d.counts.active}</div><div class="foot">Party Event scope</div></div>
      <div class="card metric"><div class="label">Scheduled</div><div class="value">${d.counts.scheduled}</div><div class="foot">Future event instances</div></div>
      <div class="card metric"><div class="label">Settling</div><div class="value">${d.counts.settling}</div><div class="foot">Awaiting finalization worker</div></div>
      <div class="card metric"><div class="label">Drafts</div><div class="value">${d.counts.drafts}</div><div class="foot">Mutable authoring state</div></div>
    </div>
    ${(() => { const w=workerHealthView(d.workerHealth); return `<div class="grid grid-2" style="margin-top:14px"><div class="card"><div class="card-head"><h3>Live-Ops worker</h3><span class="pill ${w.cls}">${h(w.label)}</span></div><div class="card-body"><div class="small">${h(w.detail)}</div>${d.workerHealth?.last_result_json ? `<div class="mono tiny faint" style="margin-top:8px">${h(JSON.stringify(d.workerHealth.last_result_json))}</div>`:''}<div class="actions" style="margin-top:12px"><button class="btn btn-sm" data-nav="operations">Operations</button></div></div></div><div class="card"><div class="card-head"><h3>Contribution outbox</h3><span class="pill ${d.counts.deadLetters ? 'bad':'good'}">${fmtNumber(d.counts.deadLetters)} dead letter${d.counts.deadLetters===1?'':'s'}</span></div><div class="card-body"><div class="muted small">Dead-letter rows require operator review. Retrying is Owner-only and returns the row to the normal idempotent worker pipeline.</div><div class="actions" style="margin-top:12px"><button class="btn btn-sm" data-nav="operations">Inspect</button></div></div></div></div>`; })()}
    <div class="grid grid-2" style="margin-top:14px">
      <div class="card"><div class="card-head"><h3>Current event</h3>${active ? statusPill(active.status) : ''}</div><div class="card-body">${active ? `
        <div class="eyebrow">${h(active.event_id)} · v${h(active.definition_version)}</div><h3 style="margin:6px 0 8px">${h(eventName(active))}</h3>
        <div class="muted small">${fmtDate(active.starts_at)} → ${fmtDate(active.ends_at)}</div>
        <div class="actions" style="margin-top:14px"><button class="btn btn-sm" data-action="open-leaderboard" data-id="${attr(active.id)}">Leaderboard</button><button class="btn btn-sm btn-ghost" data-action="open-event-stats" data-id="${attr(active.id)}">Operational stats</button></div>` : empty('No Party Event is active.')}</div></div>
      <div class="card"><div class="card-head"><h3>Next scheduled</h3>${next ? statusPill(next.status) : ''}</div><div class="card-body">${next ? `
        <div class="eyebrow">${h(next.event_id)} · v${h(next.definition_version)}</div><h3 style="margin:6px 0 8px">${h(eventName(next))}</h3><div class="muted small">Starts ${fmtDate(next.starts_at)}</div><div class="small faint mono" style="margin-top:5px">${utc(next.starts_at)}</div>` : empty('Nothing scheduled yet.')}</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:14px">
      <div class="card"><div class="card-head"><h3>Recent drafts</h3><button class="btn btn-sm" data-nav="builder">Open Builder</button></div><div class="card-body"><div class="list">${d.drafts.length ? d.drafts.map(x => `<div class="list-row"><div><strong>${h(x.name)}</strong><p>${h(x.definition_json?.id || 'No event ID')} · v${h(x.definition_json?.version || 1)}</p></div><div class="list-meta"><span class="tiny muted">${fmtDate(x.updated_at)}</span></div></div>`).join('') : empty('No drafts.')}</div></div></div>
      <div class="card"><div class="card-head"><h3>Recent audit activity</h3><button class="btn btn-sm" data-nav="audit">Full log</button></div><div class="card-body"><div class="list">${d.audits.length ? d.audits.map(x => `<div class="list-row"><div><strong>${h(x.action)}</strong><p>${h(x.target_type)} · ${h(x.target_id)}</p></div><div class="list-meta"><span class="tiny muted">${fmtDate(x.created_at)}</span></div></div>`).join('') : empty('No admin actions yet.')}</div></div></div>
    </div>`, 'Dashboard');
}

function renderEvents() {
  const rows = state.instances || [];
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Schedule & lifecycle</div><h2>Events</h2><p>Scheduled, active, settling and historical Party Event instances. Definition snapshots remain immutable.</p></div><div class="actions"><button class="btn btn-primary" data-nav="builder">Create / schedule event</button></div></div>
    <div class="card"><div class="card-head"><h3>Event calendar</h3><span class="pill">UTC authoritative</span></div><div class="card-body calendar">
      ${rows.length ? rows.map(row => `<div class="list-row event-row ${h(row.status)}">
        <div><div class="actions"><strong>${h(eventName(row))}</strong>${statusPill(row.status)}</div><p>${h(row.event_id)} · definition v${h(row.definition_version)} · ${fmtDate(row.starts_at)} → ${fmtDate(row.ends_at)}</p><p class="mono faint">${utc(row.starts_at)} → ${utc(row.ends_at)}</p></div>
        <div class="list-meta"><div class="actions" style="justify-content:flex-end">
          <button class="btn btn-sm" data-action="open-leaderboard" data-id="${attr(row.id)}">Leaderboard</button>
          <button class="btn btn-sm btn-ghost" data-action="open-event-stats" data-id="${attr(row.id)}">Stats</button>
          ${row.status === 'scheduled' && roleAtLeast('editor') ? `<button class="btn btn-sm btn-ghost" data-action="reschedule-event" data-id="${attr(row.id)}">Reschedule</button><button class="btn btn-sm btn-danger" data-action="cancel-event" data-id="${attr(row.id)}">Cancel</button>` : ''}
          ${['active','settling'].includes(row.status) && roleAtLeast('owner') ? `<button class="btn btn-sm btn-danger" data-action="cancel-event" data-id="${attr(row.id)}">Emergency cancel</button>` : ''}
          ${['finalized','cancelled'].includes(row.status) && roleAtLeast('editor') ? `<button class="btn btn-sm btn-ghost" data-action="archive-event" data-id="${attr(row.id)}">Archive</button>` : ''}
        </div></div>
      </div>`).join('') : empty('No event instances found.')}
    </div></div>`, 'Events');
}

function blankDefinition() {
  return normalizeDefinition({
    id:'party_event_new', version:1, scope:'party', name:'New Party Event', shortDescription:'Describe the Party Event and its purpose.', durationHours:48,
    contributionRules:{ allowedCategories:['combat','skilling'], allowedActivityKinds:[], allowedRegionIds:[], requiredAnyTags:[], dailyAccountCreditCap:2400, activityMultipliers:{}, challengeMultipliers:{}, minimumCategoryFraction:{ combat:0.30, skilling:0.30 } },
    personalMilestones:[250,750,1500,2500].map((points) => ({ points, reward:{ bundleId:`party_event_personal_${points}_v1`, tier:'milestone' } })),
    partyMilestones:[2000,4000,6000,9000].map((points) => ({ points, reward:{ bundleId:`party_event_party_${points}_v1`, tier:'milestone' } })),
    personalPartyRewardEligibilityPoints:250, rankedMinimumPartyPoints:4000, rankedMinimumMeaningfulContributors:2, meaningfulContributorPoints:250, partyBindingLockPoints:250,
    rankingRewards:{
      qualified:{bundleId:'party_event_participation_v1',tier:'participation'}, top25Percent:{bundleId:'party_event_rank_top25_v1',tier:'milestone'},
      top10Percent:{bundleId:'party_event_rank_top10pct_v1',tier:'prestige'}, top100:{bundleId:'party_event_rank_top100_v1',tier:'prestige'}, top10:{bundleId:'party_event_rank_top10_v1',tier:'prestige'}
    },
    eventTags:['mixed','party_event']
  });
}
function currentDraft() { return state.drafts.find(x => x.id === state.currentDraftId) || null; }
function rewardOptions(selected, tier = null) {
  const rows = (state.rewards || []).filter(r => r.enabled && (!tier || r.tier === tier || tier === 'any'));
  const options = rows.map(r => `<option value="${attr(r.bundle_id)}" ${r.bundle_id === selected ? 'selected':''}>${h(r.label)}${r.validated ? '' : ' ⚠'} · ${h(r.bundle_id)}</option>`);
  if (selected && !rows.some(r => r.bundle_id === selected)) options.unshift(`<option value="${attr(selected)}" selected>${h(selected)} · not in catalog</option>`);
  return options.join('');
}
function milestoneRows(kind, rows) {
  return rows.map((m,i) => `<div class="milestone-row" data-milestone="${kind}" data-index="${i}">
    <input type="number" min="1" step="1" value="${attr(m.points)}" data-field="points" aria-label="Points" />
    <select data-field="bundleId">${rewardOptions(m.reward?.bundleId, 'any')}</select>
    <select data-field="tier"><option value="milestone" ${m.reward?.tier==='milestone'?'selected':''}>Milestone</option><option value="participation" ${m.reward?.tier==='participation'?'selected':''}>Participation</option><option value="prestige" ${m.reward?.tier==='prestige'?'selected':''}>Prestige</option></select>
    <button type="button" class="btn btn-sm btn-danger" data-action="remove-milestone" data-kind="${kind}" data-index="${i}">×</button>
  </div>`).join('');
}
function checkboxGroup(name, values, selected) {
  return values.map(v => `<label class="check"><input type="checkbox" name="${name}" value="${attr(v)}" ${selected.includes(v)?'checked':''}/> ${h(v)}</label>`).join('');
}
function rankingRewardField(label, band, reward) {
  return `<div class="field"><label>${h(label)}</label><select name="rank_${band}">${rewardOptions(reward?.bundleId, 'any')}</select><input type="hidden" name="rank_${band}_tier" value="${attr(reward?.tier || (band === 'qualified' ? 'participation':'prestige'))}" /></div>`;
}
function renderEventPreviewCard(d, schedule = {}) {
  const cats = d.contributionRules.allowedCategories.map(c => c === 'combat' ? 'Combat' : 'Skilling').join(' + ') || 'No categories';
  const split = Object.entries(d.contributionRules.minimumCategoryFraction || {}).map(([k,v]) => `${k} ${Math.round(Number(v)*100)}%`).join(' · ');
  const region = d.contributionRules.allowedRegionIds?.length ? d.contributionRules.allowedRegionIds.join(', ') : 'All eligible regions';
  const start = schedule.startsAt ? fmtDate(schedule.startsAt) : 'Not scheduled';
  const end = schedule.endsAt ? fmtDate(schedule.endsAt) : `${d.durationHours}h after start`;
  return `<div class="card" style="background:linear-gradient(180deg,#18231c,#0e1712);border-color:#4e5f4f">
    <div class="card-body">
      <div class="actions" style="justify-content:space-between"><div><div class="eyebrow">Player event preview</div><h3 style="font-size:1.25rem;margin:5px 0 3px">${h(d.name)}</h3><div class="muted small">${h(d.shortDescription)}</div></div><span class="pill info">${h(d.durationHours)}h</span></div>
      <div class="grid grid-3" style="margin-top:14px">
        <div class="preview-box"><div class="tiny muted">TYPE</div><strong>${h(cats)}</strong><div class="tiny faint" style="margin-top:4px">${h(region)}</div></div>
        <div class="preview-box"><div class="tiny muted">WINDOW</div><strong>${h(start)}</strong><div class="tiny faint" style="margin-top:4px">to ${h(end)}</div></div>
        <div class="preview-box"><div class="tiny muted">DAILY CAP</div><strong>${fmtNumber(d.contributionRules.dailyAccountCreditCap)} pts</strong><div class="tiny faint" style="margin-top:4px">≈ ${(d.contributionRules.dailyAccountCreditCap/1000).toFixed(1)} routine hours</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:10px">
        <div class="preview-box"><div class="tiny muted" style="margin-bottom:6px">PERSONAL MILESTONES</div>${d.personalMilestones.map(m=>`<div class="list-row" style="padding:7px 8px;margin-bottom:5px"><strong>${fmtNumber(m.points)}</strong><span class="tiny muted">${h(m.reward.bundleId)}</span></div>`).join('') || '<span class="muted small">None</span>'}</div>
        <div class="preview-box"><div class="tiny muted" style="margin-bottom:6px">PARTY MILESTONES</div>${d.partyMilestones.map(m=>`<div class="list-row" style="padding:7px 8px;margin-bottom:5px"><strong>${fmtNumber(m.points)}</strong><span class="tiny muted">${h(m.reward.bundleId)}</span></div>`).join('') || '<span class="muted small">None</span>'}</div>
      </div>
      <div class="preview-box" style="margin-top:10px"><div class="tiny muted">RANKING QUALIFICATION</div><div class="small" style="margin-top:5px">${fmtNumber(d.rankedMinimumPartyPoints)} Party points · ${h(d.rankedMinimumMeaningfulContributors)} meaningful contributors at ${fmtNumber(d.meaningfulContributorPoints)}+ each${split ? ` · ${h(split)}` : ''}</div><div class="tiny faint" style="margin-top:5px">Member Party-reward eligibility: ${fmtNumber(d.personalPartyRewardEligibilityPoints)} points · Party binding locks at ${fmtNumber(d.partyBindingLockPoints)} points.</div></div>
    </div>
  </div>`;
}
function renderBuilder() {
  const draft = currentDraft();
  const d = normalizeDefinition(draft?.definition_json || blankDefinition());
  const schedule = draft?.schedule_json || {};
  const validation = validateDefinition(d);
  const published = draft?.status === 'published';
  const startDefault = schedule.startsAt ? localInput(schedule.startsAt) : '';
  const endDefault = schedule.endsAt ? localInput(schedule.endsAt) : '';
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Event authoring</div><h2>Event Builder</h2><p>Create drafts, validate scoring and rewards, preview the player-facing configuration, then publish an immutable definition and schedule it.</p></div><div class="actions"><button class="btn" data-action="new-draft">New blank draft</button></div></div>
    <div class="builder-layout">
      <aside class="card draft-list"><div class="card-head"><h3>Drafts</h3><span class="pill">${state.drafts.length}</span></div><div>${state.drafts.length ? state.drafts.map(x => `<button class="draft-btn ${x.id===state.currentDraftId?'active':''}" data-action="select-draft" data-id="${attr(x.id)}"><strong>${h(x.name)}</strong><span>${h(x.definition_json?.id || '')} · v${h(x.definition_json?.version || 1)} · ${h(x.status)}</span></button>`).join('') : `<div class="card-body muted small">No drafts yet. Start blank or clone a template.</div>`}</div></aside>
      <div>
        ${draft ? `<form id="builder-form">
          <div class="card" style="margin-bottom:14px"><div class="card-head"><div><h3>${h(draft.name)}</h3><div class="tiny muted" style="margin-top:3px">${h(d.id)} · v${h(d.version)} · ${h(draft.status)}</div></div><div class="actions">${statusPill(draft.status)}<button type="button" class="btn btn-sm btn-danger" data-action="delete-draft">Delete</button></div></div></div>
          ${published ? `<div class="validation-item warning" style="margin-bottom:14px">This draft was already published as <strong>${h(draft.published_event_id)} v${h(draft.published_version)}</strong>. Published definitions cannot be changed. Clone the published definition as a new version before changing live content.</div>` : ''}
          <fieldset ${published?'disabled':''}>
          <details class="section" open><summary>1. General</summary><div class="section-inner form-grid">
            <div class="field full"><label>Draft name</label><input name="draftName" value="${attr(draft.name)}" maxlength="120" /></div>
            <div class="field"><label>Event ID</label><input name="eventId" value="${attr(d.id)}" ${published?'disabled':''} /></div>
            <div class="field"><label>Definition version</label><input name="version" type="number" min="1" step="1" value="${attr(d.version)}" ${published?'disabled':''}/></div>
            <div class="field"><label>Display name</label><input name="eventName" value="${attr(d.name)}" maxlength="80" ${published?'disabled':''}/></div>
            <div class="field"><label>Duration (hours)</label><input name="durationHours" type="number" min="24" max="72" step="1" value="${attr(d.durationHours)}" ${published?'disabled':''}/></div>
            <div class="field full"><label>Short description</label><textarea name="shortDescription" maxlength="240" ${published?'disabled':''}>${h(d.shortDescription)}</textarea></div>
            <div class="field full"><label>Event tags (comma-separated)</label><input name="eventTags" value="${attr(d.eventTags.join(', '))}" ${published?'disabled':''}/><span class="tiny faint">Used as soft Party/Guild recruitment matching hints.</span></div>
          </div></details>
          <details class="section" open><summary>2. Eligibility & scoring</summary><div class="section-inner grid">
            <div class="field"><label>Contribution categories</label><div class="check-row">${checkboxGroup('allowedCategories', CATEGORIES, d.contributionRules.allowedCategories)}</div></div>
            <div class="field"><label>Eligible activity kinds — leave all unchecked to allow all kinds inside selected categories</label><div class="check-row">${checkboxGroup('allowedActivityKinds', ACTIVITY_KINDS, d.contributionRules.allowedActivityKinds)}</div></div>
            <div class="form-grid"><div class="field"><label>Allowed region IDs (comma-separated; blank = all)</label><input name="allowedRegionIds" value="${attr(d.contributionRules.allowedRegionIds.join(', '))}" /></div><div class="field"><label>Required content tags (match any; blank = none)</label><input name="requiredAnyTags" value="${attr(d.contributionRules.requiredAnyTags.join(', '))}" /></div></div>
            <div class="form-grid"><div class="field"><label>Daily credited point cap / account</label><input name="dailyCap" type="number" min="100" max="10000" step="50" value="${attr(d.contributionRules.dailyAccountCreditCap)}" /></div><div class="field"><label>Approx. credited routine hours/day</label><input disabled value="${(d.contributionRules.dailyAccountCreditCap/1000).toFixed(2)} h" /></div></div>
            <div><div class="small muted" style="margin-bottom:7px">Activity multipliers (0.50–1.50; blank = 1.00)</div><div class="multiplier-grid">${ACTIVITY_KINDS.map(k => `<div class="field"><label>${h(k)}</label><input name="activity_${k}" type="number" min="0.5" max="1.5" step="0.01" value="${attr(d.contributionRules.activityMultipliers?.[k] ?? '')}" /></div>`).join('')}</div></div>
            <div><div class="small muted" style="margin-bottom:7px">Challenge multipliers on top of normalized v16 scoring (0.75–1.50)</div><div class="multiplier-grid">${CHALLENGES.map(k => `<div class="field"><label>${h(k)}</label><input name="challenge_${k}" type="number" min="0.75" max="1.5" step="0.01" value="${attr(d.contributionRules.challengeMultipliers?.[k] ?? '')}" /></div>`).join('')}</div></div>
            <div class="form-grid"><div class="field"><label>Minimum Combat share for ranking (%)</label><input name="minCombatPercent" type="number" min="0" max="80" step="1" value="${attr(Math.round((d.contributionRules.minimumCategoryFraction?.combat || 0)*100))}" /></div><div class="field"><label>Minimum Skilling share for ranking (%)</label><input name="minSkillingPercent" type="number" min="0" max="80" step="1" value="${attr(Math.round((d.contributionRules.minimumCategoryFraction?.skilling || 0)*100))}" /></div></div>
          </div></details>
          <details class="section"><summary>3. Milestones & rewards</summary><div class="section-inner grid">
            <div><div class="actions" style="justify-content:space-between;margin-bottom:8px"><strong class="small">Personal milestones</strong><button type="button" class="btn btn-sm" data-action="add-milestone" data-kind="personal">+ Add</button></div><div id="personal-milestones">${milestoneRows('personal',d.personalMilestones)}</div></div>
            <div><div class="actions" style="justify-content:space-between;margin-bottom:8px"><strong class="small">Party milestones</strong><button type="button" class="btn btn-sm" data-action="add-milestone" data-kind="party">+ Add</button></div><div id="party-milestones">${milestoneRows('party',d.partyMilestones)}</div></div>
            <div class="validation-item warning">Publishing is blocked until every referenced reward bundle exists in the Reward Catalog, is enabled, and has been explicitly marked <strong>Validated</strong> by an Owner.</div>
          </div></details>
          <details class="section"><summary>4. Party ranking & anti-leech rules</summary><div class="section-inner form-grid">
            <div class="field"><label>Member eligibility points</label><input name="eligibilityPoints" type="number" min="1" value="${attr(d.personalPartyRewardEligibilityPoints)}" /></div>
            <div class="field"><label>Minimum Party points to rank</label><input name="rankedMinPoints" type="number" min="1" value="${attr(d.rankedMinimumPartyPoints)}" /></div>
            <div class="field"><label>Meaningful contributors required</label><input name="rankedContributors" type="number" min="2" max="4" value="${attr(d.rankedMinimumMeaningfulContributors)}" /></div>
            <div class="field"><label>Points per meaningful contributor</label><input name="meaningfulPoints" type="number" min="1" value="${attr(d.meaningfulContributorPoints)}" /></div>
            <div class="field"><label>Party binding lock points</label><input name="bindingPoints" type="number" min="1" value="${attr(d.partyBindingLockPoints)}" /></div><div></div>
            ${rankingRewardField('Qualified Party reward','qualified',d.rankingRewards.qualified)}
            ${rankingRewardField('Top 25% reward','top25Percent',d.rankingRewards.top25Percent)}
            ${rankingRewardField('Top 10% reward','top10Percent',d.rankingRewards.top10Percent)}
            ${rankingRewardField('Top 100 reward','top100',d.rankingRewards.top100)}
            ${rankingRewardField('Top 10 reward','top10',d.rankingRewards.top10)}
          </div></details>
          </fieldset>
          <details class="section" open><summary>5. Schedule</summary><div class="section-inner form-grid">
            <div class="field"><label>Start (your local time)</label><input name="startsAt" type="datetime-local" value="${attr(startDefault)}" /></div>
            <div class="field"><label>End (your local time)</label><input name="endsAt" type="datetime-local" value="${attr(endDefault)}" /></div>
            <div class="field"><label>Settlement grace (minutes)</label><input name="graceMinutes" type="number" min="5" max="30" value="${attr(schedule.settlementGraceMinutes ?? 10)}" /></div>
            <div class="field"><label>Authoritative timezone</label><input disabled value="UTC (timestamps are converted on save)" /></div>
            <div class="full tiny faint">The database rejects overlapping scheduled/active Party Events. Your browser time is converted to exact UTC timestamps.</div>
          </div></details>
          <details class="section" open><summary>6. Preview & validation</summary><div class="section-inner">
            <div id="builder-validation">${renderValidation(validation)}</div>
            <div id="event-visual-preview" style="margin-top:10px">${renderEventPreviewCard(d,schedule)}</div>
            <details style="margin-top:10px"><summary class="small muted">Advanced definition JSON</summary><div class="preview-box" style="margin-top:8px"><pre id="definition-preview">${h(JSON.stringify(d,null,2))}</pre></div></details>
          </div></details>
          <div class="card"><div class="card-body actions">
            <button type="button" class="btn" data-action="save-draft" ${published?'disabled':''}>Save draft</button>
            <button type="button" class="btn" data-action="save-template" ${published?'disabled':''}>Save as reusable template</button>
            <button type="button" class="btn btn-primary" data-action="publish-draft" ${published?'disabled':''}>Publish immutable definition</button>
            <button type="button" class="btn btn-primary" data-action="publish-and-schedule" ${published?'':'disabled'}>Schedule published definition</button>
          </div></div>
        </form>` : `<div class="card"><div class="card-body">${empty('Create a blank draft or clone one of the v17 templates to begin.')}</div></div>`}
      </div>
    </div>`, 'Event Builder');
}

function renderValidation(v) {
  const items = [];
  for (const x of v.errors) items.push(`<div class="validation-item error">${h(x)}</div>`);
  for (const x of v.warnings) items.push(`<div class="validation-item warning">${h(x)}</div>`);
  if (!items.length) items.push(`<div class="validation-item ok">Definition passes structural validation.</div>`);
  return `<div class="validation">${items.join('')}</div>`;
}

function renderTemplates() {
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Reusable content</div><h2>Templates & Published Definitions</h2><p>Templates are editable starting points. Published definitions are immutable versions used by scheduled event instances.</p></div></div>
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><h3>Editable templates</h3><span class="pill">${state.templates.length}</span></div><div class="card-body"><div class="list">${state.templates.length ? state.templates.map(t => `<div class="list-row"><div><strong>${h(t.name)}</strong><p>${h(t.description)} · source ${h(t.source)}</p><p class="mono faint">${h(t.template_id)}</p></div><div class="list-meta"><button class="btn btn-sm btn-primary" data-action="clone-template" data-id="${attr(t.template_id)}">Create draft</button></div></div>`).join('') : empty('No templates.')}</div></div></div>
      <div class="card"><div class="card-head"><h3>Published immutable definitions</h3><span class="pill">${state.definitions.length}</span></div><div class="card-body"><div class="list">${state.definitions.length ? state.definitions.map(d => `<div class="list-row"><div><strong>${h(d.definition_json?.name || d.event_id)} · v${h(d.version)}</strong><p>${h(d.definition_json?.shortDescription || '')}</p><p class="mono faint">${h(d.config_hash?.slice(0,16) || '')}…</p></div><div class="list-meta"><button class="btn btn-sm" data-action="clone-definition" data-id="${attr(d.event_id)}" data-version="${attr(d.version)}">Clone → v${Number(d.version)+1}</button></div></div>`).join('') : empty('No definitions have been published.')}</div></div></div>
    </div>`, 'Templates');
}

function renderRewards() {
  const canEdit = roleAtLeast('owner');
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Economy safety</div><h2>Reward Catalog</h2><p>An owner must confirm that a reward bundle exists in the real game economy before Live-Ops publishing can reference it.</p></div></div>
    ${!canEdit ? `<div class="validation-item warning" style="margin-bottom:14px">Your role is ${h(state.me?.admin?.role)}. Only Owners can change or validate reward bundles.</div>` : ''}
    <div class="card" style="margin-bottom:14px"><div class="card-head"><h3>Add / update bundle</h3></div><div class="card-body"><form id="reward-form" class="form-grid">
      <div class="field"><label>Bundle ID</label><input name="bundleId" placeholder="party_event_special_v1" required ${canEdit?'':'disabled'} /></div>
      <div class="field"><label>Label</label><input name="label" placeholder="Special Party Event reward" required ${canEdit?'':'disabled'} /></div>
      <div class="field"><label>Tier</label><select name="tier" ${canEdit?'':'disabled'}><option>participation</option><option selected>milestone</option><option>prestige</option></select></div>
      <div class="field"><label>Status</label><div class="check-row"><label class="check"><input type="checkbox" name="enabled" checked ${canEdit?'':'disabled'}/> Enabled</label><label class="check"><input type="checkbox" name="validated" ${canEdit?'':'disabled'}/> Validated in economy registry</label></div></div>
      <div class="field full"><label>Notes</label><textarea name="notes" placeholder="What this bundle contains / where it is implemented" ${canEdit?'':'disabled'}></textarea></div>
      <div class="full"><button class="btn btn-primary" type="submit" ${canEdit?'':'disabled'}>Save reward bundle</button></div>
    </form></div></div>
    <div class="card"><div class="card-head"><h3>Catalog</h3><span class="pill">${state.rewards.length}</span></div><div class="table-wrap"><table><thead><tr><th>Bundle</th><th>Tier</th><th>Enabled</th><th>Validated</th><th>Notes</th><th></th></tr></thead><tbody>
      ${state.rewards.map(r => `<tr><td><strong>${h(r.label)}</strong><div class="mono tiny faint">${h(r.bundle_id)}</div></td><td>${h(r.tier)}</td><td>${r.enabled?'<span class="pill good">Yes</span>':'<span class="pill bad">No</span>'}</td><td>${r.validated?'<span class="pill good">Validated</span>':'<span class="pill warn">Pending</span>'}</td><td class="muted">${h(r.notes || '')}</td><td>${canEdit?`<button class="btn btn-sm" data-action="edit-reward" data-id="${attr(r.bundle_id)}">Edit</button>`:''}</td></tr>`).join('')}
    </tbody></table></div></div>`, 'Rewards');
}

function renderLeaderboards() {
  const eligibleInstances = state.instances.filter(x => !['cancelled'].includes(x.status));
  const selected = state.leaderboardInstanceId || eligibleInstances[0]?.id || '';
  const lb = state.leaderboard;
  const stats = state.eventStats;
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Competitive monitoring</div><h2>Party Leaderboards</h2><p>Live scores before finalization; immutable rank snapshots after finalization.</p></div></div>
    <div class="card" style="margin-bottom:14px"><div class="card-body form-grid"><div class="field full"><label>Event instance</label><select id="leaderboard-select"><option value="">Select event…</option>${eligibleInstances.map(x => `<option value="${attr(x.id)}" ${x.id===selected?'selected':''}>${h(eventName(x))} · ${h(x.status)} · ${fmtDate(x.starts_at)}</option>`).join('')}</select></div></div></div>
    ${stats ? `<div class="grid grid-4" style="margin-bottom:14px"><div class="card metric"><div class="label">Participating parties</div><div class="value">${fmtNumber(stats.partyCount)}</div></div><div class="card metric"><div class="label">Rank-qualified</div><div class="value">${fmtNumber(stats.qualifiedPartyCount)}</div></div><div class="card metric"><div class="label">${stats.totalPartyPointsIsPartial?'Top 1,000 Party points':'Total Party points'}</div><div class="value">${fmtNumber(stats.totalPartyPoints)}</div>${stats.totalPartyPointsIsPartial?'<div class="foot">Partial aggregate for performance</div>':''}</div><div class="card metric"><div class="label">Reward claims</div><div class="value">${fmtNumber(stats.rewardClaimCount)}</div><div class="foot">Dead-letter outbox: ${fmtNumber(stats.deadLetterOutboxCount)}</div></div></div>` : ''}
    <div class="card"><div class="card-head"><h3>${lb ? h(eventName(lb.instance)) : 'Leaderboard'}</h3>${lb ? `<span class="pill ${lb.finalized?'info':'good'}">${lb.finalized?'Final snapshot':'Live'}</span>`:''}</div><div class="table-wrap">
      ${lb ? `<table><thead><tr><th>#</th><th>Party</th><th>Score</th><th>Combat</th><th>Skilling</th><th>Contributors</th><th>Eligible / Band</th></tr></thead><tbody>${lb.rows.map(r => `<tr><td>${r.rank ?? '—'}</td><td><strong>${h(r.party_name_snapshot || r.party_id)}</strong><div class="mono tiny faint">${h(r.party_id)}</div></td><td>${fmtNumber(r.score)}</td><td>${r.combat_points === undefined ? '—' : fmtNumber(r.combat_points)}</td><td>${r.skilling_points === undefined ? '—' : fmtNumber(r.skilling_points)}</td><td>${fmtNumber(r.meaningful_contributors)}</td><td>${lb.finalized ? `<span class="pill info">${h(r.reward_band)}</span>` : (r.ranked_eligible ? '<span class="pill good">Qualified</span>' : '<span class="pill warn">Not yet</span>')}</td></tr>`).join('')}</tbody></table>` : `<div class="card-body">${empty('Select an event to inspect its leaderboard.')}</div>`}
    </div></div>`, 'Leaderboards');
}

function renderOperations() {
  const o = state.operations;
  if (!o) return shell(loading(),'Operations');
  const w = workerHealthView(o.workerHealth);
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Runtime reliability</div><h2>Operations</h2><p>Worker heartbeat and failed contribution-envelope recovery. The admin site never processes gameplay contribution itself.</p></div></div>
    <div class="grid grid-3" style="margin-bottom:14px">
      <div class="card metric"><div class="label">Live-Ops worker</div><div class="value" style="font-size:1.25rem"><span class="pill ${w.cls}">${h(w.label)}</span></div><div class="foot">${h(w.detail)}</div></div>
      <div class="card metric"><div class="label">Pending / processing outbox</div><div class="value">${fmtNumber(o.pendingCount)}</div><div class="foot">Normal queue depth</div></div>
      <div class="card metric"><div class="label">Dead letters</div><div class="value">${fmtNumber(o.deadLetterCount)}</div><div class="foot">Needs operator review</div></div>
    </div>
    <div class="card" style="margin-bottom:14px"><div class="card-head"><h3>Worker heartbeat detail</h3><span class="pill ${w.cls}">${h(w.state)}</span></div><div class="card-body form-grid">
      <div class="field"><label>Last started</label><input disabled value="${attr(fmtDate(o.workerHealth?.last_started_at))}" /></div>
      <div class="field"><label>Last completed</label><input disabled value="${attr(fmtDate(o.workerHealth?.last_completed_at))}" /></div>
      <div class="field"><label>Last success</label><input disabled value="${attr(fmtDate(o.workerHealth?.last_ok_at))}" /></div>
      <div class="field"><label>Last error time</label><input disabled value="${attr(fmtDate(o.workerHealth?.last_error_at))}" /></div>
      <div class="field full"><label>Last error</label><textarea disabled>${h(o.workerHealth?.last_error || '')}</textarea></div>
      <div class="field full"><label>Last result</label><div class="preview-box"><pre>${h(JSON.stringify(o.workerHealth?.last_result_json || {},null,2))}</pre></div></div>
    </div></div>
    <div class="card"><div class="card-head"><h3>Contribution dead letters</h3><span class="pill ${o.deadLetterCount?'bad':'good'}">${fmtNumber(o.deadLetterCount)}</span></div><div class="table-wrap">
      ${o.deadLetters.length ? `<table><thead><tr><th>Created</th><th>Source</th><th>Account / Party</th><th>Attempts</th><th>Error</th><th></th></tr></thead><tbody>${o.deadLetters.map(row=>`<tr><td>${fmtDate(row.created_at)}</td><td><div class="mono tiny">${h(row.source_event_id)}</div><div class="tiny muted">${h(row.event_json?.activityKind || row.event_json?.activity_kind || '')}</div></td><td><div class="mono tiny">${h(row.account_id)}</div><div class="tiny muted">${h(row.party_name_at_settlement || row.party_id_at_settlement || 'No Party')}</div></td><td>${fmtNumber(row.attempts)}</td><td class="small muted">${h(row.last_error || '')}</td><td>${roleAtLeast('owner')?`<button class="btn btn-sm btn-danger" data-action="retry-dead-letter" data-id="${attr(row.id)}">Retry</button>`:'<span class="tiny muted">Owner only</span>'}</td></tr>`).join('')}</tbody></table>` : `<div class="card-body">${empty('No dead-letter contribution envelopes.')}</div>`}
    </div></div>`, 'Operations');
}

function renderAudit() {
  return shell(`
    <div class="page-head"><div><div class="eyebrow">Control-plane history</div><h2>Audit Log</h2><p>Successful control actions are recorded with actor, role, target and structured details.</p></div></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>
      ${state.audits.map(a => `<tr><td>${fmtDate(a.created_at)}</td><td>${h(a.actor_email || a.actor_account_id || 'system')}</td><td>${h(a.actor_role || '')}</td><td><strong>${h(a.action)}</strong></td><td>${h(a.target_type)}<div class="mono tiny faint">${h(a.target_id)}</div></td><td><details><summary class="small muted">View JSON</summary><pre class="mono tiny">${h(JSON.stringify(a.detail_json || {},null,2))}</pre></details></td></tr>`).join('')}
    </tbody></table></div></div>`, 'Audit Log');
}

function collectBuilder() {
  const form = document.querySelector('#builder-form');
  if (!form) throw new Error('builder_form_missing');
  const fd = new FormData(form);
  const current = currentDraft();
  const base = normalizeDefinition(current?.definition_json || blankDefinition());
  const published = current?.status === 'published';
  const getChecked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(x => x.value);
  const split = (value) => String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  const num = (name, fallback = 0) => Number(fd.get(name) ?? fallback);
  const definition = published ? base : normalizeDefinition({
    ...base,
    id: fd.get('eventId') ?? base.id,
    version: fd.get('version') ?? base.version,
    name: fd.get('eventName') ?? base.name,
    shortDescription: fd.get('shortDescription') ?? base.shortDescription,
    durationHours: num('durationHours',base.durationHours),
    eventTags: split(fd.get('eventTags')),
    contributionRules: {
      ...base.contributionRules,
      allowedCategories: getChecked('allowedCategories'),
      allowedActivityKinds: getChecked('allowedActivityKinds'),
      allowedRegionIds: split(fd.get('allowedRegionIds')),
      requiredAnyTags: split(fd.get('requiredAnyTags')),
      dailyAccountCreditCap: num('dailyCap',2400),
      activityMultipliers: Object.fromEntries(ACTIVITY_KINDS.map(k => [k, fd.get(`activity_${k}`)]).filter(([,v]) => v !== '' && v != null).map(([k,v]) => [k,Number(v)])),
      challengeMultipliers: Object.fromEntries(CHALLENGES.map(k => [k, fd.get(`challenge_${k}`)]).filter(([,v]) => v !== '' && v != null).map(([k,v]) => [k,Number(v)])),
      minimumCategoryFraction: Object.fromEntries([['combat',num('minCombatPercent')/100],['skilling',num('minSkillingPercent')/100]].filter(([,v]) => v > 0)),
    },
    personalMilestones: collectMilestones('personal'),
    partyMilestones: collectMilestones('party'),
    personalPartyRewardEligibilityPoints: num('eligibilityPoints',250),
    rankedMinimumPartyPoints: num('rankedMinPoints',4000),
    rankedMinimumMeaningfulContributors: num('rankedContributors',2),
    meaningfulContributorPoints: num('meaningfulPoints',250),
    partyBindingLockPoints: num('bindingPoints',250),
    rankingRewards: Object.fromEntries(['qualified','top25Percent','top10Percent','top100','top10'].map(band => [band,{ bundleId:String(fd.get(`rank_${band}`) || ''), tier:String(fd.get(`rank_${band}_tier`) || (band==='qualified'?'participation':'prestige')) }]))
  });
  const schedule = {
    startsAt: localToIso(fd.get('startsAt')),
    endsAt: localToIso(fd.get('endsAt')),
    settlementGraceMinutes: num('graceMinutes',10),
  };
  return { id: current?.id, name: String(fd.get('draftName') || definition.name), definition, schedule };
}
function collectMilestones(kind) {
  return [...document.querySelectorAll(`[data-milestone="${kind}"]`)].map(row => ({
    points: Number(row.querySelector('[data-field="points"]')?.value || 0),
    reward: { bundleId: row.querySelector('[data-field="bundleId"]')?.value || '', tier: row.querySelector('[data-field="tier"]')?.value || 'milestone' }
  }));
}
function refreshBuilderPreview() {
  try {
    const data = collectBuilder();
    const v = validateDefinition(data.definition);
    const validation = document.querySelector('#builder-validation');
    const preview = document.querySelector('#definition-preview');
    const visual = document.querySelector('#event-visual-preview');
    if (validation) validation.innerHTML = renderValidation(v);
    if (visual) visual.innerHTML = renderEventPreviewCard(v.definition,data.schedule);
    if (preview) preview.textContent = JSON.stringify(v.definition,null,2);
  } catch {}
}

async function loadCore() {
  state.me = await api('me');
  await Promise.all([loadPageData('dashboard'), loadPageData('rewards')]);
}
async function loadPageData(page = state.page) {
  if (page === 'dashboard') state.dashboard = await api('dashboard');
  if (page === 'events') state.instances = await api('listInstances');
  if (page === 'builder') {
    const [drafts,rewards] = await Promise.all([api('listDrafts'),api('listRewards')]);
    state.drafts = drafts || []; state.rewards = rewards || [];
    if (!state.currentDraftId || !state.drafts.some(x => x.id === state.currentDraftId)) state.currentDraftId = state.drafts.find(x => x.status==='draft')?.id || state.drafts[0]?.id || null;
  }
  if (page === 'templates') {
    const [templates,defs] = await Promise.all([api('listTemplates'),api('listDefinitions')]); state.templates=templates||[]; state.definitions=defs||[];
  }
  if (page === 'rewards') state.rewards = await api('listRewards') || [];
  if (page === 'leaderboards') {
    state.instances = await api('listInstances') || [];
    if (state.leaderboardInstanceId) await loadLeaderboard(state.leaderboardInstanceId);
  }
  if (page === 'operations') state.operations = await api('operations');
  if (page === 'audit') state.audits = await api('audit') || [];
}
async function loadLeaderboard(id) {
  if (!id) { state.leaderboard=null; state.eventStats=null; return; }
  state.leaderboardInstanceId=id;
  const [lb,stats] = await Promise.all([api('leaderboard',{instanceId:id}),api('eventStats',{instanceId:id})]);
  state.leaderboard=lb; state.eventStats=stats;
}
async function navigate(page) {
  state.page = page;
  state.loading = true; render();
  try { await loadPageData(page); } catch (e) { toast(errorText(e),'error'); }
  state.loading = false; render();
}
function render() {
  if (!state.session) return renderLogin();
  if (!state.me) { app.innerHTML = loading(); return; }
  if (state.loading) return void (app.innerHTML = shell(loading(), NAV.find(x=>x[0]===state.page)?.[2] || 'VELDRYN Control'));
  const renderers = { dashboard:renderDashboard, events:renderEvents, builder:renderBuilder, templates:renderTemplates, rewards:renderRewards, leaderboards:renderLeaderboards, operations:renderOperations, audit:renderAudit };
  app.innerHTML = (renderers[state.page] || renderDashboard)();
}

async function initial() {
  if (!state.session) { renderLogin(); return; }
  app.innerHTML = loading();
  try { await loadCore(); render(); }
  catch (e) {
    saveSession(null); state.me=null; renderLogin(errorText(e));
  }
}

app.addEventListener('submit', async (event) => {
  if (event.target.id === 'login-form') {
    event.preventDefault();
    const fd = new FormData(event.target);
    try { await signIn(fd.get('email'),fd.get('password')); app.innerHTML=loading(); await loadCore(); render(); toast('Signed in.','success'); }
    catch(e) { saveSession(null); renderLogin(errorText(e)); }
  }
  if (event.target.id === 'reward-form') {
    event.preventDefault();
    if (!roleAtLeast('owner')) return;
    const fd = new FormData(event.target);
    try {
      await api('saveReward',{ bundleId:fd.get('bundleId'),label:fd.get('label'),tier:fd.get('tier'),enabled:fd.get('enabled')==='on',validated:fd.get('validated')==='on',notes:fd.get('notes') });
      toast('Reward catalog updated.','success'); await navigate('rewards');
    } catch(e) { toast(errorText(e),'error'); }
  }
});

app.addEventListener('change', async (event) => {
  if (event.target.id === 'leaderboard-select') {
    state.loading=true; render();
    try { await loadLeaderboard(event.target.value); } catch(e) { toast(errorText(e),'error'); }
    state.loading=false; render();
  } else if (event.target.closest('#builder-form')) refreshBuilderPreview();
});
app.addEventListener('input', (event) => { if (event.target.closest('#builder-form')) refreshBuilderPreview(); });

app.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) return navigate(nav.dataset.nav);
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  try {
    if (action === 'logout') return signOut();
    if (action === 'refresh-page') return navigate(state.page);
    if (action === 'select-draft') { state.currentDraftId=el.dataset.id; return render(); }
    if (action === 'new-draft') {
      if (!roleAtLeast('editor')) throw new Error('insufficient admin role');
      const row = await api('saveDraft',{ name:'New Party Event', definition:blankDefinition(), schedule:{} });
      toast('Draft created.','success'); await loadPageData('builder'); state.currentDraftId=row.id; return render();
    }
    if (action === 'delete-draft') {
      if (!confirm('Delete this mutable draft? Published definitions are unaffected.')) return;
      await api('deleteDraft',{id:state.currentDraftId}); toast('Draft deleted.','success'); await navigate('builder'); return;
    }
    if (action === 'save-draft') {
      const data = collectBuilder(); const validation=validateDefinition(data.definition);
      await api('saveDraft',data); toast(validation.errors.length ? 'Draft saved with validation errors.' : 'Draft saved.','success'); await navigate('builder'); return;
    }
    if (action === 'save-template') {
      const data=collectBuilder(); const id=prompt('Reusable template ID:',data.definition.id);
      if (!id) return;
      const result=await api('saveTemplate',{templateId:id,name:data.definition.name,description:data.definition.shortDescription,definition:data.definition});
      if (!result.saved) throw new Error(result.validation?.errors?.join(' | ') || 'template validation failed');
      toast('Template saved.','success'); return;
    }
    if (action === 'publish-draft') {
      const data=collectBuilder(); await api('saveDraft',data);
      const result=await api('publishDraft',{id:state.currentDraftId});
      if (!result.published) {
        const reasons=[...(result.validation?.errors||[]),...(result.rewardValidation?.missing||[]).map(x=>`Missing reward: ${x}`),...(result.rewardValidation?.unvalidated||[]).map(x=>`Unvalidated reward: ${x}`),...(result.rewardValidation?.disabled||[]).map(x=>`Disabled reward: ${x}`)];
        throw new Error(reasons.join(' | ') || result.error || 'publish failed');
      }
      toast(`Published ${data.definition.id} v${data.definition.version}.`,'success'); await navigate('builder'); return;
    }
    if (action === 'publish-and-schedule') {
      const draft=currentDraft(); if (!draft?.published_event_id) throw new Error('publish definition first');
      const data=collectBuilder();
      if (!data.schedule.startsAt || !data.schedule.endsAt) throw new Error('start and end times are required');
      const result=await api('scheduleDefinition',{eventId:draft.published_event_id,version:draft.published_version,startsAt:data.schedule.startsAt,endsAt:data.schedule.endsAt,settlementGraceMinutes:data.schedule.settlementGraceMinutes});
      if (!result.scheduled) throw new Error((result.errors||[]).join(' | '));
      toast('Event scheduled.','success'); await navigate('events'); return;
    }
    if (action === 'add-milestone') {
      const data=collectBuilder(); const list=el.dataset.kind==='personal'?data.definition.personalMilestones:data.definition.partyMilestones;
      const last=list.at(-1); list.push({points:(last?.points||0)+500,reward:{bundleId:'',tier:'milestone'}});
      const draft=currentDraft(); draft.definition_json=data.definition; if(el.dataset.kind==='personal') draft.definition_json.personalMilestones=list; else draft.definition_json.partyMilestones=list; return render();
    }
    if (action === 'remove-milestone') {
      const data=collectBuilder(); const list=el.dataset.kind==='personal'?data.definition.personalMilestones:data.definition.partyMilestones; list.splice(Number(el.dataset.index),1);
      const draft=currentDraft(); draft.definition_json=data.definition; if(el.dataset.kind==='personal') draft.definition_json.personalMilestones=list; else draft.definition_json.partyMilestones=list; return render();
    }
    if (action === 'clone-template') {
      const row=await api('cloneTemplateToDraft',{templateId:el.dataset.id}); toast('Template cloned into draft.','success'); await loadPageData('builder'); state.currentDraftId=row.id; state.page='builder'; return render();
    }
    if (action === 'clone-definition') {
      const row=await api('cloneDefinitionToDraft',{eventId:el.dataset.id,version:Number(el.dataset.version)}); toast('Published definition cloned as next version.','success'); await loadPageData('builder'); state.currentDraftId=row.id; state.page='builder'; return render();
    }
    if (action === 'open-leaderboard' || action === 'open-event-stats') { state.page='leaderboards'; state.loading=true; render(); await loadPageData('leaderboards'); await loadLeaderboard(el.dataset.id); state.loading=false; return render(); }
    if (action === 'cancel-event') {
      const row=state.instances.find(x=>x.id===el.dataset.id); const reason=row?.status==='scheduled' ? (prompt('Optional cancellation reason:','')||'') : prompt('Emergency cancellation reason (required, 10+ characters):','');
      if (reason===null) return; if (!confirm(`Cancel ${eventName(row)}? This is an operational action.`)) return;
      await api('cancelInstance',{id:el.dataset.id,reason}); toast('Event cancelled.','success'); return navigate('events');
    }
    if (action === 'archive-event') { if(!confirm('Archive this finalized/cancelled event from normal client browsing? History remains in the database.')) return; await api('archiveInstance',{id:el.dataset.id}); toast('Event archived.','success'); return navigate('events'); }
    if (action === 'reschedule-event') {
      const row=state.instances.find(x=>x.id===el.dataset.id); if(!row) return;
      const start=prompt('New start time (ISO 8601 UTC):',new Date(row.starts_at).toISOString()); if(!start) return;
      const end=prompt('New end time (ISO 8601 UTC):',new Date(row.ends_at).toISOString()); if(!end) return;
      const grace=Number(prompt('Settlement grace minutes:',String(row.settlement_grace_minutes||10))||10);
      const result=await api('rescheduleInstance',{id:row.id,startsAt:start,endsAt:end,settlementGraceMinutes:grace}); if(!result.rescheduled) throw new Error((result.errors||[]).join(' | ')); toast('Event rescheduled.','success'); return navigate('events');
    }
    if (action === 'retry-dead-letter') {
      if (!roleAtLeast('owner')) throw new Error('owner role required');
      if (!confirm('Retry this dead-letter contribution envelope through the normal worker pipeline? Downstream receipts remain idempotent.')) return;
      await api('retryDeadLetter',{id:el.dataset.id}); toast('Dead-letter row returned to pending.','success'); return navigate('operations');
    }
    if (action === 'edit-reward') {
      const row=state.rewards.find(r=>r.bundle_id===el.dataset.id); if(!row) return;
      const form=document.querySelector('#reward-form'); form.bundleId.value=row.bundle_id; form.label.value=row.label; form.tier.value=row.tier; form.enabled.checked=row.enabled; form.validated.checked=row.validated; form.notes.value=row.notes||''; form.scrollIntoView({behavior:'smooth',block:'center'}); return;
    }
  } catch(e) { toast(errorText(e),'error'); }
});

initial();
