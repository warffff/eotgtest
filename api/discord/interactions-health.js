const { sendJson } = require('../_utils');

module.exports = async (req, res) => {
  sendJson(res, 200, {
    ok: true,
    has_public_key: Boolean(process.env.DISCORD_PUBLIC_KEY),
    has_bot_token: Boolean(process.env.DISCORD_BOT_TOKEN),
    has_client_id: Boolean(process.env.DISCORD_CLIENT_ID),
    has_guild_id: Boolean(process.env.DISCORD_GUILD_ID),
    has_link_secret: Boolean(process.env.GMOD_LINK_SECRET || process.env.LINK_API_SECRET)
  });
};
