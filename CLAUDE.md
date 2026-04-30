# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 3000, bound to `0.0.0.0`.
- `npm run build` — production build with Vite.
- `npm run preview` — preview the build.
- `npm run lint` — runs `eslint .` (Firebase rules plugin only) **and** `tsc --noEmit`. There is no test suite.
- `npm run clean` — removes `dist/`.

There is no separate command for type-checking or for testing a single file — `npm run lint` is the only pre-flight check.

## Stack

React 19 + TypeScript + Vite 6 + Tailwind v4 (via `@tailwindcss/vite`, configured inline in `src/index.css` using `@theme`, no `tailwind.config.js`). UI uses `motion/react` (Framer Motion successor) and `lucide-react` icons. Firebase (Auth + Firestore) is the entire backend — there is no server in this repo, despite `express` being a dependency.

`@google/genai` is in `package.json` and `vite.config.ts` injects `process.env.GEMINI_API_KEY`, but Gemini is not wired up in source yet.

## Path alias gotcha

`tsconfig.json` and `vite.config.ts` set `@/*` → **repo root**, not `src/`. So `@/src/components/X` rather than `@/components/X`. Existing code uses relative imports (`./components/X`) — follow that convention unless you have a reason not to.

## Architecture

Frontend-only React app whose entire backend is a Firebase project (Auth + Firestore). Deployed to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`. The whole data layer lives in `src/services/firebaseService.ts`; UI components must not call `firebase/firestore` directly.

**Data flow:** components subscribe via `firebaseService.subscribe*` (which wraps `onSnapshot`), which means Firestore is the source of truth and the UI is fully reactive. Mutations go through `firebaseService.create*/update*` and are validated server-side by `firestore.rules` — there is no separate API layer to enforce invariants, so any new write must satisfy the rules in that file.

**Entities** (see `src/types.ts` and `firebase-blueprint.json`):
- `User` (collection `users`, doc id = uid) with `role: 'Teacher' | 'Collaborator'`.
- `Sprint` (collection `sprints`).
- `Task` (collection `tasks`, FK `sprintId`) with `status: 'backlog' | 'todo' | 'in_progress' | 'done'`.
- `Notification` (collection `notifications`, FK `userId`) — created client-side from `KanbanBoard.handleStatusChange` whenever a task changes status, addressed to `task.createdBy`.

**Authorization model:** Teachers can create/update/delete sprints and delete tasks; Collaborators can only mutate tasks. Status transitions in `firestore.rules` are enforced per-field — e.g. moving a task to `in_progress` must also set `assignedTo`, moving to `done` must also set `finishedBy`. Match this shape when adding new task mutations or rules will reject the write.

**Owner override:** the email `juanrael@gmail.com` is hardcoded as a Teacher in three places that must stay in sync — `App.tsx` (auto-promotes on sign-in), `SprintSidebar.tsx` (`isTeacher` check), and `firestore.rules` (`isTeacher()` function). Treat this as "the project owner," not a generic admin role.

## Firebase configuration

Config is committed in `firebase-applet-config.json` (apiKey, projectId, and a non-default `firestoreDatabaseId` — `getFirestore(app, firebaseConfig.firestoreDatabaseId)` in `src/lib/firebase.ts`). The web `apiKey` is not a secret in Firebase; access control lives entirely in `firestore.rules`. Auth uses Google Sign-In via popup, and the deployment domain (e.g. `arnauj.github.io`) must be added to Firebase Auth → Authorized domains.

Firestore rules live in `firestore.rules` but are **not** auto-deployed by the workflow — they must be applied manually in the Firebase console when changed.

`src/lib/firebase.ts` runs a `testConnection()` on module import — keep this in mind if you see a stray Firestore read at startup.

## Error handling convention

`firebaseService.handleFirestoreError` packs `{ error, operationType, path, authInfo }` into a JSON string and re-throws it. Callers generally do not catch — errors bubble to the console. When adding new service methods, follow the same `try/catch + handleFirestoreError(e, OperationType.X, path)` shape so debugging info stays consistent.

## UI conventions

Custom Tailwind tokens (`bento-bg`, `bento-card`, `bento-card-hover`, `bento-border`) defined via `@theme` in `src/index.css` — use these instead of raw slate colors for surfaces. UI strings are mostly in Spanish (CIFP Zonzamas vocational-training context); Kanban column labels are in English. Animations are `motion/react`, not `framer-motion`.

## Deployment

`vite.config.ts` sets `base: '/SPRINTAZ/'` for GitHub Pages — if the repo name changes, update this. The deploy workflow uses the official `actions/deploy-pages@v4` flow (not `gh-pages` branch publishing); GitHub Pages source must be set to "GitHub Actions" in repo settings.
