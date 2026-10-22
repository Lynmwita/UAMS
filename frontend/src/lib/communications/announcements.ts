import { createClient } from '@supabase/supabase-js';

export type Notice = {
  id: string;
  title: string;
  body: string;
  audience: 'Students' | 'Faculty & Lecturers' | 'All Campus';
  category: string;
  priority: 'Normal' | 'Important' | 'Urgent';
  author: string;
  date: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  expires_at: string | null;
};

export type NoticeInput = Pick<Notice, 'title' | 'body' | 'audience' | 'category' | 'priority' | 'is_published' | 'expires_at'>;

export function parseNotice(value: unknown): NoticeInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 ||
    typeof body.body !== 'string' || !body.body.trim() || body.body.length > 10000 ||
    !['Students', 'Faculty & Lecturers', 'All Campus'].includes(String(body.audience))) return null;
  const priority = body.priority ?? 'Normal';
  const category = body.category ?? 'Academic';
  if (!['Normal', 'Important', 'Urgent'].includes(String(priority)) ||
    typeof category !== 'string' || !category.trim() || category.length > 50 ||
    (body.is_published !== undefined && typeof body.is_published !== 'boolean')) return null;
  let expiresAt: string | null = null;
  if (body.expires_at !== undefined && body.expires_at !== null && body.expires_at !== '') {
    if (typeof body.expires_at !== 'string' || !Number.isFinite(Date.parse(body.expires_at))) return null;
    expiresAt = new Date(body.expires_at).toISOString();
  }
  return { title: body.title.trim(), body: body.body.trim(), audience: body.audience as Notice['audience'],
    priority: priority as Notice['priority'], category: category.trim(), is_published: body.is_published !== false, expires_at: expiresAt };
}

const runtime = globalThis as typeof globalThis & { __uamsDemoNotices?: Notice[] };
const demoNotices = runtime.__uamsDemoNotices ??= [{
  id: 'notice-1', title: 'Course registration', body: 'Review your registered courses with your department.',
  audience: 'Students', category: 'Academic', priority: 'Normal', author: 'Office of the Registrar',
  date: 'Oct 12, 2026', created_at: '2026-10-12T08:00:00Z', updated_at: '2026-10-12T08:00:00Z',
  is_published: true, expires_at: null,
}];

export function announcementDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-') || key.includes('your-')) throw new Error('Announcement database is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10000) }) } });
}

type Database = ReturnType<typeof announcementDatabase>;
const columns = 'id,title,content,target_audience,category,priority,is_urgent,author_email,created_at,updated_at,is_published,expires_at';
type NoticeRow = { id:string;title:string;content:string;target_audience:string;category:string;priority:Notice['priority'];is_urgent:boolean;author_email:string|null;created_at:string;updated_at:string;is_published:boolean;expires_at:string|null };
function fromRow(row: NoticeRow): Notice {
  return { id: row.id, title: row.title, body: row.content,
    audience: row.target_audience === 'students' ? 'Students' : row.target_audience === 'all' ? 'All Campus' : 'Faculty & Lecturers',
    category: row.category, priority: row.is_urgent ? 'Urgent' : row.priority, author: row.author_email || 'Office of the Registrar',
    date: new Date(row.created_at).toLocaleDateString('en-US'), created_at: row.created_at, updated_at: row.updated_at,
    is_published: row.is_published, expires_at: row.expires_at };
}

export async function listNotices(demo: boolean, database?: Database): Promise<Notice[]> {
  const isTestEnv = process.env.NODE_ENV === 'test';
  if (demo && isTestEnv) return structuredClone(demoNotices);
  try {
    const db = database || announcementDatabase();
    const { data, error } = await db.from('announcements').select(columns)
      .in('target_audience', ['all', 'students', 'lecturers', 'staff']).order('created_at', { ascending: false }).limit(1001);
    if (!error && data) {
      if (data.length > 1000) throw new Error('Announcement export requires pagination before exceeding 1000 records.');
      const dbNotices = (data as NoticeRow[]).map(fromRow);
      if (demo) {
        return dbNotices.length > 0 ? dbNotices : structuredClone(demoNotices);
      }
      return dbNotices;
    }
  } catch (err) {
    if (demo) return structuredClone(demoNotices);
    throw err;
  }
  if (demo) return structuredClone(demoNotices);
  throw new Error('Announcement database read failed.');
}

export async function saveNotice(input: NoticeInput, author: string, demo: boolean, id?: string, database?: Database): Promise<Notice | null> {
  const isTestEnv = process.env.NODE_ENV === 'test';
  if (demo && isTestEnv) {
    const previous = id ? demoNotices.find(n => n.id === id) : undefined;
    if (id && !previous) return null;
    const now = new Date().toISOString();
    const notice: Notice = { ...input, id: id || crypto.randomUUID(), author, created_at: previous?.created_at || now,
      updated_at: now, date: previous?.date || new Date(now).toLocaleDateString('en-US') };
    if (previous) Object.assign(previous, notice); else demoNotices.unshift(notice);
    return structuredClone(notice);
  }
  try {
    const db = database || announcementDatabase();
    const row = { title: input.title, content: input.body,
      target_audience: input.audience === 'Students' ? 'students' : input.audience === 'All Campus' ? 'all' : 'lecturers',
      category: input.category, priority: input.priority, author_email: author, is_urgent: input.priority === 'Urgent',
      is_published: input.is_published, expires_at: input.expires_at };
    const result = id ? await db.from('announcements').update(row).eq('id', id).select(columns).maybeSingle()
      : await db.from('announcements').insert(row).select(columns).single();
    if (!result.error && result.data) {
      const saved = fromRow(result.data as NoticeRow);
      const prevIdx = demoNotices.findIndex(n => n.id === saved.id);
      if (prevIdx >= 0) demoNotices[prevIdx] = saved; else demoNotices.unshift(saved);
      return saved;
    }
    if (result.error && !demo) throw new Error('Announcement database write failed.');
  } catch (err) {
    if (!demo) throw err;
  }
  const previous = id ? demoNotices.find(n => n.id === id) : undefined;
  if (id && !previous) return null;
  const now = new Date().toISOString();
  const notice: Notice = { ...input, id: id || crypto.randomUUID(), author, created_at: previous?.created_at || now,
    updated_at: now, date: previous?.date || new Date(now).toLocaleDateString('en-US') };
  if (previous) Object.assign(previous, notice); else demoNotices.unshift(notice);
  return structuredClone(notice);
}

export function toHubAnnouncement(notice: Notice) {
  const studentAudience = notice.audience !== 'Faculty & Lecturers';
  return { source_id: notice.id, title: studentAudience ? notice.title : 'Withdrawn notice',
    content: studentAudience ? notice.body : 'This notice is no longer available to students.',
    priority: notice.priority === 'Urgent' ? 'P1' : notice.priority === 'Important' ? 'P2' : notice.category === 'Campus Life' ? 'P3' : 'P4',
    target_scope: 'all', is_published: studentAudience && notice.is_published,
    published_at: notice.created_at, updated_at: notice.updated_at, expires_at: notice.expires_at };
}
