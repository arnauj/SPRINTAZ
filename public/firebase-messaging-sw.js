importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBNiXNtFRXar_Qz73zGMA5r9td1fSVDtCg",
  authDomain: "quieroquemelotraigas-980.firebaseapp.com",
  projectId: "quieroquemelotraigas-980",
  storageBucket: "quieroquemelotraigas-980.firebasestorage.app",
  messagingSenderId: "9119488597",
  appId: "1:9119488597:web:dd3927bf82a63d3bd652dc"
});

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
