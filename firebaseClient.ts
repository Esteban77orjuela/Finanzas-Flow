import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { validateEnv } from './envCheck';

const envResult = validateEnv();
if (!envResult.ok) {
  console.error(
    '[FinanzaFlow] Faltan variables de entorno:',
    envResult.missing.join(', '),
    '\nCrea un archivo .env.local con:\nVITE_FIREBASE_API_KEY=\nVITE_FIREBASE_AUTH_DOMAIN=\nVITE_FIREBASE_PROJECT_ID=\nVITE_FIREBASE_STORAGE_BUCKET=\nVITE_FIREBASE_MESSAGING_SENDER_ID=\nVITE_FIREBASE_APP_ID='
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
