# SPRINTAZ

**S**istema de **P**lanificación **R**ápida e **I**terativa para **N**uevas **T**areas **Á**giles del **Z**onzamas.

Tablero Kanban en tiempo real para la gestión de sprints y tareas en CIFP Zonzamas.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Firebase (Auth + Firestore) — sin backend propio
- `motion/react` para animaciones

## Funcionalidades

- Login con Google
- Roles: **Teacher** (gestiona sprints, puede borrar tareas) y **Collaborator**
- Sprints con tablero Kanban: Backlog → To do → In progress → Done
- Drag & drop entre columnas
- Notificaciones en tiempo real cuando una tarea cambia de estado
- Diseño responsive (drawer en móvil, scroll horizontal del tablero)
- Instalable como PWA en Android e iOS con icono propio

## Ejecución local

**Requisitos:** Node.js 20+

```bash
npm install
npm run dev
```

La app arranca en `http://localhost:3000`.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Servir el build localmente |
| `npm run lint` | ESLint + `tsc --noEmit` |
| `node scripts/generate-icons.mjs` | Regenera los PNG de `public/` a partir del diseño base |

## Despliegue

El proyecto se despliega automáticamente a **GitHub Pages** en cada push a `main` mediante el workflow `.github/workflows/deploy.yml`.

URL pública: https://arnauj.github.io/SPRINTAZ/

## Configuración de Firebase

La configuración del cliente está en `firebase-applet-config.json`. Las reglas de seguridad de Firestore están en `firestore.rules` y deben aplicarse manualmente desde la consola de Firebase (Firestore Database → Rules).

Los dominios autorizados para Google Auth deben incluir `localhost` y el dominio de despliegue (`arnauj.github.io`).

## Iconos e instalación en móvil (PWA)

La app es instalable como aplicación independiente en Android e iOS. Cuando el usuario añade la web a la pantalla de inicio aparece el icono propio de SPRINTAZ (la "S" sobre fondo azul).

Archivos relevantes en `public/`:

| Archivo | Uso |
|---|---|
| `manifest.webmanifest` | Metadatos PWA (nombre, colores, icons) — referenciado desde `index.html` |
| `icon.svg` | Favicon vectorial y fuente del diseño |
| `icon-192.png` | Icono Android (manifest, 192×192) |
| `icon-512.png` | Icono Android (manifest, 512×512) — usado también en la splash screen |
| `icon-512-maskable.png` | Icono adaptable de Android (zona segura del 80%) |
| `apple-touch-icon.png` | Icono de iOS (180×180) usado al "Añadir a pantalla de inicio" en Safari |

`index.html` declara los `<link rel="icon">`, `<link rel="apple-touch-icon">`, `<link rel="manifest">` y los meta `theme-color` / `apple-mobile-web-app-*` necesarios para que cada plataforma escoja el icono correcto.

### Cómo instalarla

- **Android (Chrome / Edge):** abrir la URL → menú ⋮ → "Instalar aplicación" / "Añadir a pantalla de inicio".
- **iOS (Safari):** abrir la URL → botón compartir → "Añadir a pantalla de inicio". El icono debe ser PNG (no SVG); por eso se sirve `apple-touch-icon.png`.

### Regenerar los iconos

Si cambia el diseño base (`public/icon.svg`) o quieres modificar colores/letra:

```bash
node scripts/generate-icons.mjs
```

El script no tiene dependencias externas: codifica los PNG a partir del diseño hardcodeado en `scripts/generate-icons.mjs` (fondo `slate-900`, tile `sky-500`, letra "S" blanca). Edita las constantes `COLORS` y `S_PATTERN` del script para personalizarlo.

## Notificaciones push con Firebase (FCM)

Las notificaciones de Firestore que se ven dentro de la app (campana) **no son** push del sistema operativo: son cambios en la colección `notifications` recibidos vía `onSnapshot` mientras la pestaña está abierta. Para que el móvil reciba notificaciones reales con la app cerrada hay que activar **Firebase Cloud Messaging (FCM)**.

A día de hoy el repo todavía no integra FCM. Esto es lo que hay que activar y añadir, paso a paso:

### 1. En la consola de Firebase

1. Abrir el proyecto `quieroquemelotraigas-980` en https://console.firebase.google.com.
2. **Project settings → Cloud Messaging:** asegurarse de que la API "Firebase Cloud Messaging API (V1)" está habilitada (botón "Manage API in Google Cloud Console" si aparece deshabilitada).
3. **Project settings → Cloud Messaging → Web configuration → Web Push certificates:** pulsar "Generate key pair". Esto produce la **VAPID key** pública que el navegador necesita para suscribirse. Cópiala.
4. **(Solo iOS)** Si en el futuro se publica una versión nativa, hay que subir aquí también el archivo `.p8` de APNs. Para PWA instalada en iOS 16.4+ no hace falta APNs explícito: el navegador usa el Web Push estándar.
5. **Authentication → Settings → Authorized domains:** comprobar que están `localhost` y `arnauj.github.io`.

### 2. Habilitar Web Push en iOS

iOS solo entrega Web Push si:

- Se usa **Safari 16.4 o superior** (iOS 16.4+ / iPadOS 16.4+).
- La PWA está **instalada** en la pantalla de inicio (no funciona en una pestaña normal).
- El sitio se sirve por **HTTPS** (GitHub Pages cumple).
- El usuario acepta el permiso de notificaciones la primera vez que se solicita desde la PWA instalada.

En Android (Chrome / Edge / Samsung Internet) basta con que sea HTTPS y el usuario acepte el permiso; no hace falta instalar la PWA.

### 3. En el repo (cambios pendientes de integrar)

Estos pasos los hará un próximo PR; aquí queda documentado lo que tendrá que añadir:

1. **Service Worker** en `public/firebase-messaging-sw.js`. Es un archivo servido en la raíz del scope (`/SPRINTAZ/firebase-messaging-sw.js`) que importa `firebase-app-compat.js` y `firebase-messaging-compat.js` desde el CDN, llama a `firebase.initializeApp(firebaseConfig)` y a `firebase.messaging()`. Sirve para recibir mensajes con la app cerrada.
2. **Variable de entorno `VITE_FIREBASE_VAPID_KEY`** con la VAPID key del paso 1.3 (en local en `.env`, en producción como secret de GitHub Actions inyectado por el workflow).
3. **Helper en `src/lib/firebase.ts`**:
   ```ts
   import { getMessaging, getToken, onMessage } from 'firebase/messaging';
   export const messaging = getMessaging(app);
   export async function requestNotificationPermissionAndToken() {
     const permission = await Notification.requestPermission();
     if (permission !== 'granted') return null;
     const reg = await navigator.serviceWorker.register(
       `${import.meta.env.BASE_URL}firebase-messaging-sw.js`,
     );
     return getToken(messaging, {
       vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
       serviceWorkerRegistration: reg,
     });
   }
   ```
4. **Persistir el token FCM** en el documento del usuario (`users/{uid}.fcmTokens: string[]`) y actualizar `firestore.rules` para permitir que cada usuario solo edite su propio array de tokens.
5. **Pedir permiso** al usuario en un evento explícito (botón "Activar notificaciones" en el perfil), nunca al cargar la app — los navegadores penalizan los prompts automáticos.
6. **Envío de los push:** un endpoint del lado servidor (Cloud Function o similar — este repo no tiene backend) que escuche cambios en `notifications` y llame a la API HTTP v1 de FCM con el token del destinatario. La SDK web **no puede enviar** push, solo recibirlos.

### Resumen de lo que tienes que activar tú manualmente

- [ ] En Firebase Console → Cloud Messaging: habilitar la API V1.
- [ ] En Firebase Console → Cloud Messaging → Web Push certificates: generar la VAPID key.
- [ ] Añadir esa key al entorno como `VITE_FIREBASE_VAPID_KEY` (`.env` local + secret en GitHub Actions).
- [ ] Confirmar que `arnauj.github.io` está en Authentication → Authorized domains.
- [ ] Para probar en iPhone: actualizar a iOS 16.4+, abrir la URL en Safari e **instalar** la PWA antes de aceptar el permiso de notificaciones.

Una vez activado lo de arriba, el siguiente PR puede integrar el SDK de `firebase/messaging` y el service worker sin más configuración por tu parte.
