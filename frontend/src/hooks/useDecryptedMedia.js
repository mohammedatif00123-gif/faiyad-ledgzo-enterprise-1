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
  const [resolvedFileName, setResolvedFileName] = useState(null);

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
            if (conv.partnerId) {
              partnerId = conv.partnerId;
            } else if (conv.participants) {
              const partner = conv.participants.find(p => {
                const pId = typeof p === 'object' ? (p._id || p.id) : p;
                return pId !== currentUserId;
              });
              partnerId = partner ? (typeof partner === 'object' ? (partner._id || partner.id) : partner) : null;
            } else {
              partnerId = null;
            }
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

        const fileUrlToFetch = getRawUrl(attachment.fileUrl);
        const response = await fetch(fileUrlToFetch, {
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        
        const decryptedBuffer = await decryptFile(fileKey, attachment.metadata.fileIv, arrayBuffer);
        
        // Detect MIME type from actual file extension
        const ext = attachment.fileName?.split('.').pop()?.toLowerCase() || '';
        const mimeMap = {
          // Images
          jpg: 'image/jpeg', jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          svg: 'image/svg+xml',
          bmp: 'image/bmp',
          // Videos
          mp4: 'video/mp4',
          webm: 'video/webm',
          mov: 'video/quicktime',
          avi: 'video/x-msvideo',
          // Audio
          mp3: 'audio/mpeg',
          ogg: 'audio/ogg',
          wav: 'audio/wav',
          // Documents
          pdf: 'application/pdf',
          doc: 'application/msword',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xls: 'application/vnd.ms-excel',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ppt: 'application/vnd.ms-powerpoint',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          txt: 'text/plain',
          zip: 'application/zip',
          rar: 'application/x-rar-compressed',
        };
        let mimeType = mimeMap[ext] || 'application/octet-stream';
        // Fallback from fileType if ext not recognized
        if (mimeType === 'application/octet-stream') {
          if (attachment.fileType === 'image') mimeType = 'image/jpeg';
          else if (attachment.fileType === 'video') mimeType = 'video/mp4';
          else if (attachment.fileType === 'voice_note') mimeType = 'audio/webm';
        }

        const blob = new Blob([decryptedBuffer], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);

        // Build a proper download filename with extension
        const extFromMime = {
          'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
          'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
          'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
          'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm',
          'application/pdf': 'pdf',
          'application/msword': 'doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
          'application/vnd.ms-excel': 'xls',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
          'text/plain': 'txt',
          'application/zip': 'zip',
        };
        const derivedExt = ext && mimeMap[ext] ? ext : (extFromMime[mimeType] || 'bin');
        const baseName = attachment.fileName
          ? attachment.fileName.replace(/\.[^/.]+$/, '') // strip existing ext if any
          : 'attachment';
        const cleanName = /^[a-z0-9]{20,}$/i.test(baseName) ? 'attachment' : baseName; // replace random Cloudinary IDs
        setResolvedFileName(`${cleanName}.${derivedExt}`);
        
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

  return { fileUrl, error, isLoading, resolvedFileName };
}
