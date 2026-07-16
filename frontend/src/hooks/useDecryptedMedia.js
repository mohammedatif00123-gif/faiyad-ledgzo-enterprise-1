import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useE2EE } from '../context/E2EEContext';
import { decryptFile, decryptText, importAESKey } from '../utils/cryptoService';

// ─── MIME type lookup by extension ────────────────────────────────────────────
const EXT_TO_MIME = {
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  // Videos
  mp4: 'video/mp4', webm: 'video/webm',
  mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  // Audio
  mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
  flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4',
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
  '7z': 'application/x-7z-compressed',
};

// Fallback extension from MIME type
const MIME_TO_EXT = {
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

/**
 * Resolves a WhatsApp-style download filename:
 * 1. Always uses attachment.fileName (original name stored on upload).
 * 2. If fileName already has a valid extension → use as-is.
 * 3. If fileName has no extension → append one derived from mimeType.
 * 4. If fileName is missing entirely → derive from mimeType with generic base.
 * Never exposes Cloudinary public_ids or storage filenames.
 */
function resolveDownloadName(attachment, mimeType) {
  const fileName = attachment?.fileName || '';
  
  if (fileName) {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      // fileName already has an extension → use it directly
      return fileName;
    }
    // fileName has no extension → append from mimeType
    const ext = MIME_TO_EXT[mimeType] || (mimeType.split('/')[1]) || 'bin';
    return `${fileName}.${ext}`;
  }

  // No fileName at all → generic fallback from fileType + mimeType
  const ext = MIME_TO_EXT[mimeType] || (mimeType?.split('/')[1]) || 'bin';
  const base =
    attachment?.fileType === 'image' ? 'image' :
    attachment?.fileType === 'video' ? 'video' :
    attachment?.fileType === 'voice_note' ? 'voice_note' :
    attachment?.fileType === 'document' ? 'document' :
    'attachment';
  return `${base}.${ext}`;
}

/**
 * Detects MIME type from file extension in the fileName.
 * Falls back to fileType-based guess if extension is unknown.
 */
function detectMimeType(attachment) {
  const fileName = attachment?.fileName || '';
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0) {
    const ext = fileName.slice(lastDot + 1).toLowerCase();
    if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  }
  // fileType-based fallback
  if (attachment?.fileType === 'image') return 'image/jpeg';
  if (attachment?.fileType === 'video') return 'video/mp4';
  if (attachment?.fileType === 'voice_note') return 'audio/webm';
  if (attachment?.fileType === 'document') return 'application/octet-stream';
  return 'application/octet-stream';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

        const mimeType = detectMimeType(attachment);

        // ── Non-encrypted path ────────────────────────────────────────────────
        if (!attachment.metadata?.isEncrypted) {
          setFileUrl(getRawUrl(attachment.fileUrl));
          setResolvedFileName(resolveDownloadName(attachment, mimeType));
          setIsLoading(false);
          return;
        }

        // ── Encrypted path ────────────────────────────────────────────────────
        if (!isE2EEReady) {
          setError('E2EE not ready');
          setIsLoading(false);
          return;
        }

        const conv = conversations.find(c => c._id === message.conversation);
        let e2eeKey = null;

        if (conv?.type === 'direct') {
          const senderId = typeof message.sender === 'object'
            ? (message.sender._id || message.sender.id)
            : message.sender;
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
              partnerId = partner
                ? (typeof partner === 'object' ? (partner._id || partner.id) : partner)
                : null;
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

        // Decrypt file key
        const jwkString = await decryptText(e2eeKey, attachment.metadata.keyIv, attachment.metadata.encryptedKey);
        const jwk = JSON.parse(jwkString);
        const fileKey = await importAESKey(jwk);

        // Fetch encrypted blob
        const fileUrlToFetch = getRawUrl(attachment.fileUrl);
        const response = await fetch(fileUrlToFetch, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        // Decrypt file content (E2EE logic untouched)
        const decryptedBuffer = await decryptFile(fileKey, attachment.metadata.fileIv, arrayBuffer);

        // Create blob with correct MIME
        const blob = new Blob([decryptedBuffer], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);

        // Resolve download filename from original name stored in DB
        setResolvedFileName(resolveDownloadName(attachment, mimeType));
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
