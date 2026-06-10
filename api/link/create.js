const { readJson, sendJson, requireServerSecret, createPending } = require('./_store');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok:false, error:'METHOD_NOT_ALLOWED' });
    if (!requireServerSecret(req)) return sendJson(res, 401, { ok:false, error:'BAD_SECRET' });

    const payload = await readJson(req);
    const result = await createPending(payload);
    sendJson(res, result.ok ? 200 : 400, result);
  } catch (err) {
    sendJson(res, 500, { ok:false, error:'SERVER_ERROR', message: err.message });
  }
};
