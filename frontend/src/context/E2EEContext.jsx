import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { generateECDHKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey, importPublicKey, deriveSharedSecret, encryptText, decryptText, importAESKey } from '../utils/cryptoService';
import { storePrivateKey, getPrivateKey } from '../utils/keyStore';
import api from '../services/api';
import { useSocket } from './SocketContext';

const E2EEContext = createContext();

export const useE2EE = () => useContext(E2EEContext);

export const E2EEProvider = ({ children }) => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [isReady, setIsReady] = useState(false);
  const [privateKey, setPrivateKey] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    const handleGroupKeyUpdated = ({ conversationId }) => {
      console.log(`[E2EE] Group key updated for ${conversationId}, clearing cache.`);
      groupKeyCache.current.delete(conversationId);
    };

    socket.on('group_key_updated', handleGroupKeyUpdated);
    
    return () => {
      socket.off('group_key_updated', handleGroupKeyUpdated);
    };
  }, [socket]);

  useEffect(() => {
    const initializeKeys = async () => {
      if (!isAuthenticated || !user) {
        setIsReady(false);
        setPrivateKey(null);
        return;
      }

      try {
        // 1. Check if we already have a private key for this user
        let storedJwk = await getPrivateKey(user._id || user.id);
        let keyPair = null;

        if (!storedJwk) {
          // If not in IndexedDB, check if the server has our master key (from another browser)
          try {
            const res = await api.get('/keys/me');
            if (res.data.data && res.data.data.length > 0 && res.data.data[0].privateKey) {
              storedJwk = res.data.data[0].privateKey;
              await storePrivateKey(user._id || user.id, storedJwk);
              console.log('[E2EE] Downloaded and cached private key from server');
            }
          } catch (err) {
            console.log('[E2EE] No keys found on server or error fetching:', err);
          }
        }

        if (storedJwk) {
          // We have it, load it
          const importedPrivKey = await importPrivateKey(storedJwk);
          setPrivateKey(importedPrivKey);
          console.log('[E2EE] Loaded existing private key from IndexedDB/Server');
        } else {
          // 2. Generate new key pair
          console.log('[E2EE] Generating new master ECDH key pair for user...');
          keyPair = await generateECDHKeyPair();
          
          // Export keys
          const pubJwk = await exportPublicKey(keyPair.publicKey);
          const privJwk = await exportPrivateKey(keyPair.privateKey);

          // Store private key locally
          await storePrivateKey(user._id || user.id, privJwk);
          setPrivateKey(keyPair.privateKey);

          // 3. Upload BOTH public and private keys to server
          const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
          localStorage.setItem('deviceId', deviceId); // Ensure consistent device ID
          
          await api.post('/keys/upload', {
            deviceId,
            publicKey: pubJwk,
            privateKey: privJwk
          });
          console.log('[E2EE] Keys uploaded successfully to server');
        }
        setIsReady(true);
      } catch (error) {
        console.error('[E2EE] Failed to initialize keys:', error);
      }
    };

    initializeKeys();
  }, [isAuthenticated, user]);

  const publicKeyCache = React.useRef(new Map());
  const sharedSecretCache = React.useRef(new Map());

  const getPartnerPublicKey = async (partnerId) => {
    if (publicKeyCache.current.has(partnerId)) {
      return publicKeyCache.current.get(partnerId);
    }
    
    // Fetch from server
    try {
      const res = await api.get(`/keys/${partnerId}`);
      if (res.data.data && res.data.data.length > 0) {
        let jwk;
        let selectedKey = null;
        const currentUserId = user?._id || user?.id;
        
        if (partnerId === currentUserId) {
          const myDeviceId = localStorage.getItem('deviceId');
          selectedKey = res.data.data.find(k => k.deviceId === myDeviceId && !k.isDeprecated) || 
                        res.data.data.find(k => k.deviceId === myDeviceId) || 
                        res.data.data[0];
        } else {
          // 1. Prioritize non-deprecated keys
          const activeKeys = res.data.data.filter(k => !k.isDeprecated);
          // 2. If no non-deprecated keys exist, fallback to all keys (historical compatibility)
          const searchSet = activeKeys.length > 0 ? activeKeys : res.data.data;
          // 3. Find the Canonical Master Key (the one synced with privateKey), else fallback to most recent
          selectedKey = searchSet.find(k => k.hasPrivateKey) || searchSet[0];
        }
        
        console.log(`[E2EE] Selected public key ID ${selectedKey._id} for encryption/decryption with partner ${partnerId}`);
        jwk = selectedKey.publicKey;
        
        const cryptoKey = await importPublicKey(jwk);
        publicKeyCache.current.set(partnerId, cryptoKey);
        return cryptoKey;
      }
    } catch (err) {
      console.error('[E2EE] Failed to fetch public key for', partnerId, err);
    }
    return null;
  };

  const getSharedSecret = async (partnerId) => {
    if (sharedSecretCache.current.has(partnerId)) {
      return sharedSecretCache.current.get(partnerId);
    }

    const partnerPubKey = await getPartnerPublicKey(partnerId);
    if (!partnerPubKey || !privateKey) return null;

    const secret = await deriveSharedSecret(privateKey, partnerPubKey);
    sharedSecretCache.current.set(partnerId, secret);
    return secret;
  };

  const getAllSharedSecrets = async (partnerId) => {
    if (!privateKey) return [];
    try {
      const res = await api.get(`/keys/${partnerId}`);
      if (res.data.data && res.data.data.length > 0) {
        const secrets = [];
        for (const keyDoc of res.data.data) {
          try {
            const cryptoKey = await importPublicKey(keyDoc.publicKey);
            const secret = await deriveSharedSecret(privateKey, cryptoKey);
            secrets.push(secret);
          } catch (e) {
            console.error('[E2EE] Failed to derive secret for a key', e);
          }
        }
        console.log(`[E2EE] Derived ${secrets.length} secrets for partner ${partnerId}`);
        return secrets;
      }
    } catch (err) {
      console.error('[E2EE] Failed to get all shared secrets for', partnerId, err);
    }
    return [];
  };

  const encryptDirectMessage = async (plaintext, partnerId) => {
    if (!isReady) throw new Error('E2EE not ready');
    const sharedSecret = await getSharedSecret(partnerId);
    if (!sharedSecret) throw new Error('Could not derive shared secret');

    const { iv, ciphertext } = await encryptText(sharedSecret, plaintext);
    return {
      ciphertext,
      iv
    };
  };

  const decryptDirectMessage = async (ciphertext, iv, partnerId) => {
    if (!isReady) throw new Error('E2EE not ready');
    
    // Fast path: try the most likely shared secret
    let secret = await getSharedSecret(partnerId);
    if (secret) {
      try {
        return await decryptText(secret, iv, ciphertext);
      } catch (e) {
        // Fallback: try all historical keys if the newest one fails
        const allSecrets = await getAllSharedSecrets(partnerId);
        for (const s of allSecrets) {
          try {
            return await decryptText(s, iv, ciphertext);
          } catch (e2) {
            // ignore
          }
        }
      }
    }
    throw new Error('Failed to decrypt direct message with any available keys');
  };

  // Group Keys Cache (Map of conversationId -> { [version]: { key: CryptoKey, raw: Object } })
  const groupKeyCache = React.useRef(new Map());

  const getGroupKey = async (conversationId, version = null) => {
    let convCache = groupKeyCache.current.get(conversationId);

    // If cache miss for the conversation, fetch ALL keys from server
    if (!convCache) {
      try {
        const res = await api.get(`/keys/group/${conversationId}`);
        if (res.data.success && res.data.data && res.data.data.length > 0) {
          convCache = { keys: new Map(), latestVersion: 0 };
          
          for (const keyData of res.data.data) {
            const v = keyData.version || 1;
            convCache.keys.set(v, { raw: keyData, cryptoKey: null });
            if (v > convCache.latestVersion) {
              convCache.latestVersion = v;
            }
          }
          groupKeyCache.current.set(conversationId, convCache);
        }
      } catch (err) {
        console.error('[E2EE] Failed to fetch group keys for', conversationId, err);
        return null;
      }
    }

    if (!convCache) return null;

    const targetVersion = version || convCache.latestVersion;
    const keyEntry = convCache.keys.get(targetVersion);

    if (!keyEntry) {
      console.error(`[E2EE] Group key version ${targetVersion} not found for ${conversationId}`);
      return null;
    }

    // If already decrypted and imported, return it
    if (keyEntry.cryptoKey) {
      return { key: keyEntry.cryptoKey, version: targetVersion };
    }

    // Otherwise, decrypt it now
    try {
      const { encryptedKey, creatorId, encryptedBy } = keyEntry.raw;
      const encryptorId = encryptedBy || creatorId;
      
      const sharedSecrets = await getAllSharedSecrets(encryptorId);
      if (!sharedSecrets || sharedSecrets.length === 0) throw new Error(`Could not derive any secret with encryptor ${encryptorId}`);

      let jwkString = null;
      for (const secret of sharedSecrets) {
        try {
          jwkString = await decryptText(secret, encryptedKey.iv, encryptedKey.ciphertext);
          break; // Success!
        } catch (e) {
          // Normal, try next
        }
      }
      
      if (!jwkString) {
        throw new Error("Failed to decrypt group key with any of the encryptor's public keys");
      }

      const jwk = JSON.parse(jwkString);
      const cryptoKey = await importAESKey(jwk);
      
      keyEntry.cryptoKey = cryptoKey;
      return { key: cryptoKey, version: targetVersion };
    } catch (err) {
      console.error('[E2EE] Failed to decrypt group key version', targetVersion, err);
      return null;
    }
  };

  const refreshGroupKey = async (conversationId) => {
    groupKeyCache.current.delete(conversationId);
    return await getGroupKey(conversationId);
  };

  const encryptGroupMessage = async (plaintext, conversationId) => {
    if (!isReady) throw new Error('E2EE not ready');
    const groupKeyData = await getGroupKey(conversationId);
    if (!groupKeyData) throw new Error('No group key available');

    const { iv, ciphertext } = await encryptText(groupKeyData.key, plaintext);
    return { ciphertext, iv, keyVersion: groupKeyData.version };
  };

  const decryptGroupMessage = async (ciphertext, iv, conversationId, keyVersion = null) => {
    if (!isReady) throw new Error('E2EE not ready');
    const groupKeyData = await getGroupKey(conversationId, keyVersion);
    if (!groupKeyData) throw new Error('No group key available');

    try {
      return await decryptText(groupKeyData.key, iv, ciphertext);
    } catch (err) {
      console.error('[E2EE] Failed to decrypt group message content:', err, 'ciphertext:', ciphertext.substring(0, 20) + '...', 'iv:', iv);
      
      // The group key might have been re-encrypted (recovery key generated).
      // Invalidate the cache and attempt to fetch the latest key from the server.
      groupKeyCache.current.delete(conversationId);
      
      try {
        console.log('[E2EE] Cache invalidated. Attempting to fetch new group key and retry decryption...');
        const newGroupKey = await getGroupKey(conversationId);
        if (newGroupKey) {
          return await decryptText(newGroupKey, iv, ciphertext);
        }
      } catch (retryErr) {
        console.error('[E2EE] Retry decryption failed after cache invalidation', retryErr);
      }

      throw err; // If retry also fails, throw original error
    }
  };

  return (
    <E2EEContext.Provider value={{ 
      isReady, 
      privateKey,
      getSharedSecret,
      getGroupKey,
      encryptDirectMessage,
      decryptDirectMessage,
      encryptGroupMessage,
      decryptGroupMessage,
      refreshGroupKey
    }}>
      {children}
    </E2EEContext.Provider>
  );
};
