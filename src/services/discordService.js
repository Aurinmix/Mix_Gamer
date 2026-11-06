const config = require('../config');
const logger = require('../utils/logger');

const MODULE = 'Discord';

/**
 * Pausa asíncrona para respetar el rate-limit de Discord Webhooks.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Construye el texto de mención de rol si está configurado.
 */
function buildRoleMention(roleId) {
  if (!roleId || !roleId.trim()) return '';
  const clean = roleId.trim();
  if (clean.toLowerCase() === 'everyone' || clean === '@everyone') return '@everyone';
  if (clean.toLowerCase() === 'here' || clean === '@here') return '@here';
  return `<@&${clean}>`;
}

/**
 * Devuelve el color temático según la tienda/plataforma.
 */
function resolvePlatformColor(platformText = '') {
  const lower = platformText.toLowerCase();
  if (lower.includes('epic')) return config.colors.epic;
  if (lower.includes('steam')) return config.colors.steam;
  if (lower.includes('gog')) return config.colors.gog;
  if (lower.includes('itch')) return config.colors.itchio;
  return config.colors.default;
}

/**
 * Envía un payload JSON a un Webhook de Discord con manejo automático de Rate Limit (429).
 */
async function sendWebhook(webhookUrl, payload) {
  if (!webhookUrl || webhookUrl.includes('TU_ID/TU_TOKEN')) {
    logger.warn(MODULE, 'Webhook no configurado o con valor de ejemplo. Saltando envío a Discord.');
    return false;
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 429) {
        const retryData = await response.json().catch(() => ({}));
        const waitMs = Math.ceil((retryData.retry_after || 2) * 1000) + 500;
        logger.warn(MODULE, `Rate limit alcanzado (429). Esperando ${waitMs}ms antes de reintentar...`);
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Pausa preventiva de 1.5s tras cada envío exitoso
      await sleep(1500);
      return true;
    } catch (err) {
      logger.error(MODULE, `Intento ${attempt}/${maxRetries} fallido al enviar Webhook`, err);
      if (attempt < maxRetries) await sleep(2000);
    }
  }

  return false;
}

/**
 * Envía una alerta de Juego Gratis con un Discord Embed enriquecido.
 * @param {Object} game Datos normalizados del juego gratis.
 */
async function sendFreeGameAlert(game) {
  const mention = buildRoleMention(config.roles.freeGames);
  const color = resolvePlatformColor(game.platform);

  // Formatear fecha límite con timestamp dinámico de Discord (<t:UNIX:R> y <t:UNIX:f>)
  let endDateText = 'Por tiempo limitado';
  if (game.endDate) {
    const unixSeconds = Math.floor(new Date(game.endDate).getTime() / 1000);
    if (!Number.isNaN(unixSeconds) && unixSeconds > 0) {
      endDateText = `<t:${unixSeconds}:f> (<t:${unixSeconds}:R>)`;
    } else {
      endDateText = game.endDate;
    }
  }

  const priceDisplay = game.originalPrice && game.originalPrice !== 'N/A'
    ? `~~${game.originalPrice}~~ → **¡GRATIS! (100% OFF)**`
    : '**¡GRATIS! (100% OFF)**';

  const embed = {
    author: {
      name: `🎁 Juego Gratis Detectado • ${game.platform}`
    },
    title: game.title,
    url: game.url,
    description: game.description
      ? (game.description.length > 300 ? `${game.description.substring(0, 297)}...` : game.description)
      : '¡Reclámalo gratis antes de que termine la promoción!',
    color,
    fields: [
      {
        name: '🏷️ Precio',
        value: priceDisplay,
        inline: true
      },
      {
        name: '🕹️ Plataforma',
        value: `**${game.platform}**`,
        inline: true
      },
      {
        name: '⏳ Disponible hasta',
        value: endDateText,
        inline: false
      },
      {
        name: '🔗 Enlace directo',
        value: `[👉 **Reclamar ahora en ${game.platform}**](${game.url})`,
        inline: false
      }
    ],
    footer: {
      text: `Bot MixGamer • Fuente: ${game.source}`
    },
    timestamp: new Date().toISOString()
  };

  if (game.imageUrl) {
    embed.image = { url: game.imageUrl };
  }

  const payload = {
    username: 'MixGamer • Juegos Gratis',
    content: mention ? `${mention} ¡Nuevo juego gratis disponible en **${game.platform}**!` : undefined,
    embeds: [embed]
  };

  return sendWebhook(config.webhooks.freeGames, payload);
}

/**
 * Envía una alerta de Tráiler / Revelación de YouTube.
 * Nota: Se envía la URL directa en `content` para que Discord renderice el reproductor de vídeo nativo.
 */
async function sendTrailerAlert(video) {
  const mention = buildRoleMention(config.roles.trailers);
  const rolePrefix = mention ? `${mention} ` : '';

  let publishedDiscordTime = '';
  if (video.publishedAt) {
    const unixSeconds = Math.floor(new Date(video.publishedAt).getTime() / 1000);
    if (!Number.isNaN(unixSeconds)) {
      publishedDiscordTime = ` • Publicado <t:${unixSeconds}:R>`;
    }
  }

  const contentLines = [
    `${rolePrefix}${video.channelIcon || '🎬'} **Nuevo Tráiler / Gameplay en ${video.channelName}**${publishedDiscordTime}`,
    `### [${video.title}](${video.url})`
  ];

  const payload = {
    username: 'MixGamer • Tráilers & Noticias',
    content: contentLines.join('\n')
  };

  return sendWebhook(config.webhooks.trailers, payload);
}

module.exports = {
  sendFreeGameAlert,
  sendTrailerAlert
};
