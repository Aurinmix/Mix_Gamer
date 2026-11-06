const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const { checkEpicFreeGames } = require('../services/epicService');
const { checkGamerPowerGiveaways } = require('../services/gamerPowerService');
const { checkYouTubeTrailers } = require('../services/youtubeService');

const MODULE = 'Scheduler';

/**
 * Ejecuta una pasada completa (o filtrada por módulo) de todos los monitores.
 * Ideal tanto para el arranque inicial como para ejecuciones puntuales (ej. GitHub Actions con --once).
 */
async function runAllChecks(onlyModule = null) {
  logger.info(MODULE, 'Iniciando ciclo de comprobación...');

  if (!onlyModule || onlyModule === 'epic') {
    await checkEpicFreeGames();
  }

  if (!onlyModule || onlyModule === 'gamerpower') {
    await checkGamerPowerGiveaways();
  }

  if (!onlyModule || onlyModule === 'youtube') {
    await checkYouTubeTrailers();
  }

  logger.info(MODULE, 'Ciclo de comprobación finalizado.');
}

/**
 * Inicia las tareas programadas mediante node-cron para ejecución continua 24/7.
 */
async function startScheduler() {
  const tz = config.schedule.timezone;
  logger.info(MODULE, `Configurando tareas programadas (Zona horaria: ${tz})...`);

  // Tarea 1: Epic Games Store
  cron.schedule(
    config.schedule.epic,
    async () => {
      await checkEpicFreeGames();
    },
    { timezone: tz }
  );
  logger.info(MODULE, `✔ Cron Epic Games registrado: [${config.schedule.epic}]`);

  // Tarea 2: GamerPower (Steam, GOG, itch.io)
  cron.schedule(
    config.schedule.gamerpower,
    async () => {
      await checkGamerPowerGiveaways();
    },
    { timezone: tz }
  );
  logger.info(MODULE, `✔ Cron GamerPower registrado: [${config.schedule.gamerpower}]`);

  // Tarea 3: YouTube RSS (Tráilers y Revelaciones)
  cron.schedule(
    config.schedule.youtube,
    async () => {
      await checkYouTubeTrailers();
    },
    { timezone: tz }
  );
  logger.info(MODULE, `✔ Cron YouTube RSS registrado: [${config.schedule.youtube}]`);

  if (config.startup.runOnStartup) {
    logger.info(MODULE, 'RUN_ON_STARTUP=true -> Ejecutando escaneo inicial inmediato...');
    await runAllChecks();
  }
}

module.exports = {
  runAllChecks,
  startScheduler
};
