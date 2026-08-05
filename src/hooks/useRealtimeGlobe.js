'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getOrCreateGlobe,
  fetchNewsItems,
  upsertNewsItem,
  deleteNewsItem,
  subscribeToNewsItems,
} from '@/lib/firebaseGlobes';
import { isFirebaseConfigured } from '@/lib/firebase';

/**
 * Custom React hook for real-time globe state synchronization with Firebase Firestore.
 *
 * Provides:
 *  - newsItemsByRegion: grouped news items state
 *  - draggedOffsets: per-country drag offsets
 *  - handleNewsChange(region, items): update news items (with debounced DB sync)
 *  - handleDraggedOffsetsChange(offsets): update drag offsets (with debounced DB sync)
 *  - isLoading: whether initial data is still loading
 *  - isSynced: whether Firebase connection is active
 */
export default function useRealtimeGlobe(monthId) {
  const [globeRecord, setGlobeRecord] = useState(null);
  const [newsItemsByRegion, setNewsItemsByRegion] = useState({});
  const [draggedOffsets, setDraggedOffsets] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Debounce timers keyed by countryCode
  const debounceTimers = useRef({});
  // Track which country codes we are currently writing (to ignore our own echoes)
  const pendingWrites = useRef(new Set());
  // Ref to latest state for use in callbacks
  const newsItemsByRegionRef = useRef(newsItemsByRegion);
  newsItemsByRegionRef.current = newsItemsByRegion;
  // Track whether initial snapshot has been processed
  const initialLoadDone = useRef(false);

  // -- Bootstrap: get-or-create globe, load existing news items --
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      const globe = await getOrCreateGlobe(monthId);
      if (cancelled || !globe) {
        setIsLoading(false);
        return;
      }
      setGlobeRecord(globe);

      const rows = await fetchNewsItems(monthId);
      if (cancelled) return;

      // Group rows by region into newsItemsByRegion and extract drag offsets
      const grouped = {};
      const offsets = {};

      for (const row of rows) {
        if (!grouped[row.region]) grouped[row.region] = [];
        grouped[row.region].push(rowToItem(row));

        if (row.dragDx !== 0 || row.dragDy !== 0) {
          offsets[row.countryCode] = { dx: row.dragDx, dy: row.dragDy };
        }
      }

      setNewsItemsByRegion(grouped);
      setDraggedOffsets(offsets);
      setIsLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [monthId]);

  // -- Realtime subscription --
  useEffect(() => {
    if (!globeRecord) return;

    initialLoadDone.current = false;
    let unsubFn = null;

    subscribeToNewsItems(
      monthId,
      // ADDED
      (row) => {
        // Skip initial snapshot additions (we already loaded them)
        if (!initialLoadDone.current) return;

        if (pendingWrites.current.has(row.countryCode)) {
          pendingWrites.current.delete(row.countryCode);
          return; // Skip our own echo
        }
        setNewsItemsByRegion((prev) => {
          const region = row.region;
          const existing = prev[region] || [];
          if (existing.some((i) => i.countryCode === row.countryCode)) return prev;
          return { ...prev, [region]: [...existing, rowToItem(row)] };
        });
        if (row.dragDx !== 0 || row.dragDy !== 0) {
          setDraggedOffsets((prev) => ({
            ...prev,
            [row.countryCode]: { dx: row.dragDx, dy: row.dragDy },
          }));
        }
      },
      // MODIFIED
      (row) => {
        if (pendingWrites.current.has(row.countryCode)) {
          pendingWrites.current.delete(row.countryCode);
          return; // Skip our own echo
        }
        setNewsItemsByRegion((prev) => {
          const region = row.region;
          const existing = prev[region] || [];
          const idx = existing.findIndex((i) => i.countryCode === row.countryCode);
          if (idx === -1) {
            // Might be in a different region - insert
            return { ...prev, [region]: [...existing, rowToItem(row)] };
          }
          const updated = [...existing];
          updated[idx] = rowToItem(row);
          return { ...prev, [region]: updated };
        });
        setDraggedOffsets((prev) => ({
          ...prev,
          [row.countryCode]: { dx: row.dragDx, dy: row.dragDy },
        }));
      },
      // REMOVED
      (row) => {
        if (pendingWrites.current.has(row.countryCode)) {
          pendingWrites.current.delete(row.countryCode);
          return;
        }
        setNewsItemsByRegion((prev) => {
          const newState = {};
          for (const [region, items] of Object.entries(prev)) {
            const filtered = items.filter((i) => i.countryCode !== row.countryCode);
            if (filtered.length > 0) newState[region] = filtered;
          }
          return newState;
        });
        setDraggedOffsets((prev) => {
          const next = { ...prev };
          delete next[row.countryCode];
          return next;
        });
      }
    ).then((unsub) => {
      if (unsub) {
        unsubFn = unsub;
        setIsSynced(true);
        setTimeout(() => { initialLoadDone.current = true; }, 1000);
      }
    });

    return () => {
      if (unsubFn) {
        unsubFn();
        setIsSynced(false);
      }
    };
  }, [globeRecord, monthId]);

  // -- Debounced write helper --
  const debouncedUpsert = useCallback(
    (region, item) => {
      if (!globeRecord) return;
      const key = item.countryCode;

      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      debounceTimers.current[key] = setTimeout(async () => {
        pendingWrites.current.add(key);
        await upsertNewsItem(monthId, region, item);
        delete debounceTimers.current[key];
      }, 300);
    },
    [globeRecord, monthId]
  );

  // -- Public: handleNewsChange --
  const handleNewsChange = useCallback(
    (region, items) => {
      // Find what changed compared to previous state
      const prevItems = newsItemsByRegionRef.current[region] || [];
      const prevCodes = new Set(prevItems.map((i) => i.countryCode));
      const newCodes = new Set(items.map((i) => i.countryCode));

      // Optimistic local update
      setNewsItemsByRegion((prev) => ({ ...prev, [region]: items }));

      if (!globeRecord) return;

      // Detect deletes
      for (const code of prevCodes) {
        if (!newCodes.has(code)) {
          pendingWrites.current.add(code);
          deleteNewsItem(monthId, code);
          // Clean up drag offset for deleted items
          setDraggedOffsets((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
          });
        }
      }

      // Detect inserts + updates
      for (const item of items) {
        const prev = prevItems.find((p) => p.countryCode === item.countryCode);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
          debouncedUpsert(region, item);
        }
      }
    },
    [globeRecord, monthId, debouncedUpsert]
  );

  // -- Public: handleDraggedOffsetsChange --
  const handleDraggedOffsetsChange = useCallback(
    (newOffsets) => {
      setDraggedOffsets(newOffsets);

      if (!globeRecord) return;

      // Find what changed and debounce-upsert those items
      for (const [code, offset] of Object.entries(newOffsets)) {
        // Find the item across all regions
        for (const [region, items] of Object.entries(newsItemsByRegionRef.current)) {
          const item = items.find((i) => i.countryCode === code);
          if (item) {
            debouncedUpsert(region, {
              ...item,
              dragDx: offset.dx,
              dragDy: offset.dy,
            });
            break;
          }
        }
      }
    },
    [globeRecord, debouncedUpsert]
  );

  // -- Cleanup timers on unmount --
  useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    globeRecord,
    newsItemsByRegion,
    draggedOffsets,
    handleNewsChange,
    handleDraggedOffsetsChange,
    isLoading,
    isSynced,
  };
}

// -- Row to Item conversion --

function rowToItem(row) {
  return {
    countryCode: row.countryCode,
    countryName: row.countryName,
    newsText: row.newsText,
    color: row.color,
    affected: row.affected || [],
    dragDx: row.dragDx || 0,
    dragDy: row.dragDy || 0,
    newsSource: row.newsSource || null,
    eventDate: row.eventDate || null,
  };
}
