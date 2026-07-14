/**
 * Web Crypto API Service for End-to-End Encryption (E2EE)
 */

// Generate ECDH P-256 Key Pair for Identity
export const generateECDHKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true, // extractable (so we can export public key and backup private key)
    ["deriveKey", "deriveBits"]
  );
};

// Export public key as JWK (JSON Web Key) to send to server
export const exportPublicKey = async (key) => {
  return await window.crypto.subtle.exportKey("jwk", key);
};

// Export private key as JWK for local backup/IndexedDB
export const exportPrivateKey = async (key) => {
  return await window.crypto.subtle.exportKey("jwk", key);
};

// Import public key from server (JWK format)
export const importPublicKey = async (jwk) => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
};

// Import private key from IndexedDB or backup
export const importPrivateKey = async (jwk) => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );
};

// Derive shared AES-GCM secret using our private key and their public key
export const deriveSharedSecret = async (privateKey, publicKey) => {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// Encrypt text using AES-GCM shared secret
export const encryptText = async (sharedKey, text) => {
  const enc = new TextEncoder();
  const encodedText = enc.encode(text);
  
  // Initialization Vector (nonce) must be unique for every encryption
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    encodedText
  );

  // Return base64 encoded IV + Ciphertext (concatenated or object)
  const ivArray = Array.from(iv);
  const cipherArray = Array.from(new Uint8Array(ciphertext));
  
  return {
    iv: btoa(String.fromCharCode.apply(null, ivArray)),
    ciphertext: btoa(String.fromCharCode.apply(null, cipherArray))
  };
};

// Decrypt text using AES-GCM shared secret
export const decryptText = async (sharedKey, ivBase64, cipherBase64) => {
  const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
  const ciphertext = new Uint8Array(atob(cipherBase64).split("").map(c => c.charCodeAt(0)));
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    sharedKey,
    ciphertext
  );
  
  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
};

// Generate a random AES-GCM key for Group Chats or File Encryption
export const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// Export AES key to JWK
export const exportAESKey = async (key) => {
  return await window.crypto.subtle.exportKey("jwk", key);
};

// Import AES key from JWK
export const importAESKey = async (jwk) => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM"
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// Encrypt file ArrayBuffer
export const encryptFile = async (fileKey, arrayBuffer) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    fileKey,
    arrayBuffer
  );

  const ivArray = Array.from(iv);
  return {
    iv: btoa(String.fromCharCode.apply(null, ivArray)),
    ciphertext
  };
};

// Decrypt file ArrayBuffer
export const decryptFile = async (fileKey, ivBase64, cipherBuffer) => {
  const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    fileKey,
    cipherBuffer
  );
  return decryptedBuffer;
};
