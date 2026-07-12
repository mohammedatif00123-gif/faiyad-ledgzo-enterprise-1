import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';

export function DeleteModal({ isOpen, onClose, onConfirm, mode, count }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5">
            <h3 className="text-lg font-semibold mb-2">
              Delete {count} {count === 1 ? 'message' : 'messages'}?
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {mode === 'delete_everyone' 
                ? 'This message will be deleted for everyone in this chat.'
                : 'This message will be deleted for you. Others can still see it.'}
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={onConfirm}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 
                {mode === 'delete_everyone' ? 'Delete for Everyone' : 'Delete for Me'}
              </button>
              <button 
                onClick={onClose}
                className="w-full flex items-center justify-center py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
