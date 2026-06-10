const crypto = require('crypto');
const { confirmCode, discordUserFromInteraction, errorText } = require('../link/_store');

async function readRawBody(req){
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function publicKeyFromHex(hex){
  const raw = Buffer.from(String(hex || ''), 'hex');
  const prefix = Buffer.from('302a300506032b6570032100', 'hex');
  return crypto.createPublicKey({ key: Buffer.concat([prefix, raw]), format:'der', type:'spki' });
}

function verifyDiscord(req, raw){
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!signature || !timestamp || !publicKey) return false;

  try {
    return crypto.verify(
      null,
      Buffer.from(String(timestamp) + raw),
      publicKeyFromHex(publicKey),
      Buffer.from(String(signature), 'hex')
    );
  } catch (_) {
    return false;
  }
}

function json(res, status, body){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function optionValue(body, name){
  const options = body?.data?.options || [];
  const found = options.find(o => o.name === name);
  return found ? found.value : '';
}

module.exports = async (req, res) => {
  try {
    const raw = await readRawBody(req);
    if (!verifyDiscord(req, raw)) return json(res, 401, { error:'bad signature' });

    const body = JSON.parse(raw || '{}');

    if (body.type === 1) {
      return json(res, 200, { type: 1 });
    }

    if (body.type !== 2 || body?.data?.name !== 'link') {
      return json(res, 200, {
        type: 4,
        data: { flags: 64, content:'Неизвестная команда.' }
      });
    }

    const code = optionValue(body, 'code');
    const user = discordUserFromInteraction(body);
    const result = await confirmCode(code, user);

    if (!result.ok) {
      return json(res, 200, {
        type: 4,
        data: { flags: 64, content: errorText(result.error) }
      });
    }

    return json(res, 200, {
      type: 4,
      data: {
        flags: 64,
        content: `Готово! Discord ${result.link.discord_name} привязан к игровому аккаунту ${result.link.player_name || result.link.steamid64}.`
      }
    });
  } catch (err) {
    return json(res, 200, {
      type: 4,
      data: { flags: 64, content:'Ошибка привязки. Попробуй позже.' }
    });
  }
};
