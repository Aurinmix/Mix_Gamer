/**
 * Sistema de logs ligero con marcas de tiempo ISO y niveles claros.
 */
function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  info(moduleName, message) {
    console.log(`[${formatTimestamp()}] [INFO]    [${moduleName}] ${message}`);
  },
  success(moduleName, message) {
    console.log(`[${formatTimestamp()}] [SUCCESS] [${moduleName}] ${message}`);
  },
  warn(moduleName, message) {
    console.warn(`[${formatTimestamp()}] [WARN]    [${moduleName}] ${message}`);
  },
  error(moduleName, message, err = null) {
    const errMsg = err ? ` -> ${err.message || err}` : '';
    console.error(`[${formatTimestamp()}] [ERROR]   [${moduleName}] ${message}${errMsg}`);
  }
};

module.exports = logger;
