
const { readSession, sendJson } = require('../_utils');
module.exports = async (req, res) => {
  const s = readSession(req);
  if (!s) return sendJson(res, 200, { user:null, canEdit:false });
  sendJson(res, 200, { user:s.user, canEdit:Boolean(s.canEdit), roles:s.roles || [] });
};
