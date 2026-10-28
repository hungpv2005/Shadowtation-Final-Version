export type SavedShadowingRecording = {
  lessonId: string;
  sentenceId: string;
  blob: Blob;
  attemptId?: string;
  savedAt: string;
};

const DATABASE_NAME = 'shadowtation-shadowing-recordings';
const STORE_NAME = 'recordings';
let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available.'));
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('lessonId', 'lessonId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open recording storage.'));
      request.onblocked = () => reject(new Error('Recording storage is busy in another tab.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise!;
}

function recordingId(lessonId: string, sentenceId: string) {
  return `${lessonId}:${sentenceId}`;
}

function transactionFinished(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Recording storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Recording storage transaction was cancelled.'));
  });
}

export async function readShadowingRecording(lessonId: string, sentenceId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const finished = transactionFinished(transaction);
  const request = transaction.objectStore(STORE_NAME).get(recordingId(lessonId, sentenceId));
  try {
    const result = await new Promise<SavedShadowingRecording | null>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as SavedShadowingRecording | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Could not read the saved recording.'));
    });
    await finished;
    return result;
  } catch (error) {
    await finished.catch(() => undefined);
    throw error;
  }
}

export async function saveShadowingRecording(recording: SavedShadowingRecording) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put({ ...recording, id: recordingId(recording.lessonId, recording.sentenceId) });
  await transactionFinished(transaction);
}

export async function clearShadowingRecordings(lessonId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.index('lessonId').openCursor(IDBKeyRange.only(lessonId));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
  await transactionFinished(transaction);
}
