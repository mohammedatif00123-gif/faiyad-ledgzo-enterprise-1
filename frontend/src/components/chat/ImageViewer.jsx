import React, { useState, useEffect } from 'react';
import { X, Download, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog';

export default function ImageViewer({ src, alt, images = [], initialIndex = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = images.length > 0 ? images[currentIndex] : src;
  const currentAlt = images.length > 0 ? `Image ${currentIndex + 1}` : alt;

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const handleNext = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePrev = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-auto object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setIsOpen(true)}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-black/95 border-none flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Image Viewer</DialogTitle>
          
          <div className="absolute top-0 w-full p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/60 to-transparent">
            <span className="text-white/80 text-sm font-medium">
              {images.length > 1 ? `${currentIndex + 1} of ${images.length}` : 'Image Viewer'}
            </span>
            <div className="flex items-center gap-4 text-white">
              <button onClick={() => setScale(s => Math.min(s + 0.5, 4))} className="hover:text-primary transition-colors"><ZoomIn className="w-5 h-5" /></button>
              <button onClick={() => setScale(s => Math.max(s - 0.5, 0.5))} className="hover:text-primary transition-colors"><ZoomOut className="w-5 h-5" /></button>
              <a href={currentImage} download target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><Download className="w-5 h-5" /></a>
              <a href={currentImage} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors"><ExternalLink className="w-5 h-5" /></a>
              <button onClick={() => setIsOpen(false)} className="hover:text-primary transition-colors"><X className="w-6 h-6" /></button>
            </div>
          </div>

          <div 
            className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {images.length > 1 && (
              <button onClick={handlePrev} className="absolute left-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors">
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            <img
              src={currentImage}
              alt={currentAlt}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
              style={{ 
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              draggable={false}
            />

            {images.length > 1 && (
              <button onClick={handleNext} className="absolute right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors">
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
