import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Forward, Edit2, Trash2, Pin, Star, Bookmark } from 'lucide-react';

export function ChatContextMenu({ x, y, message, onClose, onAction, isOwn, role }) {
  if (!message) return null;

  const canEdit = isOwn;
  const canDelete = isOwn || role === 'Admin';
  
  const handleAction = (action) => {
    onAction(action, message);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ top: y, left: x }}
      className="fixed z-50 w-48 bg-card border rounded-md shadow-xl py-1 text-sm text-foreground overflow-hidden"
    >
      <button onClick={() => handleAction('reply')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors">
        <MessageSquare className="w-4 h-4" /> Reply
      </button>
      <button onClick={() => handleAction('thread')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors">
        <MessageSquare className="w-4 h-4" /> Reply in Thread
      </button>
      <button onClick={() => handleAction('forward')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors">
        <Forward className="w-4 h-4" /> Forward
      </button>
      
      <div className="h-px bg-border my-1" />
      
      <button onClick={() => handleAction('pin')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors">
        <Pin className="w-4 h-4" /> Pin Message
      </button>
      <button onClick={() => handleAction('bookmark')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors">
        <Bookmark className="w-4 h-4" /> Bookmark
      </button>

      {canEdit && (
        <>
          <div className="h-px bg-border my-1" />
          <button onClick={() => handleAction('edit')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Message
          </button>
        </>
      )}
      
      {canDelete && (
        <button onClick={() => handleAction('delete_everyone')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-destructive/10 text-destructive transition-colors">
          <Trash2 className="w-4 h-4" /> Delete for Everyone
        </button>
      )}
      <button onClick={() => handleAction('delete_me')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-destructive/10 text-destructive transition-colors">
        <Trash2 className="w-4 h-4" /> Delete for Me
      </button>
    </motion.div>
  );
}
