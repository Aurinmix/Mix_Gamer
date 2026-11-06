# 🎮 Bot MixGamer - Centro Automatizado de Alertas para Discord

Solución modular en **Node.js (v20+)** ultraligera (basada en Webhooks puros sin sobrecarga de WebSockets) que monitoriza y publica automáticamente en Discord:
1. **Epic Games Store:** Juegos con 100% de descuento activos (`freeGamesPromotions` API oficial).
2. **Steam, GOG e itch.io:** Juegos 100% gratis por tiempo limitado (`GamerPower API`).
3. **Tráilers y Revelaciones:** Monitor RSS nativo de canales oficiales de YouTube (*PlayStation, Xbox, Nintendo, IGN, The Game Awards*) filtrado por palabras clave y libre de *Shorts*/spam.

---

## 📁 Estructura del Proyecto

```text
Bot_MixGamer/
├── .github/workflows/
│   └── discord-alerts.yml       # Workflow para alojar y ejecutar GRATIS en GitHub Actions
├── data/
│   └── history.json             # Persistencia atómica de IDs notificados (evita duplicados)
├── src/
│   ├── config.js                # Configuración centralizada, canales RSS, colores y filtros
│   ├── jobs/
│   │   └── scheduler.js         # Orquestador de tareas programadas (node-cron y modo --once)
│   ├── services/
│   │   ├── discordService.js    # Constructor de Embeds, menciones y cola anti Rate-Limit
│   │   ├── epicService.js       # Monitor de Epic Games Store
│   │   ├── gamerPowerService.js # Monitor multi-tienda (Steam, GOG, itch.io)
│   │   ├── storageService.js    # Gestión de data/history.json con autolimpieza (>90 días)
│   │   └── youtubeService.js    # Monitor RSS de YouTube con filtro de tráilers
│   └── utils/
│       └── logger.js            # Logs limpios con timestamps ISO
├── .env.example                 # Plantilla de variables de entorno
├── Dockerfile                   # Imagen ligera Node 20 Alpine
├── docker-compose.yml           # Despliegue rápido con volumen persistente
├── index.js                     # Punto de entrada (soporta 24/7 y --once)
└── package.json
```

---

## 🚀 Opción A: Alojar y ejecutar 100% GRATIS en GitHub (GitHub Actions)

Dado que vas a alojar el proyecto en **GitHub**, el repositorio ya incluye [`.github/workflows/discord-alerts.yml`](.github/workflows/discord-alerts.yml). Esto te permite ejecutar el bot **sin pagar ningún servidor ni VPS**: GitHub despertará el bot automáticamente, enviará las alertas nuevas a tu Discord y guardará el historial actualizado en [`data/history.json`](data/history.json).

### Pasos para activarlo en GitHub:
1. Sube este proyecto a un repositorio de GitHub (recomendado **Público** para tener minutos ilimitados gratuitos de GitHub Actions, o Privado dentro de la cuota gratuita de 2.000 min/mes).
2. En tu servidor de Discord, crea dos Webhooks:
   - Uno en tu canal `#juegos-gratis` (*Editar canal → Integraciones → Webhooks → Nuevo Webhook → Copiar URL*).
   - Otro en tu canal `#trailers-noticias`.
3. En tu repositorio de GitHub, ve a **Settings → Secrets and variables → Actions → New repository secret** y añade:
   - `DISCORD_WEBHOOK_FREE_GAMES`: Pega la URL del Webhook de juegos gratis.
   - `DISCORD_WEBHOOK_TRAILERS`: Pega la URL del Webhook de tráilers.
   - *(Opcional)* `ROLE_ID_FREE_GAMES`: ID numérico del rol a mencionar.
   - *(Opcional)* `ROLE_ID_TRAILERS`: ID numérico del rol a mencionar.
4. Ve a la pestaña **Actions** de tu repositorio, selecciona **🎮 MixGamer Discord Alerts** y pulsa **Run workflow** para hacer tu primera prueba inmediata.

---

## 💻 Opción B: Ejecutar en Local

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea tu archivo `.env` a partir de la plantilla:
   ```bash
   cp .env.example .env
   ```
   *(Edita `.env` y pega las URLs de tus Webhooks de Discord).*
3. Comandos disponibles:
   - **Modo continuo 24/7 (con `node-cron`):**
     ```bash
     npm start
     ```
   - **Modo pasada única (ejecuta todos los módulos una vez y termina):**
     ```bash
     npm run once
     ```
   - **Probar un módulo individual:**
     ```bash
     npm run test:epic
     npm run test:free
     npm run test:youtube
     ```

---

## 🐳 Opción C: Ejecutar con Docker (VPS / Servidor Propio / NAS)

1. Configura tu archivo `.env`.
2. Levanta el contenedor en segundo plano:
   ```bash
   docker compose up -d --build
   ```
3. Consulta los logs en tiempo real:
   ```bash
   docker compose logs -f
   ```
