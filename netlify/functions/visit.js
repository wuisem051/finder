

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

  const payload = {
    nick: body.nick || undefined,
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
    hardwareConcurrency: body.hardwareConcurrency || 'unknown'
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      nick: payload.nick,
      ip: payload.ip,
      country: payload.country,
      emoji: payload.emoji
    })
  };
};
