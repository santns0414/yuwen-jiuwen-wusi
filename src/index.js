const CODE_RE = /^[A-Za-z0-9]{4,16}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function bad(msg, status = 400) {
  return json({ error: msg }, status);
}

function shanghaiNow() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+08:00`;
}

function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function ensureShare(db, code) {
  const now = shanghaiNow();
  await db.prepare(
    'INSERT OR IGNORE INTO shares (share_code, created_at) VALUES (?, ?)'
  ).bind(code, now).run();
}

async function handleGetContent(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').trim();
  const lesson = (url.searchParams.get('lesson') || '').trim();
  if (!CODE_RE.test(code)) return bad('invalid share code');
  if (!lesson || !/^[A-Za-z0-9_-]{1,32}$/.test(lesson)) return bad('invalid lesson');

  const { results } = await env.DB.prepare(
    'SELECT id, kind, payload, created_at, updated_at FROM user_content WHERE share_code = ? AND lesson_id = ? ORDER BY created_at ASC'
  ).bind(code, lesson).all();

  const notes = [];
  const tasks = [];
  for (const row of results || []) {
    let item;
    try { item = JSON.parse(row.payload); } catch { continue; }
    if (!item.id) item.id = row.id;
    item._source = (code === 'demo' || code === 'builtin') ? 'cloud-seed' : 'cloud';
    if (row.kind === 'note') notes.push(item);
    else if (row.kind === 'task') tasks.push(item);
  }
  return json({ code, lesson, notes, tasks });
}

async function handlePostShare(request, env) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  let code = (body.code || '').trim();
  if (code) {
    if (!CODE_RE.test(code)) return bad('invalid share code');
  } else {
    for (let i = 0; i < 8; i++) {
      code = genCode();
      const existing = await env.DB.prepare('SELECT share_code FROM shares WHERE share_code = ?').bind(code).first();
      if (!existing) break;
    }
  }
  await ensureShare(env.DB, code);
  return json({ code });
}

async function handlePostContent(request, env) {
  let body;
  try { body = await request.json(); } catch { return bad('invalid json'); }
  const code = String(body.code || '').trim();
  const lesson = String(body.lesson || '').trim();
  const kind = String(body.kind || '').trim();
  const item = body.item;
  if (!CODE_RE.test(code)) return bad('invalid share code');
  if (!lesson || !/^[A-Za-z0-9_-]{1,32}$/.test(lesson)) return bad('invalid lesson');
  if (kind !== 'note' && kind !== 'task') return bad('invalid kind');
  if (!item || typeof item !== 'object') return bad('missing item');

  await ensureShare(env.DB, code);

  const now = shanghaiNow();
  const id = String(item.id || `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const payloadObj = Object.assign({}, item, { id });
  if (!payloadObj.createdAt) payloadObj.createdAt = now;
  const payload = JSON.stringify(payloadObj);
  const createdAt = String(payloadObj.createdAt || now);

  await env.DB.prepare(
    `INSERT INTO user_content (id, share_code, lesson_id, kind, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       share_code = excluded.share_code,
       lesson_id = excluded.lesson_id,
       kind = excluded.kind,
       payload = excluded.payload,
       updated_at = excluded.updated_at`
  ).bind(id, code, lesson, kind, payload, createdAt, now).run();

  return json({ ok: true, id, code, lesson, kind, item: payloadObj });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/content' && request.method === 'GET') {
      try { return await handleGetContent(request, env); }
      catch (e) { return bad(String(e && e.message || e), 500); }
    }
    if (path === '/api/content' && request.method === 'POST') {
      try { return await handlePostContent(request, env); }
      catch (e) { return bad(String(e && e.message || e), 500); }
    }
    if (path === '/api/share' && request.method === 'POST') {
      try { return await handlePostShare(request, env); }
      catch (e) { return bad(String(e && e.message || e), 500); }
    }
    if (path.startsWith('/api/')) {
      return bad('not found', 404);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  },
};
