const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const MODULE = 'Storage';

class StorageService {
  constructor() {
    this.filePath = config.storage.filePath;
    this.data = {
      epic: {},
      gamerpower: {},
      youtube: {},
      youtubeChannelCache: {}
    };
    this.loaded = false;
  }

  /**
   * Carga el historial desde data/history.json o lo inicializa si no existe.
   */
  async load() {
    if (this.loaded) return;

    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      this.data = {
        epic: parsed.epic || {},
        gamerpower: parsed.gamerpower || {},
        youtube: parsed.youtube || {},
        youtubeChannelCache: parsed.youtubeChannelCache || {}
      };
      this.loaded = true;
      await this.pruneOldEntries();
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.info(MODULE, 'Archivo history.json no encontrado. Creando uno nuevo...');
        await this.save();
        this.loaded = true;
      } else {
        logger.error(MODULE, 'Error leyendo history.json, reiniciando estructura en memoria', err);
        this.loaded = true;
      }
    }
  }

  /**
   * Comprueba si una categoría está completamente vacía (útil para detectar la primera ejecución).
   */
  async isCategoryEmpty(category) {
    await this.load();
    return Object.keys(this.data[category] || {}).length === 0;
  }

  /**
   * Verifica si un ID ya fue notificado en una categoría ('epic', 'gamerpower', 'youtube').
   */
  async has(category, id) {
    await this.load();
    return Boolean(this.data[category] && this.data[category][String(id)]);
  }

  /**
   * Registra un ID como notificado con metadatos básicos y guarda en disco.
   */
  async markAsNotified(category, id, title = '') {
    await this.load();
    if (!this.data[category]) {
      this.data[category] = {};
    }

    this.data[category][String(id)] = {
      title,
      notifiedAt: new Date().toISOString()
    };

    await this.save();
  }

  /**
   * Obtiene o guarda en caché el channel_id ("UC...") resuelto a partir de un @handle de YouTube.
   */
  async getCachedChannelId(handle) {
    await this.load();
    return this.data.youtubeChannelCache?.[handle] || null;
  }

  async setCachedChannelId(handle, channelId) {
    await this.load();
    if (!this.data.youtubeChannelCache) {
      this.data.youtubeChannelCache = {};
    }
    this.data.youtubeChannelCache[handle] = channelId;
    await this.save();
  }

  /**
   * Elimina registros antiguos (>90 días por defecto) para que el JSON no crezca indefinidamente.
   */
  async pruneOldEntries() {
    const maxAgeMs = config.storage.retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let removedCount = 0;

    for (const category of ['epic', 'gamerpower', 'youtube']) {
      const entries = this.data[category] || {};
      for (const [id, meta] of Object.entries(entries)) {
        const notifiedTime = meta?.notifiedAt ? new Date(meta.notifiedAt).getTime() : 0;
        if (notifiedTime && now - notifiedTime > maxAgeMs) {
          delete entries[id];
          removedCount++;
        }
      }
    }

    if (removedCount > 0) {
      logger.info(MODULE, `Limpieza automática: ${removedCount} registros antiguos eliminados.`);
      await this.save();
    }
  }

  /**
   * Guardado atómico (escribe en temporal y renombra) para evitar corrupción de JSON.
   */
  async save() {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      await fs.rename(tempPath, this.filePath);
    } catch (err) {
      logger.error(MODULE, 'Error guardando history.json', err);
    }
  }
}

module.exports = new StorageService();
