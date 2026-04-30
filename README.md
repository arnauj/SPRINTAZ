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

## Despliegue

El proyecto se despliega automáticamente a **GitHub Pages** en cada push a `main` mediante el workflow `.github/workflows/deploy.yml`.

URL pública: https://arnauj.github.io/SPRINTAZ/

## Configuración de Firebase

La configuración del cliente está en `firebase-applet-config.json`. Las reglas de seguridad de Firestore están en `firestore.rules` y deben aplicarse manualmente desde la consola de Firebase (Firestore Database → Rules).

Los dominios autorizados para Google Auth deben incluir `localhost` y el dominio de despliegue (`arnauj.github.io`).
