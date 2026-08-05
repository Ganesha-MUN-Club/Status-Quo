const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyATTvgKuKy3NL_ObptLEPoudQkTATpJPpA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'status-quo-1be9b.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'status-quo-1be9b',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'status-quo-1be9b.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1015166292321',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1015166292321:web:dd266ac1cbd8d9fbfe3520',
};

let dbInstance = null;
let firestoreMod = null;

export async function getDb() {
  if (typeof window === 'undefined') return null;
  if (dbInstance && firestoreMod) return { db: dbInstance, fs: firestoreMod };

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const fs = await import('firebase/firestore');
    
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = fs.getFirestore(app);
    firestoreMod = fs;
    return { db: dbInstance, fs: firestoreMod };
  } catch (err) {
    console.error('Firebase browser init error:', err);
    return null;
  }
}

export const isFirebaseConfigured = () => typeof window !== 'undefined';
