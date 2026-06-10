const { sendJson } = require('../_utils');

function hasSecret(req){
  const expected = process.env.GMOD_LINK_SECRET || process.env.LINK_API_SECRET;
  if (!expected || expected === 'CHANGE_ME') return false;
  const auth = String(req.headers.authorization || '');
  const header = String(req.headers['x-eotf-secret'] || req.headers['x-link-secret'] || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const url = new URL(req.url, 'https://eotf.local');
  const query = url.searchParams.get('secret') || '';
  return header === expected || bearer === expected || query === expected;
}

module.exports = async (req, res) => {
  try {
    if (!hasSecret(req)) return sendJson(res, 401, { ok:false, error:'BAD_SECRET' });

    const token = process.env.DISCORD_BOT_TOKEN;
    const appId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID || '1510616159110828062';

    if (!token || !appId || !guildId) {
      return sendJson(res, 500, { ok:false, error:'DISCORD_ENV_MISSING' });
    }

    const commands = [{
      name: 'link',
      description: 'Привязать Discord к аккаунту Edge of the Force',
      options: [{
        type: 3,
        name: 'code',
        description: 'Код, который показал сервер после /link',
        required: true
      }]
    }];

    const r = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });

    const body = await r.text();
    if (!r.ok) return sendJson(res, 500, { ok:false, status:r.status, body });

    sendJson(res, 200, { ok:true, commands: JSON.parse(body) });
  } catch (err) {
    sendJson(res, 500, { ok:false, error:'SERVER_ERROR', message:err.message });
  }
};
