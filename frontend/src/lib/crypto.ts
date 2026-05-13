import nacl from 'tweetnacl';

// tweetnacl-util helpers inlined to avoid SSR import issues with the CJS module
function encodeBase64(uint8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(uint8).toString('base64');
  }
  let s = '';
  for (let i = 0; i < uint8.length; i++) {
    s += String.fromCharCode(uint8[i]);
  }
  return btoa(s);
}

function decodeBase64(s: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(s, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function decodeUTF8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function encodeUTF8(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

const KEY_STORAGE_KEY = 'e2ee_keypair';

export interface KeyPair {
  publicKey: string; // base64
  secretKey: string; // base64
}

/**
 * Generate a new X25519 key pair for asymmetric encryption.
 * Returns base64-encoded public and secret keys.
 */
export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

/**
 * Store the key pair in localStorage.
 * WARNING: The private key never leaves the client.
 */
export function storeKeyPair(keyPair: KeyPair): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(keyPair));
  }
}

/**
 * Retrieve the stored key pair from localStorage.
 */
export function getStoredKeyPair(): KeyPair | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as KeyPair;
  } catch {
    return null;
  }
}

/**
 * Remove stored key pair (e.g., on logout).
 */
export function clearKeyPair(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEY_STORAGE_KEY);
  }
}

/**
 * Encrypt a plaintext message for a recipient.
 *
 * Flow:
 * 1. Generate a random nonce (24 bytes)
 * 2. Use nacl.box to encrypt with sender's secret key + recipient's public key
 * 3. Return base64-encoded encrypted payload and nonce
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderSecretKeyB64: string
): { encryptedPayload: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = decodeUTF8(plaintext);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
  const senderSecretKey = decodeBase64(senderSecretKeyB64);

  const encrypted = nacl.box(
    messageUint8,
    nonce,
    recipientPublicKey,
    senderSecretKey
  );

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  return {
    encryptedPayload: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt a received message.
 *
 * Flow:
 * 1. Decode the base64 encrypted payload and nonce
 * 2. Use nacl.box.open with recipient's secret key + sender's public key
 * 3. Return plaintext string
 */
export function decryptMessage(
  encryptedPayloadB64: string,
  nonceB64: string,
  senderPublicKeyB64: string,
  recipientSecretKeyB64: string
): string {
  const encryptedPayload = decodeBase64(encryptedPayloadB64);
  const nonce = decodeBase64(nonceB64);
  const senderPublicKey = decodeBase64(senderPublicKeyB64);
  const recipientSecretKey = decodeBase64(recipientSecretKeyB64);

  const decrypted = nacl.box.open(
    encryptedPayload,
    nonce,
    senderPublicKey,
    recipientSecretKey
  );

  if (!decrypted) {
    throw new Error('Decryption failed - message may be tampered or wrong key');
  }

  return encodeUTF8(decrypted);
}
