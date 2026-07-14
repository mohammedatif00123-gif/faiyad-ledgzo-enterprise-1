import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { generateECDHKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey, importPublicKey, deriveSharedSecret, encryptText, decryptText } from '../utils/cryptoService';
import { storePrivateKey, getPrivateKey } from '../utils/keyStore';
import api from '../services/api';

const E2EEContext = createContext();

export const useE2EE = () => useContext(E2EEContext);

export const E2EEProvider = ({ children }) => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [isReady, setIsReady] = useState(false);
  const [privateKey, setPrivateKey] = useState(null);

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
        // Just take the first active device key for now
        const jwk = res.data.data[0].publicKey;
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
    const sharedSecret = await getSharedSecret(partnerId);
    if (!sharedSecret) throw new Error('Could not derive shared secret');

    return await decryptText(sharedSecret, iv, ciphertext);
  };

  // Group Keys Cache (Map of conversationId -> CryptoKey)
  const groupKeyCache = React.useRef(new Map());

  const getGroupKey = async (conversationId) => {
    if (groupKeyCache.current.has(conversationId)) {
      return groupKeyCache.current.get(conversationId);
    }

    try {
      // Fetch my encrypted group key from server for this conversation
      const res = await api.get(`/keys/group/${conversationId}`);
      if (res.data.success && res.data.data) {
        const { encryptedKey, creatorId } = res.data.data;
        // Decrypt the AES JWK using the shared secret with the creator
        const sharedSecret = await getSharedSecret(creatorId);
        if (!sharedSecret) throw new Error('Could not derive secret with group creator');

        const jwkString = await decryptText(sharedSecret, encryptedKey.iv, encryptedKey.ciphertext);
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

    return await decryptText(groupKey, iv, ciphertext);
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
      decryptGroupMessage
    }}>
      {children}
    </E2EEContext.Provider>
  );
};
