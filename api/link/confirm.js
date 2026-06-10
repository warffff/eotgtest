const { readJson, sendJson, discordUserFromSession, confirmCode, errorText } = require('./_store');

module.exports = async (req, res) => {
  try {
    const user = discordUserFromSession(req);
    if (!user) {
      return sendJson(res, 401, {
        ok:false,
        error:'NOT_AUTHORIZED',
        message:'Сначала авторизуйся через Discord на сайте.'
      });
    }

    let code = '';
    if (req.method === 'POST') {
      const payload = await readJson(req);
      code = payload.code;
    } else {
      const u = new URL(req.url, 'https://eotf.local');
      code = u.searchParams.get('code') || '';
    }

    const result = await confirmCode(code, user);
    if (!result.ok) {
      return sendJson(res, 400, { ...result, message:errorText(result.error) });
    }

    sendJson(res, 200, {
      ok:true,
      message:`Аккаунт успешно привязан к Discord: ${result.link.discord_name}`,
      link: result.link
    });
  } catch (err) {
    sendJson(res, 500, { ok:false, error:'SERVER_ERROR', message: err.message });
  }
};
