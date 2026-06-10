const { readJson, sendJson, requireServerSecret, statusFor } = require('./_store');

module.exports = async (req, res) => {
  try {
    if (!requireServerSecret(req)) return sendJson(res, 401, { ok:false, error:'BAD_SECRET' });

    let payload = {};
    if (req.method === 'POST') {
      payload = await readJson(req);
    } else {
      const u = new URL(req.url, 'https://eotf.local');
      payload = {
        code: u.searchParams.get('code') || '',
        steamid64: u.searchParams.get('steamid64') || ''
      };
    }

    const result = await statusFor(payload);
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { ok:false, error:'SERVER_ERROR', message: err.message });
  }
};
