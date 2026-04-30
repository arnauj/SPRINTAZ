# SPRINTAZ Project Context

**S**istema de **P**lanificación **R**ápida e **I**terativa para **N**uevas **T**areas **Á**giles del **Z**onzamas.

This project is a real-time Kanban board for agile sprint management, specifically designed for the CIFP Zonzamas vocational training context.

## Project Overview

- **Architecture:** Serverless React SPA. The entire backend is handled by Firebase (Auth + Firestore).
- **Frontend Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4.
- **Animations:** `motion/react` (the successor to Framer Motion for React 19).
- **Icons:** `lucide-react`.
- **Hosting:** GitHub Pages (via GitHub Actions).

## Building and Running

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite dev server on `http://localhost:3000`. |
| `npm run build` | Generates a production build in the `dist/` directory. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint and TypeScript type-checking (`tsc --noEmit`). |
| `npm run clean` | Deletes the `dist/` directory. |

## Development Conventions

### Architecture & Data Flow
- **Service Layer:** All Firestore interactions MUST go through `src/services/firebaseService.ts`. UI components should never call `firebase/firestore` directly.
- **Reactivity:** The application uses real-time subscriptions (`onSnapshot`). Firestore is the single source of truth; local state management (like Redux/Zustand) is not used.
- **Error Handling:** Use the `firebaseService.handleFirestoreError` helper for consistent error logging and reporting.
- **Types:** All domain models are defined in `src/types.ts`.

### Styling & UI
- **Tailwind v4:** Uses the `@tailwindcss/vite` plugin. Configuration is handled via `@theme` variables in `src/index.css`.
- **Custom Tokens:** Prefer using bento-style tokens (`bento-bg`, `bento-card`, `bento-border`) defined in `src/index.css` over raw slate/gray colors.
- **Language:** The UI is primarily in Spanish, while technical Kanban terms (Backlog, To do, Done) remain in English.

### Path Aliases
- The `@/*` alias is configured in `tsconfig.json` and `vite.config.ts` to point to the **repository root**, not `src/`.
- Example: `import { User } from '@/src/types'`.
- *Note:* Existing code frequently uses relative imports (`./components/X`); follow this pattern unless deep nesting makes it impractical.

### Authorization & Roles
- Roles are `Teacher` and `Collaborator`.
- `Teacher` can manage Sprints and delete any Task.
- `Collaborator` can only manage Tasks within a Sprint.
- **Hardcoded Owner:** The email `juanrael@gmail.com` is treated as the project owner/admin in `App.tsx`, `SprintSidebar.tsx`, and `firestore.rules`.

## Directory Structure

- `src/components/`: UI components (KanbanBoard, Sidebar, Modals, etc.).
- `src/lib/`: Firebase initialization and configuration.
- `src/services/`: Core logic and data access (Firebase Service).
- `src/types.ts`: TypeScript interfaces and enums.
- `firestore.rules`: Security rules for Firestore (must be applied manually in Firebase console).
- `firebase-applet-config.json`: Client-side Firebase configuration.
- `.github/workflows/deploy.yml`: CI/CD pipeline for GitHub Pages.

## Security Note

Firestore security rules are defined in `firestore.rules`. Any change to the data structure or authorization logic must be reflected there, otherwise, Firestore will reject the writes. Rules are **not** automatically deployed; they must be updated in the Firebase Console.
