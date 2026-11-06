const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../utils/logger');
const storage = require('./storageService');
const discord = require('./discordService');

const MODULE = 'YouTubeRSS';
const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: ['yt:videoId', 'published']
  }
});

/**
 * Evalúa si el título del vídeo corresponde a un Tráiler / Gameplay / Revelación
 * y no contiene palabras excluidas (ej. #shorts, podcast, review).
 */
function isRelevantTrailer(title = '') {
  const lower = title.toLowerCase();

  const hasExcluded = config.youtubeFilters.excludeKeywords.some((word) =>
    lower.includes(word.toLowerCase())
  );
  if (hasExcluded) return false;

  const hasIncluded = config.youtubeFilters.includeKeywords.some((word) =>
    lower.includes(word.toLowerCase())
  );
  return hasIncluded;
}

/**
 * Resuelve la URL del feed RSS nativo de YouTube para un canal.
 * Soporta `channelId` directo ("UC..."), `handle` ("@Canal") con resolución automática y caché, o `user`.
 */
async function resolveChannelFeedUrl(channel) {
  if (channel.channelId) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
  }

  if (channel.handle) {
    const cleanHandle = channel.handle.startsWith('@') ? channel.handle : `@${channel.handle}`;
    const cachedId = await storage.getCachedChannelId(cleanHandle);
    if (cachedId) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${cachedId}`;
    }

    try {
      const response = await fetch(`https://www.youtube.com/${cleanHandle}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          Cookie: 'CONSENT=YES+cb.20230531-07-p0.es+FX+999'
        }
      });

      if (response.ok) {
        const html = await response.text();
        const rssMatch =
          html.match(/feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]{22})/) ||
          html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/) ||
          html.match(/<meta itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})"/);

        if (rssMatch && rssMatch[1]) {
          const resolvedId = rssMatch[1];
          await storage.setCachedChannelId(cleanHandle, resolvedId);
          logger.info(MODULE, `ID de canal resuelto y guardado en caché para ${cleanHandle}: ${resolvedId}`);
          return `https://www.youtube.com/feeds/videos.xml?channel_id=${resolvedId}`;
        }
      }
    } catch (err) {
      logger.warn(MODULE, `No se pudo resolver automáticamente el handle ${cleanHandle}, probando alternativa...`);
    }
  }

  if (channel.user) {
    return `https://www.youtube.com/feeds/videos.xml?user=${channel.user}`;
  }

  return null;
}

/**
 * Recorre los canales de YouTube configurados mediante su feed RSS nativo.
 */
async function checkYouTubeTrailers() {
  logger.info(MODULE, `Revisando feeds RSS de ${config.youtubeChannels.length} canales oficiales...`);
  const isFirstRun = await storage.isCategoryEmpty('youtube');
  let totalSent = 0;

  for (const channel of config.youtubeChannels) {
    const feedUrl = await resolveChannelFeedUrl(channel);
    if (!feedUrl) {
      logger.warn(MODULE, `No se pudo determinar la URL RSS para el canal ${channel.name}`);
      continue;
    }

    try {
      const feed = await parser.parseURL(feedUrl);
      const items = (feed.items || []).slice(0, 10); // Evaluar los 10 más recientes por canal
      let channelSentCount = 0;

      for (const item of items) {
        const videoId = item['yt:videoId'] || item.id || item.link;
        if (!videoId) continue;

        // Ignorar Shorts si la URL apunta a /shorts/
        if (item.link && item.link.includes('/shorts/')) continue;

        if (!isRelevantTrailer(item.title)) continue;

        const alreadyNotified = await storage.has('youtube', videoId);
        if (alreadyNotified) continue;

        // Si es primera ejecución con DB vacía, enviamos como máximo 1 vídeo de muestra en total y sembramos el resto
        const shouldSilentSeed =
          isFirstRun &&
          config.startup.seedOnFirstRun &&
          totalSent >= config.startup.firstRunMaxAlerts;

        if (shouldSilentSeed) {
          await storage.markAsNotified('youtube', videoId, item.title);
          logger.info(MODULE, `[Semilla inicial] Registrado sin spamear (${channel.name}): ${item.title}`);
          continue;
        }

        const videoData = {
          id: videoId,
          title: item.title,
          url: item.link || `https://www.youtube.com/watch?v=${videoId}`,
          publishedAt: item.pubDate || item.isoDate || item.published,
          channelName: channel.name,
          channelIcon: channel.icon
        };

        logger.info(MODULE, `Nuevo tráiler en ${channel.name}: "${videoData.title}". Enviando alerta...`);
        const sent = await discord.sendTrailerAlert(videoData);
        if (sent) {
          await storage.markAsNotified('youtube', videoId, videoData.title);
          channelSentCount++;
          totalSent++;
          logger.success(MODULE, `Tráiler notificado (${channel.name}): "${videoData.title}"`);
        }
      }
    } catch (err) {
      logger.error(MODULE, `Error leyendo RSS del canal ${channel.name}`, err);
    }
  }

  if (totalSent === 0) {
    logger.info(MODULE, 'Revisión RSS completada (0 tráilers nuevos).');
  }
}

module.exports = {
  checkYouTubeTrailers
};
