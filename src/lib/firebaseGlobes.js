import { getDb } from './firebase';

// ============================================
// Globe CRUD
// ============================================

/**
 * Fetch all globes, sorted by month descending.
 */
export async function fetchGlobes() {
  if (typeof window === 'undefined') return [];
  const ctx = await getDb();
  if (!ctx) return [];
  const { db, fs } = ctx;

  try {
    const q = fs.query(fs.collection(db, 'globes'), fs.orderBy('monthId', 'desc'));
    const snapshot = await fs.getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('fetchGlobes error:', err);
    return [];
  }
}

/**
 * Get or create a globe for a given monthId.
 * Uses monthId as the document ID for O(1) lookups.
 */
export async function getOrCreateGlobe(monthId) {
  if (typeof window === 'undefined') return null;
  const ctx = await getDb();
  if (!ctx) return null;
  const { db, fs } = ctx;

  try {
    const globeRef = fs.doc(db, 'globes', monthId);
    const snap = await fs.getDoc(globeRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }

    // Create new globe
    const title = formatMonthTitle(monthId);
    const newGlobe = {
      monthId,
      title,
      createdAt: fs.serverTimestamp(),
    };
    await fs.setDoc(globeRef, newGlobe);
    return { id: monthId, ...newGlobe };
  } catch (err) {
    console.error('getOrCreateGlobe error:', err);
    return null;
  }
}

/**
 * Delete a globe and all its news items.
 */
export async function deleteGlobe(monthId) {
  if (typeof window === 'undefined') return;
  const ctx = await getDb();
  if (!ctx) return;
  const { db, fs } = ctx;

  try {
    // Delete all news items in subcollection first
    const itemsSnap = await fs.getDocs(fs.collection(db, 'globes', monthId, 'newsItems'));
    const deletePromises = itemsSnap.docs.map((d) => fs.deleteDoc(d.ref));
    await Promise.all(deletePromises);
    // Delete the globe document
    await fs.deleteDoc(fs.doc(db, 'globes', monthId));
  } catch (err) {
    console.error('deleteGlobe error:', err);
  }
}

// ============================================
// News Items CRUD
// ============================================

/**
 * Fetch all news items for a globe.
 */
export async function fetchNewsItems(monthId) {
  if (typeof window === 'undefined') return [];
  const ctx = await getDb();
  if (!ctx) return [];
  const { db, fs } = ctx;

  try {
    const q = fs.query(
      fs.collection(db, 'globes', monthId, 'newsItems'),
      fs.orderBy('updatedAt', 'asc')
    );
    const snapshot = await fs.getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('fetchNewsItems error:', err);
    return [];
  }
}

/**
 * Upsert a news item (insert or update).
 * Uses countryCode as document ID for uniqueness.
 */
export async function upsertNewsItem(monthId, region, item) {
  if (typeof window === 'undefined') return null;
  const ctx = await getDb();
  if (!ctx) return null;
  const { db, fs } = ctx;

  try {
    const itemRef = fs.doc(db, 'globes', monthId, 'newsItems', item.countryCode);
    const data = {
      region,
      countryCode: item.countryCode,
      countryName: item.countryName,
      newsText: item.newsText || '',
      color: item.color || '#000000',
      affected: item.affected || [],
      dragDx: item.dragDx ?? 0,
      dragDy: item.dragDy ?? 0,
      newsSource: item.newsSource || null,
      eventDate: item.eventDate || null,
      updatedAt: fs.serverTimestamp(),
    };
    await fs.setDoc(itemRef, data, { merge: true });
    return data;
  } catch (err) {
    console.error('upsertNewsItem error:', err);
    return null;
  }
}

/**
 * Delete a news item by monthId + countryCode.
 */
export async function deleteNewsItem(monthId, countryCode) {
  if (typeof window === 'undefined') return;
  const ctx = await getDb();
  if (!ctx) return;
  const { db, fs } = ctx;

  try {
    await fs.deleteDoc(fs.doc(db, 'globes', monthId, 'newsItems', countryCode));
  } catch (err) {
    console.error('deleteNewsItem error:', err);
  }
}

/**
 * Subscribe to real-time changes on news items for a specific globe.
 * Returns a promise resolving to an unsubscribe function.
 */
export async function subscribeToNewsItems(monthId, onAdded, onModified, onRemoved) {
  if (typeof window === 'undefined') return () => {};
  const ctx = await getDb();
  if (!ctx) return () => {};
  const { db, fs } = ctx;

  const q = fs.collection(db, 'globes', monthId, 'newsItems');

  const unsubscribe = fs.onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = { id: change.doc.id, ...change.doc.data() };
      if (change.type === 'added') {
        onAdded(data);
      } else if (change.type === 'modified') {
        onModified(data);
      } else if (change.type === 'removed') {
        onRemoved(data);
      }
    });
  }, (err) => {
    console.error('subscribeToNewsItems error:', err);
  });

  return unsubscribe;
}

// ============================================
// Helpers
// ============================================

function formatMonthTitle(monthId) {
  try {
    const [year, month] = monthId.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthId;
  }
}
