import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useE2EE } from '../context/E2EEContext';
import { decryptFile, decryptText, importAESKey } from '../utils/cryptoService';
import api from '../services/api';

export function useDecryptedMedia(attachment, message) {
  const { getSharedSecret, getGroupKey, isReady: isE2EEReady } = useE2EE();
  const { user } = useSelector(state => state.auth);
  const { conversations } = useSelector(state => state.chat);

  const [fileUrl, setFileUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const getRawUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${backendUrl}${url}`;
  };

  useEffect(() => {
    let objectUrl = null;

    const loadMedia = async () => {
      try {
        setIsLoading(true);
        if (!attachment || !message) return;

        if (!attachment.metadata?.isEncrypted) {
          setFileUrl(getRawUrl(attachment.fileUrl));
          setIsLoading(false);
          return;
        }

        if (!isE2EEReady) {
          setError('E2EE not ready');
          setIsLoading(false);
          return;
        }

        const conv = conversations.find(c => c._id === message.conversation);
        let e2eeKey = null;

        if (conv?.type === 'direct') {
          const senderId = typeof message.sender === 'object' ? (message.sender._id || message.sender.id) : message.sender;
          const currentUserId = user?._id || user?.id;
          
          let partnerId = senderId;
          if (senderId === currentUserId) {
            const partner = conv.participants.find(p => {
              const pId = typeof p === 'object' ? (p._id || p.id) : p;
              return pId !== currentUserId;
            });
            partnerId = partner ? (typeof partner === 'object' ? (partner._id || partner.id) : partner) : null;
          }
          
          if (partnerId) {
            e2eeKey = await getSharedSecret(partnerId);
          }
        } else {
          e2eeKey = await getGroupKey(message.conversation);
        }

        if (!e2eeKey) throw new Error('Could not get E2EE key for conversation');

        const jwkString = await decryptText(e2eeKey, attachment.metadata.keyIv, attachment.metadata.encryptedKey);
        const jwk = JSON.parse(jwkString);
        const fileKey = await importAESKey(jwk);

        const res = await api.get(attachment.fileUrl, { responseType: 'arraybuffer' });
        
        const decryptedBuffer = await decryptFile(fileKey, attachment.metadata.fileIv, res.data);
        
        let mimeType = 'application/octet-stream';
        if (attachment.fileType === 'image') mimeType = 'image/jpeg';
        else if (attachment.fileType === 'video') mimeType = 'video/mp4';
        else if (attachment.fileType === 'voice_note') mimeType = 'audio/webm';
        else if (attachment.fileName?.endsWith('.pdf')) mimeType = 'application/pdf';

        const blob = new Blob([decryptedBuffer], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);
        
        setFileUrl(objectUrl);
      } catch (err) {
        console.error('[E2EE] Failed to decrypt media:', err);
        setError('Failed to decrypt');
      } finally {
        setIsLoading(false);
      }
    };

    loadMedia();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, message, isE2EEReady, conversations, user]);

  return { fileUrl, error, isLoading };
}
