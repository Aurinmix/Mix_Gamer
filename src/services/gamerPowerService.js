const config = require('../config');
const logger = require('../utils/logger');
const storage = require('./storageService');
const discord = require('./discordService');

const MODULE = 'GamerPower';

/**
 * Comprueba si un sorteo de GamerPower pertenece a las tiendas objetivo (Steam, GOG, itch.io)
 * Nota: Epic Games ya lo gestiona directamente epicService con datos de primera mano.
 */
function matchesTargetStore(platformsStr = '') {
  const lower = platformsStr.toLowerCase();
  // Ignoramos Epic aquí para evitar duplicados con el módulo oficial de Epic Games
  if (lower.includes('epic games') && !lower.includes('steam') && !lower.includes('gog')) {
    return false;
  }
  return lower.includes('steam') || lower.includes('gog') || lower.includes('itch.io');
}

/**
 * Formatea un nombre limpio para la plataforma principal del sorteo.
 */
function cleanPlatformName(platformsStr = '') {
  const lower = platformsStr.toLowerCase();
  if (lower.includes('steam')) return 'Steam';
  if (lower.includes('gog')) return 'GOG';
  if (lower.includes('itch.io')) return 'itch.io';
  return platformsStr.split(',')[0]?.trim() || 'PC';
}

/**
 * Consulta la API pública de GamerPower para detectar juegos al 100% de descuento en Steam, GOG e itch.io.
 */
async function checkGamerPowerGiveaways() {
  logger.info(MODULE, 'Consultando sorteos y juegos 100% gratis en GamerPower...');
  const url = 'https://www.gamerpower.com/api/giveaways';

  try {
    const response = await fetch(url);
    if (response.status === 404 || response.status === 204) {
      logger.info(MODULE, 'No hay promociones activas reportadas por GamerPower.');
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al consultar GamerPower API`);
    }

    const giveaways = await response.json();
    if (!Array.isArray(giveaways)) return;

    // Filtrar por estado activo, tiendas deseadas y tipo (Game vs DLC)
    const filtered = giveaways.filter((item) => {
      if (item.status !== 'Active') return false;
      if (!matchesTargetStore(item.platforms)) return false;

      if (!config.gamerpower.includeDlcs) {
        // Solo juegos completos ("Game") si INCLUDE_FREE_DLCS es false
        const typeLower = (item.type || '').toLowerCase();
        if (typeLower !== 'game' && typeLower !== 'full game') {
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      logger.info(MODULE, 'No se encontraron juegos gratis activos que coincidan con los filtros.');
      return;
    }

    const isFirstRun = await storage.isCategoryEmpty('gamerpower');
    let sentCount = 0;

    for (const item of filtered) {
      const alreadyNotified = await storage.has('gamerpower', item.id);
      if (alreadyNotified) continue;

      const shouldSilentSeed =
        isFirstRun &&
        config.startup.seedOnFirstRun &&
        sentCount >= config.startup.firstRunMaxAlerts;

      if (shouldSilentSeed) {
        await storage.markAsNotified('gamerpower', item.id, item.title);
        logger.info(MODULE, `[Semilla inicial] Registrado sin spamear: ${item.title}`);
        continue;
      }

      const gameData = {
        id: item.id,
        title: item.title,
        description: item.description || item.instructions || '',
        url: item.open_giveaway_url || item.gamerpower_url,
        imageUrl: item.image || item.thumbnail || null,
        originalPrice: item.worth && item.worth !== 'N/A' ? item.worth : 'N/A',
        endDate: item.end_date && item.end_date !== 'N/A' ? item.end_date : null,
        platform: cleanPlatformName(item.platforms),
        source: 'GamerPower API'
      };

      logger.info(MODULE, `Nueva promoción detectada (${gameData.platform}): "${gameData.title}". Enviando alerta...`);
      const sent = await discord.sendFreeGameAlert(gameData);
      if (sent) {
        await storage.markAsNotified('gamerpower', gameData.id, gameData.title);
        sentCount++;
        logger.success(MODULE, `Notificado con éxito: "${gameData.title}"`);
      }
    }

    if (sentCount === 0) {
      logger.info(MODULE, `Revisión completada (${filtered.length} activos, 0 nuevos).`);
    }
  } catch (err) {
    logger.error(MODULE, 'Fallo al consultar GamerPower API', err);
  }
}

module.exports = {
  checkGamerPowerGiveaways
};
