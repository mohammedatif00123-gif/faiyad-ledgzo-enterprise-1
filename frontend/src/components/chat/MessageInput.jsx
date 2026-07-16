import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Paperclip, Smile, Send, Mic, AtSign, Code, Image as ImageIcon, Square, Trash2, X, Loader2, UploadCloud, Edit2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { saveDraft } from '../../store/slices/chatSlice';
import EmojiPicker from 'emoji-picker-react';
import api from '../../services/api';
import { useE2EE } from '../../context/E2EEContext';
import { generateAESKey, encryptFile, exportAESKey, encryptText } from '../../utils/cryptoService';
import { toast } from 'sonner';

// Lazy load MentionDropdown
const MentionDropdown = React.lazy(() => import('./MentionDropdown'));

export function MessageInput({ conversationId, onSend, onTyping, replyTo, onCancelReply, editingMessage, onEdit, onCancelEdit }) {
  const dispatch = useDispatch();
  const { drafts, conversations } = useSelector(state => state.chat);
  const { user } = useSelector(state => state.auth);
  const { isReady: isE2EEReady, getSharedSecret, encryptGroupMessage, encryptDirectMessage, getGroupKey } = useE2EE();
  const draftKey = `${conversationId}_${replyTo ? replyTo._id : 'root'}`;
  
  const [content, setContent] = useState(drafts[draftKey] || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Mentions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [mentionPosition, setMentionPosition] = useState({ bottom: 80, left: 20 });

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || '');
      textareaRef.current?.focus();
    } else {
      setContent(drafts[draftKey] || '');
    }
  }, [editingMessage, draftKey, drafts]);

  // Fetch employees for mentions
  useEffect(() => {
    api.get('/chat/directory').then(res => {
      setEmployees(res.data.data || []);
    }).catch(console.error);
  }, []);

  // Drag and Drop Window Listeners
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
    };
    const handleDragOver = (e) => {
      e.preventDefault();
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      if (e.relatedTarget === null) setIsDragging(false);
    };
    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files);
        const validFiles = [];
        newFiles.forEach(file => {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} exceeds the 10MB Cloudinary limit.`);
          } else {
            validFiles.push(file);
          }
        });
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Paste Listeners (Screenshots)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            // Rename pasted image
            const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        const validFiles = [];
        files.forEach(file => {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} exceeds the 10MB Cloudinary limit.`);
          } else {
            validFiles.push(file);
          }
        });
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autosave draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content.trim()) dispatch(saveDraft({ key: draftKey, content }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, conversationId, draftKey, dispatch]);

  // Voice recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleMentions = (value, cursorPosition) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setContent(val);
    handleMentions(val, e.target.selectionStart);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  const insertMention = (user) => {
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    
    // Replace the '@query' with '@FirstnameLastname '
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${user.firstName}${user.lastName} `);
    
    setContent(newTextBefore + textAfterCursor);
    setShowMentions(false);
    
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current.selectionStart = newTextBefore.length;
      textareaRef.current.selectionEnd = newTextBefore.length;
    }, 0);
  };

  const onEmojiClick = (emojiObject) => {
    setContent(prev => prev + emojiObject.emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setVoiceBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setVoiceBlob(null);
    } catch (err) {
      console.error('Error accessing microphone', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setVoiceBlob(null);
    setRecordingTime(0);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = [];
      newFiles.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds the 10MB Cloudinary limit.`);
        } else {
          validFiles.push(file);
        }
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim() && !voiceBlob && selectedFiles.length === 0) return;

    if (editingMessage) {
      if (onEdit) onEdit(editingMessage._id, content.trim());
      setContent('');
      if (onCancelEdit) onCancelEdit();
      return;
    }
    
    setIsUploading(true);
    let attachmentIds = [];
    let messageType = 'text';

    try {
      if (selectedFiles.length > 0 || voiceBlob) {
        const formData = new FormData();
        const conversation = conversations.find(c => c._id === conversationId);
        
        let e2eeKeyToUse = null; // Either a shared secret or a group CryptoKey
        let isDirect = conversation?.type === 'direct';

        if (isE2EEReady) {
           if (isDirect) {
             const participants = conversation?.participants || conversation?.users || [];
             const partner = participants.find(p => {
               const pId = typeof p === 'object' ? (p._id || p.id) : p;
               return pId !== (user?._id || user?.id);
             });
             const partnerId = partner ? (typeof partner === 'object' ? (partner._id || partner.id) : partner) : null;
             if (partnerId) {
                e2eeKeyToUse = await getSharedSecret(partnerId);
             }
           } else {
             e2eeKeyToUse = await getGroupKey(conversationId);
           }
        }

        const appendEncryptedFile = async (fileObj, originalName) => {
          let fileToUpload = fileObj;
          let metadata = {};
          
          if (isE2EEReady && e2eeKeyToUse) {
             try {
                // Generate random AES key for this file
                const randomFileKey = await generateAESKey();
                const arrayBuf = await fileObj.arrayBuffer();
                
                // Encrypt the file
                const encFile = await encryptFile(randomFileKey, arrayBuf);
                
                // Create a new Blob from the ciphertext
                fileToUpload = new Blob([encFile.ciphertext], { type: fileObj.type });
                
                // Export the random file key
                const jwk = await exportAESKey(randomFileKey);
                const jwkString = JSON.stringify(jwk);
                
                // Encrypt the random file key with the conversation E2EE key
                let encryptedKeyData;
                if (isDirect) {
                   encryptedKeyData = await encryptText(e2eeKeyToUse, jwkString); // e2eeKeyToUse is sharedSecret
                } else {
                   encryptedKeyData = await encryptText(e2eeKeyToUse, jwkString); // e2eeKeyToUse is groupKey (AES)
                }

                metadata = {
                  isEncrypted: true,
                  fileIv: encFile.iv,
                  encryptedKey: encryptedKeyData.ciphertext,
                  keyIv: encryptedKeyData.iv
                };
             } catch (err) {
                console.error('[E2EE] File encryption failed:', err);
             }
          }
          
          formData.append('files', fileToUpload, originalName);
          return metadata;
        };
        
        const metadataArray = [];

        if (selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            const meta = await appendEncryptedFile(file, file.name);
            metadataArray.push(meta);
          }
        }
        
        if (voiceBlob) {
          messageType = 'voice';
          const meta = await appendEncryptedFile(voiceBlob, 'voice_note.webm');
          meta.duration = recordingTime;
          metadataArray.push(meta);
        }

        formData.append('metadata', JSON.stringify(metadataArray)); // Send array of metadata

        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data.success) {
          attachmentIds = res.data.data.map(att => att._id);
        }
      }

      onSend({
        content: content.trim() || (voiceBlob ? '🎤 Voice message' : ''),
        attachments: attachmentIds,
        messageType: voiceBlob ? 'voice' : 'text'
      });

      setContent('');
      setSelectedFiles([]);
      setVoiceBlob(null);
      setRecordingTime(0);
      dispatch(saveDraft({ key: draftKey, content: '' }));
      if (onTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTyping(false);
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (showMentions) {
      const maxIndex = Math.min(4, employees.filter(user => 
        user.firstName.toLowerCase().includes(mentionQuery.toLowerCase()) || 
        user.lastName.toLowerCase().includes(mentionQuery.toLowerCase())
      ).length - 1);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, maxIndex));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const filtered = employees.filter(user => 
          user.firstName.toLowerCase().includes(mentionQuery.toLowerCase()) || 
          user.lastName.toLowerCase().includes(mentionQuery.toLowerCase())
        );
        if (filtered[mentionIndex]) {
          insertMention(filtered[mentionIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary m-4 rounded-xl">
          <div className="flex flex-col items-center gap-4 text-primary pointer-events-none">
            <UploadCloud className="w-16 h-16 animate-bounce" />
            <h2 className="text-2xl font-bold">Drop files here to upload</h2>
            <p className="text-muted-foreground">Support images, videos, audio, and documents (Up to 20MB)</p>
          </div>
        </div>
      )}

      <div className="flex flex-col border-t bg-background p-4 relative z-10">
        
        {/* React.Suspense for MentionDropdown */}
        {showMentions && (
          <React.Suspense fallback={<div className="absolute bottom-[80px] left-4 bg-background p-2 rounded shadow border text-xs">Loading...</div>}>
            <MentionDropdown 
              users={employees} 
              query={mentionQuery} 
              onSelect={insertMention}
              position={mentionPosition}
              selectedIndex={mentionIndex}
            />
          </React.Suspense>
        )}

        {editingMessage && (
          <div className="flex items-center justify-between bg-primary/10 p-2 rounded-t-md text-sm border-l-4 border-primary mb-1">
            <div className="truncate">
              <span className="font-semibold text-primary"><Edit2 className="w-3 h-3 inline mr-1" /> Edit Message: </span>
              <span className="text-muted-foreground">{editingMessage.content || 'Media Message'}</span>
            </div>
            <button type="button" onClick={onCancelEdit} className="text-muted-foreground hover:text-foreground">×</button>
          </div>
        )}

        {replyTo && (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-t-md text-sm border-l-4 border-primary">
            <div className="truncate">
              <span className="font-semibold">{replyTo.sender?.firstName}: </span>
              <span className="text-muted-foreground">{replyTo.content}</span>
            </div>
            <button type="button" onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">×</button>
          </div>
        )}

        {/* Selected Files Preview Queue */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/50 border px-3 py-1.5 rounded-md text-xs relative group">
                {isUploading && (
                  <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-md"></div>
                )}
                {f.type.startsWith('image/') && (
                  <img src={URL.createObjectURL(f)} alt="preview" className="w-6 h-6 object-cover rounded" />
                )}
                <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                <span className="text-[10px] text-muted-foreground">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
                {!isUploading && (
                  <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voice Blob Preview */}
        {voiceBlob && !isRecording && (
          <div className="flex items-center gap-2 mb-2 bg-muted p-2 rounded-md w-fit">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Voice Note ({formatTime(recordingTime)})</span>
            <button type="button" onClick={cancelRecording} className="text-muted-foreground hover:text-destructive ml-2"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-4 z-50 shadow-xl rounded-xl">
            <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
          </div>
        )}

        <form onSubmit={handleSubmit} className={`flex items-end gap-2 bg-muted/30 border ${replyTo ? 'rounded-b-xl border-t-0' : 'rounded-xl'} p-2 focus-within:ring-1 focus-within:ring-primary shadow-sm transition-all relative`}>
          
          <div className="flex items-center gap-1 text-muted-foreground pb-1">
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-full transition-colors ${showEmojiPicker ? 'text-primary' : ''}`} title="Emoji"><Smile className="w-5 h-5" /></button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-muted hover:text-foreground rounded-full transition-colors" title="Attach"><Paperclip className="w-5 h-5" /></button>
          </div>

          {isRecording ? (
            <div className="flex-1 flex items-center gap-4 h-[40px] px-4 animate-pulse text-destructive font-medium">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              Recording... {formatTime(recordingTime)}
              <button type="button" onClick={stopRecording} className="ml-auto bg-destructive/10 text-destructive p-1.5 rounded-full hover:bg-destructive/20"><Square className="w-4 h-4" fill="currentColor" /></button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              rows={1}
              className="flex-1 bg-background border rounded-lg focus:ring-0 text-sm resize-none max-h-[80px] min-h-[40px] py-2.5 px-3 custom-scrollbar"
            />
          )}
          
          <div className="flex items-center gap-1 pb-1">
            {!content.trim() && selectedFiles.length === 0 && !voiceBlob ? (
              <button type="button" onClick={startRecording} disabled={isRecording} className={`p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors ${isRecording ? 'text-destructive' : 'text-muted-foreground'}`} title="Voice note"><Mic className="w-5 h-5" /></button>
            ) : (
              <button 
                type="submit" 
                disabled={isRecording || isUploading}
                className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
