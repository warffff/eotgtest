const crypto = require('crypto');
const { GUILD_ID, readSession, avatarUrl, sendJson } = require('../_utils');

const STORE_PATH = process.env.LINK_STORE_PATH || 'data/discord-links.json';

function normalizeCode(code){
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
}

function now(){
  return Math.floor(Date.now() / 1000);
}

function emptyStore(){
  return { version: 1, pending: {}, links: {} };
}

function githubConfigured(){
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

function githubHeaders(){
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Edge-of-the-Force-JVS-Link'
  };
}

function ghUrl(filePath){
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`;
}

async function loadGithubStore(){
  const branch = process.env.GITHUB_BRANCH || 'main';
  const r = await fetch(`${ghUrl(STORE_PATH)}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders() });

  if (r.status === 404) {
    return { store: emptyStore(), sha: null };
  }

  if (!r.ok) {
    throw new Error(`GitHub link store read failed: HTTP ${r.status}`);
  }

  const file = await r.json();
  const text = Buffer.from(file.content || '', 'base64').toString('utf8');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    parsed = emptyStore();
  }

  parsed.pending = parsed.pending || {};
  parsed.links = parsed.links || {};

  return { store: parsed, sha: file.sha || null };
}

async function saveGithubStore(store, sha){
  const branch = process.env.GITHUB_BRANCH || 'main';
  const body = {
    message: 'Update Discord link store',
    content: Buffer.from(JSON.stringify(store, null, 2), 'utf8').toString('base64'),
    branch
  };
  if (sha) body.sha = sha;

  const r = await fetch(ghUrl(STORE_PATH), {
    method: 'PUT',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`GitHub link store write failed: HTTP ${r.status} ${text.slice(0, 200)}`);
  }
}

async function loadStore(){
  if (githubConfigured()) {
    return loadGithubStore();
  }

  globalThis.__EOTF_LINK_STORE = globalThis.__EOTF_LINK_STORE || emptyStore();
  return { store: globalThis.__EOTF_LINK_STORE, sha: null };
}

async function saveStore(store, sha){
  if (githubConfigured()) {
    await saveGithubStore(store, sha);
    return;
  }

  globalThis.__EOTF_LINK_STORE = store;
}

function cleanExpired(store){
  const t = now();
  for (const [code, data] of Object.entries(store.pending || {})) {
    if (!data || Number(data.expires_at || 0) <= t) {
      delete store.pending[code];
    }
  }
}

async function mutateStore(mutator){
  const { store, sha } = await loadStore();
  store.pending = store.pending || {};
  store.links = store.links || {};
  cleanExpired(store);
  const result = await mutator(store);
  await saveStore(store, sha);
  return result;
}

function getSecret(req){
  const auth = String(req.headers.authorization || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return String(req.headers['x-eotf-secret'] || req.headers['x-link-secret'] || '');
}

function requireServerSecret(req){
  const expected = process.env.GMOD_LINK_SECRET || process.env.LINK_API_SECRET;
  if (!expected || expected === 'CHANGE_ME') return false;
  return getSecret(req) === expected;
}

async function readJson(req){
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body || '{}'); } catch { return {}; }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function discordUserFromSession(req){
  const session = readSession(req);
  return session && session.user ? session.user : null;
}

function discordUserFromInteraction(body){
  const user = body?.member?.user || body?.user || null;
  if (!user || !user.id) return null;

  return {
    id: user.id,
    username: user.username,
    global_name: user.global_name || user.username,
    avatar_url: avatarUrl(user)
  };
}

async function createPending(payload){
  const code = normalizeCode(payload.code);
  const steamid64 = String(payload.steamid64 || '').trim();
  if (!code || !steamid64) {
    return { ok: false, error: 'BAD_REQUEST' };
  }

  const expires = Number(payload.expires_at || 0) || now() + 900;

  return mutateStore(async (store) => {
    for (const [oldCode, data] of Object.entries(store.pending)) {
      if (String(data.steamid64) === steamid64) {
        delete store.pending[oldCode];
      }
    }

    store.pending[code] = {
      code,
      steamid64,
      steamid: String(payload.steamid || ''),
      player_name: String(payload.player_name || ''),
      server_name: String(payload.server_name || ''),
      created_at: now(),
      expires_at: expires
    };

    return { ok: true, code, expires_at: expires };
  });
}

async function confirmCode(codeInput, discordUser){
  const code = normalizeCode(codeInput);
  if (!code) return { ok: false, error: 'EMPTY_CODE' };
  if (!discordUser || !discordUser.id) return { ok: false, error: 'NO_DISCORD_USER' };

  return mutateStore(async (store) => {
    const pending = store.pending[code];
    if (!pending) {
      return { ok: false, error: 'CODE_NOT_FOUND' };
    }

    if (Number(pending.expires_at || 0) <= now()) {
      delete store.pending[code];
      return { ok: false, error: 'CODE_EXPIRED' };
    }

    const link = {
      steamid64: String(pending.steamid64 || ''),
      steamid: String(pending.steamid || ''),
      player_name: String(pending.player_name || ''),
      discord_id: String(discordUser.id),
      discord_name: String(discordUser.global_name || discordUser.username || ''),
      discord_username: String(discordUser.username || ''),
      discord_avatar: String(discordUser.avatar_url || ''),
      linked_at: now()
    };

    store.links[link.steamid64] = link;
    delete store.pending[code];

    return { ok: true, link };
  });
}

async function statusFor(payload){
  const code = normalizeCode(payload.code);
  const steamid64 = String(payload.steamid64 || '').trim();

  const { store, sha } = await loadStore();
  store.pending = store.pending || {};
  store.links = store.links || {};
  cleanExpired(store);
  await saveStore(store, sha);

  if (steamid64 && store.links[steamid64]) {
    return { ok: true, confirmed: true, link: store.links[steamid64] };
  }

  if (code && store.pending[code]) {
    return { ok: true, confirmed: false, pending: true, expires_at: store.pending[code].expires_at };
  }

  return { ok: true, confirmed: false, pending: false };
}

async function unlinkSteam(payload){
  const steamid64 = String(payload.steamid64 || '').trim();
  if (!steamid64) return { ok: false, error: 'BAD_REQUEST' };

  return mutateStore(async (store) => {
    delete store.links[steamid64];
    for (const [code, data] of Object.entries(store.pending || {})) {
      if (String(data.steamid64) === steamid64) delete store.pending[code];
    }
    return { ok: true };
  });
}

function errorText(error){
  if (error === 'CODE_NOT_FOUND') return 'Код не найден. Проверь код из игры.';
  if (error === 'CODE_EXPIRED') return 'Код истёк. В игре напиши /link ещё раз.';
  if (error === 'NO_DISCORD_USER') return 'Discord пользователь не найден.';
  if (error === 'EMPTY_CODE') return 'Укажи код из игры.';
  return 'Не удалось привязать аккаунт.';
}

module.exports = {
  GUILD_ID,
  normalizeCode,
  readJson,
  sendJson,
  requireServerSecret,
  discordUserFromSession,
  discordUserFromInteraction,
  createPending,
  confirmCode,
  statusFor,
  unlinkSteam,
  errorText
};
