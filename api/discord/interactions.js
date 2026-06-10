const crypto = require('crypto');
const { confirmCode, discordUserFromInteraction, errorText } = require('../link/_store');

function json(res, status, body){
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readRawBody(req){
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');

  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function publicKeyFromHex(hex){
  const raw = Buffer.from(String(hex || '').trim(), 'hex');
  const prefix = Buffer.from('302a300506032b6570032100', 'hex');
  return crypto.createPublicKey({
    key: Buffer.concat([prefix, raw]),
    format: 'der',
    type: 'spki'
  });
}

function verifyDiscordRequest(req, rawBody){
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) return false;

  try {
    return crypto.verify(
      null,
      Buffer.from(String(timestamp) + rawBody, 'utf8'),
      publicKeyFromHex(publicKey),
      Buffer.from(String(signature), 'hex')
    );
  } catch (_) {
    return false;
  }
}

function optionValue(body, name){
  const options = body && body.data && Array.isArray(body.data.options) ? body.data.options : [];
  const found = options.find(o => o.name === name);
  return found ? found.value : '';
}

async function handler(req, res){
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { error: 'method not allowed' });
    }

    const rawBody = await readRawBody(req);

    if (!verifyDiscordRequest(req, rawBody)) {
      return json(res, 401, { error: 'bad request signature' });
    }

    let body;
    try {
      body = JSON.parse(rawBody || '{}');
    } catch (_) {
      return json(res, 400, { error: 'bad json' });
    }

    if (body.type === 1) {
      return json(res, 200, { type: 1 });
    }

    if (body.type !== 2 || !body.data || body.data.name !== 'link') {
      return json(res, 200, {
        type: 4,
        data: {
          flags: 64,
          content: 'Неизвестная команда.'
        }
      });
    }

    const code = optionValue(body, 'code');
    const user = discordUserFromInteraction(body);
    const result = await confirmCode(code, user);

    if (!result.ok) {
      return json(res, 200, {
        type: 4,
        data: {
          flags: 64,
          content: errorText(result.error)
        }
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
      data: {
        flags: 64,
        content: 'Ошибка привязки. Попробуй позже.'
      }
    });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
