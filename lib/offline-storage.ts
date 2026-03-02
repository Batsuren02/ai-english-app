import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'english-app-offline'
const DB_VERSION = 1

let db: IDBPDatabase | null = null

/**
 * Initialize the offline database
 */
export async function initOfflineDB(): Promise<IDBPDatabase> {
  if (db) return db

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for cached words
      if (!db.objectStoreNames.contains('words')) {
        const wordsStore = db.createObjectStore('words', { keyPath: 'id' })
        wordsStore.createIndex('word', 'word', { unique: true })
        wordsStore.createIndex('timestamp', 'timestamp')
      }

      // Store for offline reviews (pending sync)
      if (!db.objectStoreNames.contains('pendingReviews')) {
        const reviewsStore = db.createObjectStore('pendingReviews', { keyPath: 'id' })
        reviewsStore.createIndex('timestamp', 'timestamp')
        reviewsStore.createIndex('synced', 'synced')
      }

      // Store for sync metadata
      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' })
      }
    },
  })

  return db
}

/**
 * Save words to offline storage
 */
export async function saveWordsOffline(words: any[]) {
  const database = await initOfflineDB()
  const tx = database.transaction('words', 'readwrite')
  const store = tx.objectStore('words')

  for (const word of words) {
    await store.put({
      ...word,
      timestamp: Date.now(),
    })
  }

  await tx.done
}

/**
 * Get all cached words
 */
export async function getWordsOffline() {
  const database = await initOfflineDB()
  return database.getAll('words')
}

/**
 * Get a specific word by ID
 */
export async function getWordOffline(id: string) {
  const database = await initOfflineDB()
  return database.get('words', id)
}

/**
 * Clear all offline words
 */
export async function clearWordsOffline() {
  const database = await initOfflineDB()
  await database.clear('words')
}

/**
 * Save a pending review (for offline submissions)
 */
export async function savePendingReview(review: any) {
  const database = await initOfflineDB()
  const reviewWithMeta = {
    ...review,
    id: review.id || `offline-${Date.now()}`,
    synced: false,
    timestamp: Date.now(),
  }

  await database.put('pendingReviews', reviewWithMeta)
  return reviewWithMeta.id
}

/**
 * Get all pending reviews waiting to sync
 */
export async function getPendingReviews() {
  const database = await initOfflineDB()
  const tx = database.transaction('pendingReviews', 'readonly')
  const store = tx.objectStore('pendingReviews')
  const index = store.index('synced')
  return index.getAll(false)
}

/**
 * Mark review as synced
 */
export async function markReviewSynced(reviewId: string) {
  const database = await initOfflineDB()
  const review = await database.get('pendingReviews', reviewId)
  if (review) {
    review.synced = true
    review.syncedAt = Date.now()
    await database.put('pendingReviews', review)
  }
}

/**
 * Clear synced reviews (optional - keep for history)
 */
export async function clearSyncedReviews() {
  const database = await initOfflineDB()
  const tx = database.transaction('pendingReviews', 'readwrite')
  const store = tx.objectStore('pendingReviews')
  const index = store.index('synced')

  const syncedReviews = await index.getAll(true)
  for (const review of syncedReviews) {
    await store.delete(review.id)
  }

  await tx.done
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(key: string) {
  const database = await initOfflineDB()
  return database.get('syncMetadata', key)
}

/**
 * Set sync metadata
 */
export async function setSyncMetadata(key: string, value: any) {
  const database = await initOfflineDB()
  return database.put('syncMetadata', { key, value, timestamp: Date.now() })
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/**
 * Register offline sync listener
 */
export function registerOfflineListener(callback: (online: boolean) => void) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
}

/**
 * Unregister offline sync listener
 */
export function unregisterOfflineListener(callback: (online: boolean) => void) {
  window.removeEventListener('online', () => callback(true))
  window.removeEventListener('offline', () => callback(false))
}
