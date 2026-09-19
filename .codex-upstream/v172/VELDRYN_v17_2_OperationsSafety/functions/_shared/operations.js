export const REMOTE_VALUE_TYPES = ['boolean','integer','number','string','json'];
export const REMOTE_RISK_TIERS = ['low','medium','critical'];
export const RESET_CADENCES = ['daily','weekly','monthly'];

export function stableBucket(accountId, key, seed = '') {
  const text = `${accountId || 'anonymous'}:${key}:${seed}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % 10000;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function validateRemoteConfig(input) {
  const row = { ...input };
  const errors = [];
  const key = String(row.config_key ?? row.configKey ?? '').trim();
  const valueType = String(row.value_type ?? row.valueType ?? 'json');
  const riskTier = String(row.risk_tier ?? row.riskTier ?? 'medium');
  const rolloutPercent = finiteNumber(row.rollout_percent ?? row.rolloutPercent ?? 100);
  if (!/^[a-z][a-z0-9_.:-]{2,119}$/.test(key)) errors.push('Config key must be 3–120 lowercase identifier characters.');
  if (!REMOTE_VALUE_TYPES.includes(valueType)) errors.push('Unsupported remote-config value type.');
  if (!REMOTE_RISK_TIERS.includes(riskTier)) errors.push('Unsupported remote-config risk tier.');
  if (rolloutPercent === null || rolloutPercent < 0 || rolloutPercent > 100) errors.push('Rollout percent must be between 0 and 100.');
  const value = row.current_value ?? row.currentValue;
  if (valueType === 'boolean' && typeof value !== 'boolean') errors.push('Boolean config requires true/false.');
  if (valueType === 'integer' && (!Number.isInteger(Number(value)) || !Number.isFinite(Number(value)))) errors.push('Integer config requires a whole number.');
  if (valueType === 'number' && finiteNumber(value) === null) errors.push('Number config requires a finite number.');
  if (valueType === 'string' && typeof value !== 'string') errors.push('String config requires text.');
  const constraints = row.constraints_json ?? row.constraintsJson ?? {};
  const numeric = finiteNumber(value);
  if (numeric !== null) {
    if (constraints.min !== undefined && numeric < Number(constraints.min)) errors.push(`Value is below minimum ${constraints.min}.`);
    if (constraints.max !== undefined && numeric > Number(constraints.max)) errors.push(`Value is above maximum ${constraints.max}.`);
  }
  if (valueType === 'string' && constraints.maxLength && String(value).length > Number(constraints.maxLength)) errors.push(`Text exceeds maximum length ${constraints.maxLength}.`);
  if (constraints.enum && !constraints.enum.includes(value)) errors.push('Value is not in the allowed set.');
  const from = row.active_from ?? row.activeFrom;
  const until = row.active_until ?? row.activeUntil;
  if (from && Number.isNaN(Date.parse(from))) errors.push('Active-from timestamp is invalid.');
  if (until && Number.isNaN(Date.parse(until))) errors.push('Active-until timestamp is invalid.');
  if (from && until && Date.parse(from) >= Date.parse(until)) errors.push('Active-until must be after active-from.');
  return { errors, normalized: { ...row, config_key:key, value_type:valueType, risk_tier:riskTier, rollout_percent: rolloutPercent ?? 100 } };
}

export function evaluateRemoteConfig(row, accountId, now = new Date()) {
  const defaultValue = row.default_value ?? row.defaultValue;
  if (row.enabled === false) return { value: defaultValue, active:false, reason:'override_disabled' };
  const t = now instanceof Date ? now.getTime() : Date.parse(now);
  if (row.active_from && t < Date.parse(row.active_from)) return { value:defaultValue, active:false, reason:'not_started' };
  if (row.active_until && t >= Date.parse(row.active_until)) return { value:defaultValue, active:false, reason:'expired' };
  const percent = Number(row.rollout_percent ?? 100);
  const bucket = stableBucket(accountId, row.config_key, row.rollout_seed ?? '');
  if (bucket >= Math.round(percent * 100)) return { value:defaultValue, active:false, reason:'outside_rollout', bucket };
  return { value: row.current_value ?? row.currentValue, active:true, reason:'override', bucket };
}

export function utcPeriodKey(definition, when = new Date()) {
  const d = when instanceof Date ? new Date(when) : new Date(when);
  if (Number.isNaN(d.getTime())) throw new Error('invalid_date');
  const cadence = definition.cadence;
  if (cadence === 'daily') return d.toISOString().slice(0,10);
  if (cadence === 'weekly') {
    const day = d.getUTCDay();
    const target = Number(definition.day_of_week ?? 1);
    const diff = (day - target + 7) % 7;
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
    return start.toISOString().slice(0,10);
  }
  if (cadence === 'monthly') return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  throw new Error('unsupported_cadence');
}

export function nextResetDue(definition, from = new Date()) {
  const now = from instanceof Date ? new Date(from) : new Date(from);
  if (Number.isNaN(now.getTime())) throw new Error('invalid_date');
  const hour = Number(definition.utc_hour ?? 0);
  const minute = Number(definition.utc_minute ?? 0);
  let candidate;
  if (definition.cadence === 'daily') {
    candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));
    if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate()+1);
  } else if (definition.cadence === 'weekly') {
    const target = Number(definition.day_of_week ?? 1);
    const delta = (target - now.getUTCDay() + 7) % 7;
    candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+delta, hour, minute));
    if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate()+7);
  } else if (definition.cadence === 'monthly') {
    const day = Math.max(1, Math.min(28, Number(definition.day_of_month ?? 1)));
    candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute));
    if (candidate <= now) candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, day, hour, minute));
  } else throw new Error('unsupported_cadence');
  return candidate.toISOString();
}
