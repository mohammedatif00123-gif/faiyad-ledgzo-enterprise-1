import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Forward, Edit2, Trash2, Pin, Star, Bookmark, Info } from 'lucide-react';

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
      className="fixed z-50 w-52 bg-background/95 backdrop-blur-md border rounded-xl shadow-xl p-1.5 text-sm font-medium overflow-hidden"
    >
      <button onClick={() => handleAction('reply')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <MessageSquare className="w-4 h-4 text-muted-foreground" /> Reply
      </button>
      <button onClick={() => handleAction('thread')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <MessageSquare className="w-4 h-4 text-muted-foreground" /> Reply in Thread
      </button>
      <button onClick={() => handleAction('forward')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <Forward className="w-4 h-4 text-muted-foreground" /> Forward
      </button>
      
      <div className="h-px bg-border my-1.5 mx-2" />
      
      <button onClick={() => handleAction('pin')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <Pin className="w-4 h-4 text-muted-foreground" /> Pin Message
      </button>
      <button onClick={() => handleAction('bookmark')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <Bookmark className="w-4 h-4 text-muted-foreground" /> Star Message
      </button>

      <div className="h-px bg-border my-1.5 mx-2" />
      <button onClick={() => handleAction('info')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
        <Info className="w-4 h-4 text-muted-foreground" /> Message Info
      </button>

      {canEdit && (
        <>
          <div className="h-px bg-border my-1.5 mx-2" />
          <button onClick={() => handleAction('edit')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <Edit2 className="w-4 h-4 text-muted-foreground" /> Edit Message
          </button>
        </>
      )}
      
      {canDelete && (
        <button onClick={() => handleAction('delete_everyone')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors mt-1">
          <Trash2 className="w-4 h-4" /> Delete for Everyone
        </button>
      )}
      <button onClick={() => handleAction('delete_me')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
        <Trash2 className="w-4 h-4" /> Delete for Me
      </button>
    </motion.div>
  );
}
