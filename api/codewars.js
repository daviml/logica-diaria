// Proxy leve opcional para a API pública do Codewars (quando hospedado na Vercel).
// Evita eventuais bloqueios de CORS sem expor nem armazenar segredos.

const BASE = 'https://www.codewars.com/api/v1';
const SAFE_ID = /^[a-zA-Z0-9_.-]{1,80}$/;

function sendJson(res, status, data, cacheSeconds = 60) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', `public, s-maxage=${cacheSeconds}, stale-while-revalidate=300`);
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Use GET' }, 0);
  }

  const url = new URL(req.url, 'http://localhost');
  const type = url.searchParams.get('type') || '';
  const user = (url.searchParams.get('user') || '').trim();
  const slug = (url.searchParams.get('slug') || url.searchParams.get('kata') || '').trim();
  const page = Math.max(0, Math.min(20, Number(url.searchParams.get('page') || 0) || 0));

  let target = '';
  let cache = 60;

  if (type === 'kata' || (slug && !user)) {
    if (!SAFE_ID.test(slug)) return sendJson(res, 400, { error: 'Slug de kata inválido.' }, 0);
    target = `${BASE}/code-challenges/${encodeURIComponent(slug)}`;
    cache = 3600;
  } else if (type === 'completed') {
    if (!SAFE_ID.test(user)) return sendJson(res, 400, { error: 'Username inválido.' }, 0);
    target = `${BASE}/users/${encodeURIComponent(user)}/code-challenges/completed?page=${page}`;
    cache = 60;
  } else if (user) {
    if (!SAFE_ID.test(user)) return sendJson(res, 400, { error: 'Username inválido.' }, 0);
    target = `${BASE}/users/${encodeURIComponent(user)}`;
    cache = 60;
  } else {
    return sendJson(res, 400, { error: 'Informe ?user=... ou ?type=kata&slug=...' }, 0);
  }

  try {
    const upstream = await fetch(target, {
      headers: { Accept: 'application/json', 'User-Agent': 'Sinapse-Logica-Diaria/1.0' }
    });
    const text = await upstream.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (_) {
      payload = { error: text.slice(0, 200) };
    }
    return sendJson(res, upstream.status, payload, upstream.ok ? cache : 0);
  } catch (err) {
    return sendJson(res, 502, { error: 'Falha ao consultar a API do Codewars.' }, 0);
  }
};
