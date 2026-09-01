importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// La configuración llega en la query string del registro del service worker
// (ver requestNotificationPermissionAndToken en src/lib/firebase.ts), para que
// exista una única fuente de verdad y no haya claves duplicadas aquí.
const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || ''
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn('[firebase-messaging-sw.js] Sin configuración de Firebase; notificaciones desactivadas.');
} else {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received: ', payload);

    const notificationTitle = payload.notification.title || 'SPRINTAZ';
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/SPRINTAZ/icon-192.png',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
