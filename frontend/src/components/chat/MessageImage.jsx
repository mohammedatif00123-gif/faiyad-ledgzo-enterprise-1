import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MessageImage({ attachment }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // If using local uploads, ensure URL is properly formatted
  const getImageUrl = (url) => {
    if (url.startsWith('http')) return url;
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${backendUrl}${url}`;
  };

  const fileUrl = getImageUrl(attachment.fileUrl);

  return (
    <>
      <div 
        className="relative rounded-lg overflow-hidden cursor-pointer group mt-2 max-w-xs"
        onClick={() => setIsFullscreen(true)}
      >
        {!imageLoaded && (
          <div className="w-full h-48 bg-slate-700 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-slate-500 text-sm">Loading...</span>
          </div>
        )}
        <img 
          src={fileUrl} 
          alt="Attachment" 
          className={`w-full h-auto object-cover max-h-64 rounded-lg transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
        </div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={fileUrl} 
              alt="Fullscreen Preview" 
              className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
