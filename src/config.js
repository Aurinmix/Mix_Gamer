const path = require('path');
require('dotenv').config();

module.exports = {
  webhooks: {
    freeGames: process.env.DISCORD_WEBHOOK_FREE_GAMES || '',
    trailers: process.env.DISCORD_WEBHOOK_TRAILERS || ''
  },

  roles: {
    freeGames: process.env.ROLE_ID_FREE_GAMES || '',
    trailers: process.env.ROLE_ID_TRAILERS || ''
  },

  epic: {
    country: process.env.EPIC_COUNTRY || 'ES',
    locale: process.env.EPIC_LOCALE || 'es-ES'
  },

  gamerpower: {
    includeDlcs: process.env.INCLUDE_FREE_DLCS === 'true',
    allowedPlatforms: ['steam', 'gog', 'itch.io', 'epic-games-store']
  },

  startup: {
    seedOnFirstRun: process.env.SEED_ON_FIRST_RUN !== 'false',
    firstRunMaxAlerts: parseInt(process.env.FIRST_RUN_MAX_ALERTS_PER_SOURCE || '2', 10),
    runOnStartup: process.env.RUN_ON_STARTUP !== 'false'
  },

  schedule: {
    timezone: process.env.TIMEZONE || 'Europe/Madrid',
    epic: process.env.CRON_EPIC || '5 */2 * * *',
    gamerpower: process.env.CRON_GAMERPOWER || '10 */2 * * *',
    youtube: process.env.CRON_YOUTUBE || '*/15 * * * *'
  },

  storage: {
    filePath: path.join(__dirname, '..', 'data', 'history.json'),
    retentionDays: 90
  },

  // Paleta de colores hexadecimal decimal para Discord Embeds
  colors: {
    epic: 0x2F2D2E,       // Gris oscuro / Negro Epic Games
    steam: 0x1B2838,      // Azul oscuro Steam
    gog: 0x86328A,        // Morado GOG
    itchio: 0xFA5C5C,     // Coral itch.io
    youtube: 0xFF0000,    // Rojo YouTube
    default: 0x5865F2     // Blurple Discord
  },

  // Canales oficiales de YouTube para monitorizar por RSS nativo (Internacionales + Español)
  // Soporta tanto `channelId` ("UC...") como `handle` ("@Canal") o `user`
  youtubeChannels: [
    // --- Canales Oficiales Internacionales ---
    { name: 'PlayStation', channelId: 'UC-2Y8dQb0S6DtpxNgAKoJKA', icon: '🟦' },
    { name: 'Xbox', channelId: 'UCjBp_7RuDBUYbd1LegWEJ8g', icon: '🟩' },
    { name: 'Nintendo of America', channelId: 'UCGIY_O-8vW4rfX98KlMkvRg', icon: '🟥' },
    { name: 'IGN', channelId: 'UCKy1dAqELo0zrOtPkf0eTMw', icon: '🎬' },
    { name: 'The Game Awards / Geoff Keighley', channelId: 'UCaWd5_7JhbQBe4dknZhsHJg', icon: '🏆' },

    // --- Canales Oficiales y Medios en Español ---
    { name: 'PlayStation España', handle: '@PlayStationES', user: 'PlayStationES', icon: '🟦🇪🇸' },
    { name: 'Nintendo España', handle: '@NintendoES', user: 'NintendoES', icon: '🟥🇪🇸' },
    { name: 'Xbox España', handle: '@XboxES', icon: '🟩🇪🇸' },
    { name: 'Vandal', channelId: 'UCmb0LnmFYceH7toqgmUTJDA', handle: '@VandalOnline', icon: '🎮🇪🇸' },
    { name: 'Eurogamer_es', channelId: 'UCvmF_tzu-eK6FRfMlOp6-Fg', handle: '@EurogamerSpain', icon: '🕹️🇪🇸' },
    { name: '3DJuegos', handle: '@3djuegos', user: '3djuegos', icon: '🔥🇪🇸' },
    { name: 'IGN España', handle: '@IGNEspana', icon: '🎬🇪🇸' }
  ],

  // Filtro de palabras clave para Tráilers y Revelaciones (Inglés y Español)
  youtubeFilters: {
    includeKeywords: [
      'trailer',
      'tráiler',
      'teaser',
      'gameplay',
      'reveal',
      'revelación',
      'announce',
      'announcement',
      'tráiler de anuncio',
      'tráiler oficial',
      'tráiler de lanzamiento',
      'tráiler de historia',
      'cinematic',
      'cinemática',
      'launch trailer',
      'story trailer',
      'world premiere',
      'first look',
      'primer vistazo'
    ],
    excludeKeywords: [
      '#shorts',
      'podcast',
      'daily fix',
      'review',
      'análisis',
      'analisis',
      'opinión',
      'opinion',
      'debate',
      'charla',
      'directo',
      'resumen',
      'sorteo',
      'guía',
      'guia',
      'trucos',
      'unboxing',
      'tier list',
      'react',
      'reaction',
      'reacción',
      'cosplay',
      'walkthrough part',
      'let\'s play'
    ]
  }
};
