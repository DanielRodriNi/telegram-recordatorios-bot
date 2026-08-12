# telegram-recordatorios-bot

Bot de Telegram sencillo para enviarte recordatorios programados: diarios, cada X días, días concretos de la semana, mensuales o puntuales. Como una alarma, pero desde tu propio bot. Los recordatorios se crean con un flujo guiado de botones (sin sintaxis que recordar).

## 1. Crear el bot en Telegram

1. Habla con [@BotFather](https://t.me/BotFather) en Telegram.
2. Envía `/newbot` y sigue las instrucciones (nombre y username).
3. BotFather te dará un **token** (algo como `123456:ABC-DEF...`). Guárdalo.

## 2. Instalación local

Requisitos: [Node.js](https://nodejs.org) 18 o superior.

```bash
git clone <url-de-este-repo>
cd telegram-recordatorios-bot
npm install
cp .env.example .env
```

Edita `.env` y pon tu token:

```
BOT_TOKEN=tu_token_de_botfather
TZ=Europe/Madrid
```

Arranca el bot:

```bash
npm start
```

Escríbele `/start` a tu bot en Telegram. Te responderá con tu `chat_id` y la lista de comandos.

### Restringir el bot a solo ti (recomendado)

Si tu bot es público (cualquiera con el username puede hablarle), limita quién puede usarlo. Copia el `chat_id` que te dio `/start` y ponlo en `.env`:

```
ALLOWED_CHAT_IDS=123456789
```

Reinicia el bot para que aplique.

## 3. Crear un recordatorio: `/nuevo`

La forma recomendada de crear recordatorios es con `/nuevo`, un flujo guiado con botones, como configurar una alarma:

1. **Frecuencia** — elige tocando un botón:
   - ☀️ **Cada día**
   - 🔁 **Cada X días** — te pide un número de días (ej. cada 3 días desde hoy)
   - 📅 **Días concretos** — botones tipo interruptor para marcar varios días de la semana a la vez (ej. lunes, martes y jueves) y luego "Continuar ▶️"
   - 🗓️ **Mensual** — elige el día del mes (1-28) con botones
   - 📌 **Una vez** — escribe la fecha (`AAAA-MM-DD`)
2. **Hora** — toca una hora y luego los minutos con botones, o escribe directamente `HH:MM` en cualquier momento de este paso.
3. **Mensaje** — escribe el texto del recordatorio.
4. **Confirmación** — revisa el resumen y pulsa "✅ Confirmar" (o "✖️ Cancelar").

En cualquier momento del flujo puedes escribir `/cancelar` para abortar la creación en curso.

## 4. Otros comandos

| Comando | Ejemplo | Descripción |
|---|---|---|
| `/nuevo` | | Inicia el flujo guiado por botones para crear un recordatorio |
| `/recordatorios` | | Lista tus recordatorios activos con su ID |
| `/borrar ID` | `/borrar 3` | Elimina un recordatorio por su ID |
| `/cancelar` | | Cancela la creación de un recordatorio en curso |
| `/ayuda` | | Muestra la ayuda |

### Modo texto (avanzado)

Si prefieres escribir el comando directamente en vez de usar los botones, estos comandos siguen funcionando igual que antes:

| Comando | Ejemplo | Descripción |
|---|---|---|
| `/diario HH:MM mensaje` | `/diario 08:00 Tomar la pastilla` | Recordatorio todos los días a esa hora |
| `/semanal dia HH:MM mensaje` | `/semanal lunes 09:00 Sacar la basura` | Recordatorio cada semana ese día (lunes..domingo) |
| `/mensual DD HH:MM mensaje` | `/mensual 1 10:00 Pagar el alquiler` | Recordatorio cada mes ese día (1-28, para que exista en todos los meses) |
| `/unavez AAAA-MM-DD HH:MM mensaje` | `/unavez 2026-09-01 18:00 Cita médico` | Recordatorio único en una fecha concreta |

`/diario` y `/mensual` en modo texto no permiten elegir varios días a la vez ni "cada X días"; para eso usa `/nuevo`.

Los recordatorios se guardan en `data/reminders.json` y se vuelven a programar automáticamente si reinicias el bot.

## 5. Mantenerlo funcionando 24/7

El bot necesita estar corriendo continuamente para avisarte a tiempo. Opciones:

### Opción A: Docker (recomendado, en tu propio servidor/NAS/Raspberry Pi)

```bash
docker build -t telegram-recordatorios-bot .
docker run -d --name recordatorios \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  telegram-recordatorios-bot
```

### Opción B: Un servicio gratuito tipo Railway / Fly.io / Render

1. Sube este repo a tu cuenta de GitHub.
2. Crea un nuevo proyecto en [Railway](https://railway.app) (u otro similar) apuntando a este repo.
3. Configura las variables de entorno `BOT_TOKEN`, `TZ` y `ALLOWED_CHAT_IDS`.
4. Añade un volumen persistente montado en `/app/data` si quieres conservar los recordatorios entre despliegues (si no, usa Docker en tu propia máquina, que es más simple para uso personal).

### Opción C: pm2 en un VPS/Raspberry Pi propio

```bash
npm install -g pm2
pm2 start src/index.js --name recordatorios
pm2 save
pm2 startup   # sigue las instrucciones para que arranque solo al reiniciar
```

## Notas

- El día del mes en `/mensual` se limita a 1-28 para que el recordatorio exista siempre, en cualquier mes (incluido febrero).
- La zona horaria se configura una vez para todo el bot con la variable `TZ`.
- Los recordatorios de "días concretos" pueden tener varios días de la semana marcados a la vez.
- "Cada X días" no tiene soporte nativo en `node-schedule`, así que el bot programa una comprobación diaria a la hora elegida y compara la fecha contra el día en que se creó el recordatorio para decidir si toca avisar.
