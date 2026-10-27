import { getStore } from '@netlify/blobs';
import { InternalRoomState } from './types.js';

const STORE_NAME = 'chaos-game-rooms';

// In-memory fallback store with strong consistency & optimistic locking (ETag)
const memoryStore = new Map<string, { data: InternalRoomState; etag: string }>();

function generateEtag(): string {
  return `w/"${Date.now()}-${Math.random().toString(36).slice(2, 9)}"`;
}

function getNetlifyBlobStore() {
  try {
    return getStore({
      name: STORE_NAME,
      consistency: 'strong',
    });
  } catch {
    return null;
  }
}

/**
 * Fetch a room with strong consistency and ETag metadata.
 */
export async function getRoomBlob(code: string): Promise<{ room: InternalRoomState; etag: string } | null> {
  const store = getNetlifyBlobStore();
  if (store) {
    try {
      const res = await store.getWithMetadata(code, { type: 'json' });
      if (res && res.data) {
        return {
          room: res.data as InternalRoomState,
          etag: res.etag || generateEtag(),
        };
      }
      return null;
    } catch {
      // Fallback to in-memory store if Netlify Blobs environment is missing (e.g. local offline test)
    }
  }

  const record = memoryStore.get(code);
  if (!record) return null;
  return {
    room: JSON.parse(JSON.stringify(record.data)),
    etag: record.etag,
  };
}

/**
 * Conditional Write (onlyIfNew: true) - Write room blob ONLY if it does not already exist.
 */
export async function createRoomBlob(
  code: string,
  room: InternalRoomState
): Promise<{ success: boolean; etag: string }> {
  const store = getNetlifyBlobStore();
  if (store) {
    try {
      const res = await store.setJSON(code, room, { onlyIfNew: true });
      if (res && res.modified !== false) {
        return { success: true, etag: res.etag || generateEtag() };
      }
      return { success: false, etag: '' };
    } catch {
      // Fallback to in-memory store
    }
  }

  if (memoryStore.has(code)) {
    return { success: false, etag: '' };
  }
  const etag = generateEtag();
  memoryStore.set(code, {
    data: JSON.parse(JSON.stringify(room)),
    etag,
  });
  return { success: true, etag };
}

/**
 * Conditional Write (onlyIfMatch: etag) - Write room blob ONLY if the ETag matches.
 * Protects against race conditions and concurrent player submissions.
 */
export async function updateRoomBlob(
  code: string,
  room: InternalRoomState,
  expectedEtag: string
): Promise<{ success: boolean; etag: string }> {
  room.updatedAt = Date.now();
  const store = getNetlifyBlobStore();
  if (store) {
    try {
      const res = await store.setJSON(code, room, { onlyIfMatch: expectedEtag });
      if (res && res.modified !== false) {
        return { success: true, etag: res.etag || generateEtag() };
      }
      return { success: false, etag: '' };
    } catch {
      // Fallback to in-memory store
    }
  }

  const existing = memoryStore.get(code);
  if (!existing || existing.etag !== expectedEtag) {
    return { success: false, etag: '' };
  }
  const newEtag = generateEtag();
  memoryStore.set(code, {
    data: JSON.parse(JSON.stringify(room)),
    etag: newEtag,
  });
  return { success: true, etag: newEtag };
}

/**
 * Atomic mutation helper with optimistic locking retry loop.
 */
export async function mutateRoomBlob(
  code: string,
  mutator: (room: InternalRoomState) => Promise<boolean | void> | boolean | void,
  maxRetries = 5
): Promise<{ room: InternalRoomState | null; success: boolean }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const record = await getRoomBlob(code);
    if (!record) return { room: null, success: false };

    const shouldContinue = await mutator(record.room);
    if (shouldContinue === false) {
      return { room: record.room, success: false };
    }

    const { success } = await updateRoomBlob(code, record.room, record.etag);
    if (success) {
      return { room: record.room, success: true };
    }
    // Optimistic lock conflict, brief jitter backoff
    await new Promise(r => setTimeout(r, 20 + Math.random() * 30));
  }
  const finalRecord = await getRoomBlob(code);
  return { room: finalRecord?.room || null, success: false };
}
