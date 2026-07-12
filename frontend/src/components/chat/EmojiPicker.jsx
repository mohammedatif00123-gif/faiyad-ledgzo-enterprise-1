import React, { useState, useRef, useEffect } from 'react';
import Picker from 'emoji-picker-react';
import { Smile, Plus } from 'lucide-react';

export function EmojiPicker({ onEmojiSelect, isOwn }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowFullPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const predefinedEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  return (
    <div className="relative flex items-center" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none bg-white/50 dark:bg-black/20 backdrop-blur-sm"
      >
        <Smile className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 flex items-center gap-1 bg-background/95 backdrop-blur-md p-1.5 rounded-full shadow-lg border z-50`}>
          {predefinedEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onEmojiSelect(emoji); setIsOpen(false); }}
              className="w-8 h-8 flex items-center justify-center hover:bg-muted hover:scale-110 rounded-full transition-all text-xl"
            >
              {emoji}
            </button>
          ))}
          <div className="w-[1px] h-5 bg-border mx-1"></div>
          <button
            onClick={() => setShowFullPicker(!showFullPicker)}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full transition-all text-muted-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>

          {showFullPicker && (
            <div className={`absolute bottom-full ${isOwn ? 'right-0' : 'left-0'} mb-2 z-[60]`}>
              <Picker 
                onEmojiClick={(emojiData) => {
                  onEmojiSelect(emojiData.emoji);
                  setIsOpen(false);
                  setShowFullPicker(false);
                }} 
                theme="dark"
                width={300}
                height={400}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
