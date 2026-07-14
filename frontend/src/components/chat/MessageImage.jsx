import React, { useState } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';

export function MessageImage({ attachment, message }) {
  const { fileUrl, error, isLoading } = useDecryptedMedia(attachment, message);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (error) {
    return (
      <div className="w-full h-48 bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center border border-red-500/50 max-w-xs mt-2">
        <span className="text-xs">🔒 Decryption Failed</span>
      </div>
    );
  }

  if (isLoading || !fileUrl) {
    return (
      <div className="w-full h-48 bg-slate-700 animate-pulse rounded-lg flex items-center justify-center mt-2 max-w-xs">
        <span className="text-slate-500 text-sm">Decrypting...</span>
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative rounded-lg overflow-hidden cursor-pointer group mt-2 max-w-xs border border-white/10"
        onClick={() => setIsFullscreen(true)}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-700 animate-pulse flex items-center justify-center z-0">
            <span className="text-slate-500 text-sm">Loading...</span>
          </div>
        )}
        <img 
          src={fileUrl} 
          alt={attachment.fileName || "Attachment"} 
          className={`w-full h-auto object-cover max-h-64 rounded-lg transition-opacity duration-300 relative z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
          <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
        </div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          >
            {/* Top Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
              <div className="text-white">
                <p className="font-semibold">{attachment.fileName}</p>
                <p className="text-xs text-white/70">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-4">
                <a 
                  href={fileUrl} 
                  download={attachment.fileName || 'image.jpg'}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Download Image"
                >
                  <Download className="w-6 h-6" />
                </a>
                <button 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={fileUrl} 
              alt="Fullscreen Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl mt-8"
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: 'zoom-in' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
