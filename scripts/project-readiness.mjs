#!/usr/bin/env node
// Read-only checks. Never applies SQL, sends notifications, or prints credentials.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'backend/package.json'));
const { parse } = require('dotenv');
const online = process.argv.includes('--online');
const load = path => existsSync(path) ? parse(readFileSync(path)) : {};
const environment = dir => Object.assign({}, ...['.env','.env.production','.env.local','.env.production.local'].map(name=>load(resolve(dir,name))));
const uams = environment(resolve(root, 'frontend'));
const hubRoot = resolve(root, '../student-life-campus-hub');
const hub = environment(hubRoot);
// Explicit process overrides can be scoped without mixing the projects' Supabase keys.
for (const [prefix, env] of [['READINESS_UAMS_', uams], ['READINESS_HUB_', hub]]) {
  for (const [key, value] of Object.entries(process.env)) if (key.startsWith(prefix)) env[key.slice(prefix.length)] = value;
}
let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'MISSING'} ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures++;
}
function required(label, env, names) {
  for (const name of names) check(`${label} ${name}`, Boolean(env[name] && !/your[-_ ]|placeholder|example\.com/i.test(env[name])));
}
required('UAMS', uams, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_APP_URL', 'JWT_SECRET', 'UAMS_FEED_SECRET', 'UAMS_FEED_CAMPUS_CODE', 'HUB_SYNC_API_KEY', 'HUB_UNIVERSITY_ID']);
required('Hub', hub, ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'UAMS_API_URL', 'UAMS_API_KEY', 'UAMS_SUPPORT_API_URL', 'HUB_SYNC_API_KEY', 'UAMS_SYNC_UNIVERSITY_ID', 'CRON_SECRET', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']);
check('Shared feed credential matches', Boolean(uams.UAMS_FEED_SECRET?.length >= 32 && hub.UAMS_API_KEY === uams.UAMS_FEED_SECRET));
check('Shared support credential matches', Boolean(uams.HUB_SYNC_API_KEY?.length >= 32 && hub.HUB_SYNC_API_KEY === uams.HUB_SYNC_API_KEY));
check('Explicit shared Hub tenant matches', Boolean(uams.HUB_UNIVERSITY_ID && hub.UAMS_SYNC_UNIVERSITY_ID === uams.HUB_UNIVERSITY_ID));
check('Hub uses full UAMS feed', /\/api\/v1\/integrations\/hub\/?$/.test(hub.UAMS_API_URL || ''));
check('Hub uses support receiver', /\/api\/v1\/integrations\/hub\/support\/?$/.test(hub.UAMS_SUPPORT_API_URL || ''));
check('Production demo login disabled', uams.ENABLE_DEMO_AUTH !== 'true' && uams.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== 'true' && hub.ENABLE_DEMO_AUTH !== 'true' && hub.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== 'true');
for (const [label, env, keys] of [['UAMS',uams,['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_APP_URL']], ['Hub',hub,['NEXT_PUBLIC_SUPABASE_URL','UAMS_API_URL','UAMS_SUPPORT_API_URL']]]) {
  for (const key of keys) check(`${label} ${key} uses HTTPS`, Boolean(env[key]?.startsWith('https://')));
}
if (online) {
  for (const [label,env,tables] of [
    ['UAMS',uams,['uams_student_records','uams_grade_records','campus_events','uams_operation_audit','hub_support_records','hub_support_history','uams_stk_requests']],
    ['Hub',hub,['universities','uams_academic_records','uams_support_deliveries','event_attendance','pilot_feedback','push_subscriptions','event_rsvps','club_memberships']],
  ]) {
    for (const table of tables) {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) { check(`${label} schema ${table}`, false, 'credentials unavailable'); continue; }
      try {
        const url = new URL(`/rest/v1/${table}?select=*&limit=0`, env.NEXT_PUBLIC_SUPABASE_URL);
        const response = await fetch(url, { headers: { apikey:env.SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, signal:AbortSignal.timeout(10000) });
        check(`${label} schema ${table}`, response.ok, `HTTP ${response.status}`);
        await response.body?.cancel();
      } catch { check(`${label} schema ${table}`, false, 'network or project unavailable'); }
    }
  }
} else console.log('Schema probes skipped; pass --online for zero-row read-only REST checks.');
console.log('Deployment, delivery, and pilot acceptance require the live walkthrough in docs/LIVE_ROLLOUT.md.');
process.exitCode = failures ? 1 : 0;
