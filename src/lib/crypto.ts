/**
 * Client-side AES-256-GCM encryption using the Web Crypto API.
 * Key is derived from the master password via PBKDF2.
 * Each entry gets its own salt + IV for maximum security.
 */

const PBKDF2_ITERATIONS = 200_000
const KEY_LENGTH = 256

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export interface EncryptedPayload {
  ciphertext: string // base64
  salt: string       // base64
  iv: string         // base64
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedPayload> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(password, salt.buffer)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )

  return {
    ciphertext: bufferToBase64(encrypted),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
  }
}

export async function decrypt(
  ciphertext: string,
  password: string,
  salt: string,
  iv: string
): Promise<string> {
  const key = await deriveKey(password, base64ToBuffer(salt))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(iv)) },
    key,
    base64ToBuffer(ciphertext)
  )
  return new TextDecoder().decode(decrypted)
}
