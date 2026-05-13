import AsyncStorage from '@react-native-async-storage/async-storage';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

const KEY_STORAGE_KEY = 'e2ee_keypair';

function encodeBase64(uint8: Uint8Array): string {
  return Buffer.from(uint8).toString('base64');
}

function decodeBase64(s: string): Uint8Array {
  const buf = Buffer.from(s, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function decodeUTF8(s: string): Uint8Array {
  // Buffer-based, works on Hermes without TextEncoder
  const buf = Buffer.from(s, 'utf-8');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function encodeUTF8(arr: Uint8Array): string {
  // Buffer-based, works on Hermes without TextDecoder
  return Buffer.from(arr).toString('utf-8');
}

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

// In-memory cache so incoming messages don't hit AsyncStorage on every decrypt
let cachedKeyPair: KeyPair | null = null;

export async function storeKeyPair(keyPair: KeyPair): Promise<void> {
  cachedKeyPair = keyPair;
  await AsyncStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(keyPair));
}

export async function getStoredKeyPair(): Promise<KeyPair | null> {
  if (cachedKeyPair) return cachedKeyPair;
  const stored = await AsyncStorage.getItem(KEY_STORAGE_KEY);
  if (!stored) return null;
  try {
    cachedKeyPair = JSON.parse(stored) as KeyPair;
    return cachedKeyPair;
  } catch {
    return null;
  }
}

export async function clearKeyPair(): Promise<void> {
  cachedKeyPair = null;
  await AsyncStorage.removeItem(KEY_STORAGE_KEY);
}

export function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderSecretKeyB64: string
): { encryptedPayload: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = decodeUTF8(plaintext);
  const recipientPublicKey = decodeBase64(recipientPublicKeyB64);
  const senderSecretKey = decodeBase64(senderSecretKeyB64);

  const encrypted = nacl.box(messageUint8, nonce, recipientPublicKey, senderSecretKey);
  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  return {
    encryptedPayload: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

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

  const decrypted = nacl.box.open(encryptedPayload, nonce, senderPublicKey, recipientSecretKey);
  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return encodeUTF8(decrypted);
}
