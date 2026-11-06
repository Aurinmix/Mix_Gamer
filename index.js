const logger = require('./src/utils/logger');
const storage = require('./src/services/storageService');
const { runAllChecks, startScheduler } = require('./src/jobs/scheduler');

const MODULE = 'Main';

async function bootstrap() {
  logger.info(MODULE, '==================================================');
  logger.info(MODULE, '🚀 Iniciando Bot MixGamer - Alertas de Videojuegos');
  logger.info(MODULE, '==================================================');

  await storage.load();

  const args = process.argv.slice(2);
  const isOnceMode = args.includes('--once');
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const onlyModule = onlyArg ? onlyArg.split('=')[1]?.toLowerCase() : null;

  if (isOnceMode) {
    logger.info(MODULE, `Modo de ejecución única (--once) activado${onlyModule ? ` [Módulo: ${onlyModule}]` : ''}.`);
    await runAllChecks(onlyModule);
    logger.success(MODULE, 'Ejecución única completada. Cerrando proceso.');
    process.exit(0);
  } else {
    await startScheduler();
    logger.success(MODULE, 'Bot en línea y escuchando tareas programadas (24/7).');
  }
}

bootstrap().catch((err) => {
  logger.error(MODULE, 'Error crítico en el arranque del bot', err);
  process.exit(1);
});
