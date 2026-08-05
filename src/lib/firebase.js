import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyATTvgKuKy3NL_ObptLEPoudQkTATpJPpA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'status-quo-1be9b.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'status-quo-1be9b',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'status-quo-1be9b.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1015166292321',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1015166292321:web:dd266ac1cbd8d9fbfe3520',
};

let dbInstance = null;

export function getDb() {
  if (typeof window === 'undefined') return null;
  if (dbInstance) return dbInstance;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Firebase init error:', err);
    return null;
  }
}

export const isFirebaseConfigured = () => typeof window !== 'undefined' && !!getDb();
