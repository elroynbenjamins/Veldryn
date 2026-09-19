export const ADMIN_RISK_TIERS = ['low','medium','high','critical'];
export const ADMIN_FIELD_TYPES = ['text','textarea','integer','number','boolean','datetime','uuid','select','catalog','catalog_multi','json'];
export const ADMIN_COMMAND_STATUSES = ['pending_approval','approved','processing','succeeded','failed','cancelled'];

export function roleRank(role){ return ({viewer:1,editor:2,owner:3})[role] || 0; }
export function riskRank(risk){ return ({low:1,medium:2,high:3,critical:4})[risk] || 0; }
export function confirmationPhrase(commandKey){ return `EXECUTE ${String(commandKey || '').trim()}`; }

function isUuid(value){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||'')); }
function finite(value){ const n=Number(value); return Number.isFinite(n) ? n : null; }
function cleanString(value,max=4000){ return String(value ?? '').trim().slice(0,max); }

export function validateField(field, raw){
  const errors=[];
  const type=String(field?.type || 'text');
  const name=String(field?.name || 'field');
  if(!ADMIN_FIELD_TYPES.includes(type)) return {errors:[`${name}: unsupported field type`],value:null};
  const empty=raw===undefined || raw===null || raw==='';
  if(empty){
    if(field.required) errors.push(`${name}: required`);
    return {errors,value:field.default ?? null};
  }
  let value=raw;
  if(type==='integer'){
    const n=Number(raw); if(!Number.isInteger(n)) errors.push(`${name}: whole number required`); else value=n;
  } else if(type==='number'){
    const n=finite(raw); if(n===null) errors.push(`${name}: finite number required`); else value=n;
  } else if(type==='boolean'){
    if(typeof raw==='boolean') value=raw;
    else if(['true','false'].includes(String(raw).toLowerCase())) value=String(raw).toLowerCase()==='true';
    else errors.push(`${name}: true/false required`);
  } else if(type==='uuid'){
    value=cleanString(raw,80); if(!isUuid(value)) errors.push(`${name}: UUID required`);
  } else if(type==='datetime'){
    value=cleanString(raw,80); if(Number.isNaN(Date.parse(value))) errors.push(`${name}: valid date/time required`); else value=new Date(value).toISOString();
  } else if(type==='select'){
    value=cleanString(raw,200); const allowed=(field.options||[]).map(x=>typeof x==='string'?x:x.value); if(!allowed.includes(value)) errors.push(`${name}: unsupported option`);
  } else if(type==='catalog'){
    value=cleanString(raw,160); if(!/^[A-Za-z0-9_.:\-]{1,160}$/.test(value)) errors.push(`${name}: invalid catalog key`);
  } else if(type==='catalog_multi'){
    const source=Array.isArray(raw)?raw:String(raw).split(',');
    value=[...new Set(source.map(v=>cleanString(v,160)).filter(Boolean))].slice(0,100);
    if(field.required && !value.length) errors.push(`${name}: at least one catalog value required`);
    for(const item of value) if(!/^[A-Za-z0-9_.:\-]{1,160}$/.test(item)) errors.push(`${name}: invalid catalog key ${item}`);
  } else if(type==='json'){
    if(typeof raw==='object' && raw!==null) value=raw;
    else {
      const text=cleanString(raw,Number(field.maxLength||12000));
      try { value=JSON.parse(text); } catch { errors.push(`${name}: valid JSON required`); value=null; }
    }
    if(value!==null && field.objectOnly && (Array.isArray(value)||typeof value!=='object')) errors.push(`${name}: JSON object required`);
  } else {
    value=cleanString(raw,Number(field.maxLength || (type==='textarea'?4000:500)));
    if(field.minLength && value.length<Number(field.minLength)) errors.push(`${name}: minimum length ${field.minLength}`);
  }
  if(['integer','number'].includes(type) && typeof value==='number'){
    if(field.min!==undefined && value<Number(field.min)) errors.push(`${name}: minimum ${field.min}`);
    if(field.max!==undefined && value>Number(field.max)) errors.push(`${name}: maximum ${field.max}`);
  }
  return {errors,value};
}

export function validateCommandParameters(schema, input){
  const fields=Array.isArray(schema?.fields)?schema.fields:[];
  const normalized={}; const errors=[];
  const allowed=new Set(fields.map(f=>String(f.name)));
  for(const field of fields){
    const name=String(field.name||''); if(!name){errors.push('schema field missing name');continue;}
    const result=validateField(field,input?.[name]); errors.push(...result.errors); normalized[name]=result.value;
  }
  for(const key of Object.keys(input||{})) if(!allowed.has(key)) errors.push(`${key}: unknown parameter`);
  return {errors,parameters:normalized};
}

export function validateCommandRequest(registry, actorRole, payload, {dualApprovalCritical=false}={}){
  const errors=[];
  if(!registry || registry.enabled===false) errors.push('command unavailable');
  if(roleRank(actorRole)<roleRank(registry?.min_role || 'owner')) errors.push('insufficient admin role');
  const risk=String(registry?.risk_tier || 'high');
  if(!ADMIN_RISK_TIERS.includes(risk)) errors.push('invalid command risk tier');
  const targetAccountId=payload?.targetAccountId ? String(payload.targetAccountId) : null;
  const targetCharacterId=payload?.targetCharacterId ? String(payload.targetCharacterId) : null;
  if(registry?.target_scope==='account' && !isUuid(targetAccountId)) errors.push('target account UUID required');
  if(registry?.target_scope==='character' && !isUuid(targetCharacterId)) errors.push('target character UUID required');
  if(registry?.target_scope==='account_or_character' && !isUuid(targetAccountId) && !isUuid(targetCharacterId)) errors.push('account or character target required');
  const p=validateCommandParameters(registry?.params_schema || {},payload?.parameters || {}); errors.push(...p.errors);
  const reason=cleanString(payload?.reason,1000);
  const minReason=risk==='critical'?20:risk==='high'?15:10;
  if(reason.length<minReason) errors.push(`reason must be at least ${minReason} characters`);
  if(['high','critical'].includes(risk)){
    const expected=confirmationPhrase(registry.command_key);
    if(String(payload?.confirmation || '').trim()!==expected) errors.push(`confirmation must exactly match: ${expected}`);
  }
  const requiresApproval=Boolean(registry?.requires_approval) || (risk==='critical' && dualApprovalCritical);
  return { errors, normalized:{ targetAccountId,targetCharacterId,targetRef:cleanString(payload?.targetRef,200)||null,parameters:p.parameters,reason,confirmation:cleanString(payload?.confirmation,200),requiresApproval,riskTier:risk } };
}

export function commandStatusAfterQueue(registry,{dualApprovalCritical=false}={}){
  const risk=String(registry?.risk_tier || 'high');
  return (Boolean(registry?.requires_approval) || (risk==='critical' && dualApprovalCritical)) ? 'pending_approval' : 'approved';
}

export function canReverse(command){
  return Boolean(command?.reversible && command?.status==='succeeded' && command?.result_json?.reversal?.commandKey && command?.result_json?.reversal?.parameters);
}

export function catalogMatches(field,row){
  if(field?.type!=='catalog') return true;
  return row?.entity_type===field.catalogType && row?.enabled!==false;
}
