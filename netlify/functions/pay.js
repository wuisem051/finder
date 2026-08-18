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

  let embedTitle = '💳 Nuevo registro de pago';
  let embedColor = 15380232; // Amarillo por defecto
  let statusText = data.estado || 'Pendiente';

  if (data.type === 'status_update') {
    if (statusText === 'Activado') {
      embedTitle = '🟢 PAGO VERIFICADO Y ACTIVADO 🎉';
      embedColor = 2278750; // Verde
    } else if (statusText === 'Rechazado') {
      embedTitle = '🔴 COMPRA RECHAZADA';
      embedColor = 15679300; // Rojo
    } else {
      embedTitle = '🟡 COMPRA EN REVISIÓN (PENDIENTE)';
      embedColor = 15380232; // Amarillo
    }
  }

  const payloadLines = [
    `**Discord:** ${data.discord || 'Sin nombre'}`,
    `**Producto:** ${data.producto || 'Producto Digital'}`,
    `**Estado:** ${statusText.toUpperCase()}`,
    `**Método de Pago:** ${data.metodoPago || 'PayPal'}`,
    `**Detalles / GiftCard:** ${detallesFormatted}`
  ];

  if (data.ip && data.ip !== 'unknown') {
    payloadLines.push(`**IP / País:** ${data.emoji || '🌍'} ${data.country || 'Desconocido'} (${data.ip})`);
  }

  payloadLines.push(`**Hora:** ${new Date().toLocaleString('es-ES')}`);

  const payload = JSON.stringify({
    username: 'Laburo Finder Bot',
    embeds: [{
      title: embedTitle,
      description: payloadLines.join('\n'),
      color: embedColor,
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
    type: body.type || 'new_purchase',
    estado: body.estado || 'Pendiente',
    ip: body.ip || 'unknown',
    country: body.country || 'Desconocido',
    countryCode: body.countryCode || 'XX',
    emoji: body.emoji || '🌍',
    userAgent: body.userAgent || 'unknown',
    platform: body.platform || 'unknown',
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
      message: 'Notificación enviada a Discord correctamente.'
    })
  };
};
