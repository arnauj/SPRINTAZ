/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_VAPID_KEY: string;
  readonly VITE_APPS_SCRIPT_EMAIL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __LAST_CODE_UPDATE__: string;
