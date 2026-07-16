import React, { useState, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useDecryptedMedia } from '../../hooks/useDecryptedMedia';

export function MessageImage({ attachment, message }) {
  const { fileUrl, error, isLoading, resolvedFileName } = useDecryptedMedia(attachment, message);
  const downloadName = resolvedFileName || attachment.fileName || 'attachment';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleClose = useCallback(() => {
    setIsFullscreen(false);
    setZoom(1);
    setRotation(0);
  }, []);

  const handleZoomIn = useCallback((e) => {
    e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback((e) => {
    e.stopPropagation();
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback((e) => {
    e.stopPropagation();
    setRotation(prev => (prev + 90) % 360);
  }, []);

  if (error) {
    return (
      <div className="w-full h-40 bg-red-900/20 text-red-400 rounded-xl flex items-center justify-center border border-red-500/30 max-w-xs mt-2">
        <span className="text-xs">🔒 Decryption Failed</span>
      </div>
    );
  }

  if (isLoading || !fileUrl) {
    return (
      <div className="w-full h-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl flex items-center justify-center mt-2 max-w-xs">
        <span className="text-slate-400 text-xs">Decrypting...</span>
      </div>
    );
  }

  const lightbox = isFullscreen && createPortal(
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: 'rgba(0,0,0,0.92)' }}
        onClick={handleClose}
      >
        {/* Top Bar */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col">
            <span className="text-white text-sm font-semibold truncate max-w-xs">
              {attachment.fileName || 'Image'}
            </span>
            {attachment.fileSize && (
              <span className="text-white/50 text-xs">
                {(attachment.fileSize / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              title="Rotate"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <a
              href={fileUrl}
            download={downloadName}
              title="Download"
              onClick={e => e.stopPropagation()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={handleClose}
              title="Close"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Area */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden p-4"
          onClick={handleClose}
        >
          <motion.img
            key={rotation}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: zoom, opacity: 1, rotate: rotation }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            src={fileUrl}
            alt={attachment.fileName || 'Image Preview'}
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
            style={{
              cursor: zoom > 1 ? 'move' : 'zoom-in',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
            }}
            draggable={false}
          />
        </div>

        {/* Bottom hint */}
        <div
          className="text-center py-2 text-white/30 text-xs shrink-0"
          onClick={e => e.stopPropagation()}
        >
          Click outside or press Esc to close
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      {/* Thumbnail */}
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group mt-2 border border-white/10 hover:border-white/20 transition-all"
        style={{ maxWidth: '280px' }}
        onClick={() => setIsFullscreen(true)}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center z-0 rounded-xl">
            <span className="text-slate-400 text-xs">Loading...</span>
          </div>
        )}
        <img
          src={fileUrl}
          alt={attachment.fileName || 'Attachment'}
          className={`w-full h-auto object-cover max-h-64 rounded-xl transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl z-10">
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-2.5">
            <ZoomIn className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {lightbox}
    </>
  );
}
