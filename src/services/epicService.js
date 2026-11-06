const config = require('../config');
const logger = require('../utils/logger');
const storage = require('./storageService');
const discord = require('./discordService');

const MODULE = 'EpicGames';

/**
 * Resuelve la URL de la tienda de Epic Games a partir de los metadatos del juego.
 */
function resolveEpicStoreUrl(item) {
  const slug =
    item.productSlug ||
    item.catalogNs?.mappings?.[0]?.pageSlug ||
    item.offerMappings?.[0]?.pageSlug ||
    item.urlSlug;

  if (slug) {
    const cleanSlug = slug.replace(/\/home$/, '');
    return `https://store.epicgames.com/${config.epic.locale}/p/${cleanSlug}`;
  }

  return `https://store.epicgames.com/${config.epic.locale}/free-games`;
}

/**
 * Extrae la mejor imagen horizontal en alta calidad de un elemento de Epic.
 */
function resolveEpicImage(item) {
  if (!Array.isArray(item.keyImages) || item.keyImages.length === 0) return null;

  const preferredTypes = [
    'OfferImageWide',
    'DieselStoreFrontWide',
    'VaultClosed',
    'Thumbnail'
  ];

  for (const type of preferredTypes) {
    const found = item.keyImages.find((img) => img.type === type && img.url);
    if (found) return found.url;
  }

  return item.keyImages[0]?.url || null;
}

/**
 * Consulta la API oficial de promociones de Epic Games y notifica los juegos 100% gratis activos.
 */
async function checkEpicFreeGames() {
  logger.info(MODULE, 'Consultando promociones activas en Epic Games Store...');
  const url = `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${config.epic.locale}&country=${config.epic.country}&allowCountries=${config.epic.country}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al consultar Epic Games API`);
    }

    const json = await response.json();
    const elements = json?.data?.Catalog?.searchStore?.elements || [];
    const now = new Date();

    const activeFreeGames = [];

    for (const item of elements) {
      const promotionalOffers = item.promotions?.promotionalOffers || [];
      if (promotionalOffers.length === 0) continue;

      // Buscar una oferta activa ahora mismo con 0% de precio (100% descuento)
      let activeOffer = null;
      for (const group of promotionalOffers) {
        for (const offer of group.promotionalOffers || []) {
          const start = new Date(offer.startDate);
          const end = new Date(offer.endDate);
          const isFree = offer.discountSetting?.discountPercentage === 0;

          if (isFree && start <= now && end > now) {
            activeOffer = offer;
            break;
          }
        }
        if (activeOffer) break;
      }

      if (!activeOffer) continue;

      const originalFormatted = item.price?.totalPrice?.fmtPrice?.originalPrice;
      const originalPrice = originalFormatted && originalFormatted !== '0' ? originalFormatted : 'N/A';

      activeFreeGames.push({
        id: item.id,
        title: item.title,
        description: item.description || '',
        url: resolveEpicStoreUrl(item),
        imageUrl: resolveEpicImage(item),
        originalPrice,
        endDate: activeOffer.endDate,
        platform: 'Epic Games Store',
        source: 'Epic Games Official API'
      });
    }

    if (activeFreeGames.length === 0) {
      logger.info(MODULE, 'No se encontraron juegos gratuitos activos en este momento.');
      return;
    }

    const isFirstRun = await storage.isCategoryEmpty('epic');
    let sentCount = 0;

    for (const game of activeFreeGames) {
      const alreadyNotified = await storage.has('epic', game.id);
      if (alreadyNotified) continue;

      const shouldSilentSeed =
        isFirstRun &&
        config.startup.seedOnFirstRun &&
        sentCount >= config.startup.firstRunMaxAlerts;

      if (shouldSilentSeed) {
        await storage.markAsNotified('epic', game.id, game.title);
        logger.info(MODULE, `[Semilla inicial] Registrado sin spamear: ${game.title}`);
        continue;
      }

      logger.info(MODULE, `Nuevo juego gratis detectado: "${game.title}". Enviando alerta...`);
      const sent = await discord.sendFreeGameAlert(game);
      if (sent) {
        await storage.markAsNotified('epic', game.id, game.title);
        sentCount++;
        logger.success(MODULE, `Notificado con éxito: "${game.title}"`);
      }
    }

    if (sentCount === 0) {
      logger.info(MODULE, `Revisión completada (${activeFreeGames.length} activos, 0 nuevos).`);
    }
  } catch (err) {
    logger.error(MODULE, 'Fallo al consultar Epic Games Store', err);
  }
}

module.exports = {
  checkEpicFreeGames
};
