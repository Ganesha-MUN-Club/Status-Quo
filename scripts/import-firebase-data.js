/**
 * Import exported Supabase data into Firebase Cloud Firestore.
 * Run with: node scripts/import-firebase-data.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyATTvgKuKy3NL_ObptLEPoudQkTATpJPpA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'status-quo-1be9b.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'status-quo-1be9b',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'status-quo-1be9b.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1015166292321',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1015166292321:web:dd266ac1cbd8d9fbfe3520',
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const jsonPath = path.join(__dirname, '..', 'supabase-export.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Export file not found at:', jsonPath);
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const { globes, newsItems } = exportData;

  console.log(`Migrating ${globes.length} globe(s) and ${newsItems.length} news item(s) to Firestore...`);

  // Map globe UUID -> month_id for quick parent doc lookups
  const globeIdToMonthMap = {};

  for (const globe of globes) {
    const monthId = globe.month_id;
    globeIdToMonthMap[globe.id] = monthId;

    const globeRef = doc(db, 'globes', monthId);
    await setDoc(globeRef, {
      monthId,
      title: globe.title || '',
      createdAt: globe.created_at || new Date().toISOString(),
    });
    console.log(`✓ Imported globe doc: globes/${monthId}`);
  }

  for (const item of newsItems) {
    const monthId = globeIdToMonthMap[item.globe_id];
    if (!monthId) {
      console.warn(`Skipping news item ${item.id} (unknown globe_id ${item.globe_id})`);
      continue;
    }

    const countryCode = item.country_code;
    const itemRef = doc(db, 'globes', monthId, 'newsItems', countryCode);

    await setDoc(itemRef, {
      region: item.region,
      countryCode: item.country_code,
      countryName: item.country_name,
      newsText: item.news_text || '',
      color: item.color || '#000000',
      affected: item.affected || [],
      dragDx: item.drag_dx || 0,
      dragDy: item.drag_dy || 0,
      newsSource: item.news_source || null,
      eventDate: item.event_date || null,
      updatedAt: item.updated_at || new Date().toISOString(),
    });
    console.log(`  ✓ Imported news item: globes/${monthId}/newsItems/${countryCode}`);
  }

  console.log('🎉 Data migration to Firebase Firestore completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
