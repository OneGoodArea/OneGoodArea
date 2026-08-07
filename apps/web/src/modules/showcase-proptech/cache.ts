const MAX_ENTRIES = 64;

/* AR-758: showcase-exclusive dedupe store. Responses are keyed by the
   SHA-256 digest of their serialized body, so an identical response
   returned for the same postcode shares one object reference instead of
   churning React re-renders. LRU-evicted, bounded, client-only. */
const store = new Map<string, unknown>();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function remember<T>(value: T): Promise<T> {
  const key = await sha256Hex(JSON.stringify(value));
  if (store.has(key)) {
    return store.get(key) as T;
  }
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, value);
  return value;
}
