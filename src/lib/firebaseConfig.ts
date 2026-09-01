import fallbackConfig from '../../firebase-applet-config.json';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
  firestoreDatabaseId: string;
}

/**
 * La configuración web de Firebase se puede sobrescribir con variables de
 * entorno `VITE_FIREBASE_*` (fichero `.env.local` o variables del workflow de
 * despliegue). Si no hay variable, se usa el valor de
 * `firebase-applet-config.json`. Así se puede rotar la clave o mover el proyecto
 * sin tocar código.
 */
function pick(envValue: string | undefined, fallbackValue: string | undefined): string {
  const value = (envValue ?? '').trim();
  return value || (fallbackValue ?? '').trim();
}

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: pick(import.meta.env.VITE_FIREBASE_API_KEY, fallbackConfig.apiKey),
  authDomain: pick(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, fallbackConfig.authDomain),
  projectId: pick(import.meta.env.VITE_FIREBASE_PROJECT_ID, fallbackConfig.projectId),
  appId: pick(import.meta.env.VITE_FIREBASE_APP_ID, fallbackConfig.appId),
  storageBucket: pick(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, fallbackConfig.storageBucket),
  messagingSenderId: pick(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    fallbackConfig.messagingSenderId
  ),
  measurementId: pick(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, fallbackConfig.measurementId),
  firestoreDatabaseId:
    pick(
      import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      fallbackConfig.firestoreDatabaseId
    ) || '(default)',
};

const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

export const missingFirebaseConfigKeys = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);

export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0;
