# The Mastermind

In-person hidden-role party game built with React + Vite and Firestore (no auth). Hosts on Firebase with PWA support for mobile play.

## Commands

- `npm install` – install deps
- `npm run dev` – local dev server
- `npm run build` – type-check + production build
- `npm run lint` – lint sources

## Firebase

- Firestore initialized in `src/firebase.ts` using the provided config.
- Firestore rules: `firestore.rules` (permissive v1, tighten later).
- Hosting config: `firebase.json` (rewrites to SPA).

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to Firebase Hosting on pushes to `main` using `FIREBASE_TOKEN`.
