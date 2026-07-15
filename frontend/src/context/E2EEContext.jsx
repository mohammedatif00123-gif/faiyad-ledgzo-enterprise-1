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

        if (storedJwk) {
          // We have it, load it
          const importedPrivKey = await importPrivateKey(storedJwk);
          setPrivateKey(importedPrivKey);
          console.log('[E2EE] Loaded existing private key from IndexedDB');
        } else {
          // 2. Generate new key pair
          console.log('[E2EE] Generating new ECDH key pair for user...');
          keyPair = await generateECDHKeyPair();
          
          // Export keys
          const pubJwk = await exportPublicKey(keyPair.publicKey);
          const privJwk = await exportPrivateKey(keyPair.privateKey);

          // Store private key locally
          await storePrivateKey(user._id || user.id, privJwk);
          setPrivateKey(keyPair.privateKey);

          // 3. Upload public key to server
          const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
          localStorage.setItem('deviceId', deviceId); // Ensure consistent device ID
          
          await api.post('/keys/upload', {
            deviceId,
            publicKey: pubJwk
          });
          console.log('[E2EE] Public key uploaded successfully');
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
        const currentUserId = user?._id || user?.id;
        
        if (partnerId === currentUserId) {
          const myDeviceId = localStorage.getItem('deviceId');
          const myKey = res.data.data.find(k => k.deviceId === myDeviceId);
          jwk = myKey ? myKey.publicKey : res.data.data[0].publicKey;
        } else {
          // Just take the first active device key for now
          jwk = res.data.data[0].publicKey;
        }
        
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

  // Group Keys Cache (Map of conversationId -> CryptoKey)
  const groupKeyCache = React.useRef(new Map());

  const getGroupKey = async (conversationId) => {
    if (groupKeyCache.current.has(conversationId)) {
      return groupKeyCache.current.get(conversationId);
    }

    try {
      const res = await api.get(`/keys/group/${conversationId}`);
      if (res.data.success && res.data.data) {
        const { encryptedKey, creatorId } = res.data.data;
        
        const sharedSecrets = await getAllSharedSecrets(creatorId);
        if (!sharedSecrets || sharedSecrets.length === 0) throw new Error('Could not derive any secret with group creator');

        let jwkString = null;
        for (const secret of sharedSecrets) {
          try {
            jwkString = await decryptText(secret, encryptedKey.iv, encryptedKey.ciphertext);
            break; // Success!
          } catch (e) {
            console.warn('[E2EE] A secret failed to decrypt group key:', e);
            // Ignore and try next secret
          }
        }
        
        if (!jwkString) {
          console.error('[E2EE] FATAL: Failed to decrypt group key with any of the creator\'s public keys. creatorId:', creatorId, 'sharedSecrets count:', sharedSecrets.length, 'encryptedKey:', encryptedKey);
          throw new Error("Failed to decrypt group key with any of the creator's public keys");
        }

        const jwk = JSON.parse(jwkString);
        const cryptoKey = await importAESKey(jwk);
        
        groupKeyCache.current.set(conversationId, cryptoKey);
        return cryptoKey;
      }
    } catch (err) {
      console.error('[E2EE] Failed to get group key for', conversationId, err);
    }
    return null;
  };

  const refreshGroupKey = async (conversationId) => {
    groupKeyCache.current.delete(conversationId);
    return await getGroupKey(conversationId);
  };

  const encryptGroupMessage = async (plaintext, conversationId) => {
    if (!isReady) throw new Error('E2EE not ready');
    const groupKey = await getGroupKey(conversationId);
    if (!groupKey) throw new Error('No group key available');

    const { iv, ciphertext } = await encryptText(groupKey, plaintext);
    return { ciphertext, iv };
  };

  const decryptGroupMessage = async (ciphertext, iv, conversationId) => {
    if (!isReady) throw new Error('E2EE not ready');
    const groupKey = await getGroupKey(conversationId);
    if (!groupKey) throw new Error('No group key available');

    try {
      return await decryptText(groupKey, iv, ciphertext);
    } catch (err) {
      console.error('[E2EE] Failed to decrypt group message content:', err, 'ciphertext:', ciphertext.substring(0, 20) + '...', 'iv:', iv);
      throw err;
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
