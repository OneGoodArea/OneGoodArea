/**
 * Password hashing and token generation utilities.
 * Uses PBKDF2-SHA256 via Web Crypto API (Edge Runtime compatible).
 *
 * PBKDF2 with 600,000 iterations (OWASP 2023 recommendation).
 * Random 16-byte salt per password. Stored as "salt:hash" in base64.
 *
 * Backward-compatible: verifyPassword detects old SHA-256 hex hashes
 * and validates them, then signals the caller to re-hash with PBKDF2.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/* ── Hash a new password with PBKDF2 ── */

export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await derivePBKDF2(password, salt);

  const saltB64 = bufferToBase64(salt);
  const hashB64 = bufferToBase64(new Uint8Array(key));

  return `${saltB64}:${hashB64}`;
}

/* ── Verify a password against a stored hash ── */

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // New format: "salt:hash" in base64
  if (storedHash.includes(":")) {
    const [saltB64, hashB64] = storedHash.split(":");
    const salt = base64ToBuffer(saltB64);
    const expectedHash = base64ToBuffer(hashB64);

    const derivedKey = await derivePBKDF2(password, salt);
    const derivedArray = new Uint8Array(derivedKey);

    // Constant-time comparison
    if (derivedArray.length !== expectedHash.length) {
      return { valid: false, needsRehash: false };
    }
    let diff = 0;
    for (let i = 0; i < derivedArray.length; i++) {
      diff |= derivedArray[i] ^ expectedHash[i];
    }

    return { valid: diff === 0, needsRehash: false };
  }

  // Legacy format: plain SHA-256 hex (no salt)
  const legacyHash = await legacySHA256(password);
  const valid = legacyHash === storedHash;
  return { valid, needsRehash: valid }; // If valid, signal caller to re-hash
}

/* ── Token generation ── */

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Internal helpers ── */

async function derivePBKDF2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
}

async function legacySHA256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
