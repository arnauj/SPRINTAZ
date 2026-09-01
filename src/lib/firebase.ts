import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseConfig, isFirebaseConfigured, missingFirebaseConfigKeys } from './firebaseConfig';

if (!isFirebaseConfigured) {
  console.error(
    `Configuración de Firebase incompleta. Faltan: ${missingFirebaseConfigKeys.join(', ')}. ` +
      'Revisa firebase-applet-config.json o las variables VITE_FIREBASE_*.'
  );
}

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  measurementId: firebaseConfig.measurementId || undefined,
});

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// getMessaging lanza una excepción en navegadores sin soporte de push. Si eso
// ocurre durante la carga del módulo, la app entera se queda en blanco, así que
// lo aislamos: sin messaging la app sigue funcionando, solo sin notificaciones.
export const messaging = (() => {
  if (typeof window === 'undefined') return null;
  try {
    return getMessaging(app);
  } catch (error) {
    console.warn('Firebase Messaging no disponible en este navegador:', error);
    return null;
  }
})();

export async function requestNotificationPermissionAndToken() {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return null;
    }

    // El service worker no puede importar el config del bundle, así que se lo
    // pasamos por query string para no duplicar (ni desincronizar) las claves.
    const swParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

    // Register service worker if not already
    const reg = await navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL}firebase-messaging-sw.js?${swParams.toString()}`
    );

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

// Connectivity check as required by guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('insufficient permissions'))) {
      // Small check is fine, permissions error is also a 'sign of life'
      console.log("Firebase connection check performed.");
    }
  }
}
testConnection();
