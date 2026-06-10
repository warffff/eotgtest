const { getBaseUrl } = require('../_utils');

function safeReturn(value){
  value = String(value || '/');
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

module.exports = async (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    return res.end('DISCORD_CLIENT_ID is not configured');
  }

  const url = new URL(req.url, getBaseUrl(req));
  const returnTo = safeReturn(url.searchParams.get('return') || '/');
  const redirect = process.env.DISCORD_REDIRECT_URI || `${getBaseUrl(req)}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state: returnTo
  });

  res.statusCode = 302;
  res.setHeader('Location', `https://discord.com/oauth2/authorize?${params.toString()}`);
  res.end();
};
