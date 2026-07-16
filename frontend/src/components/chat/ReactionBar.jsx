import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReactionBar({ reactions = [], onReact, currentUserId }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1 mb-1.5 min-h-[24px]">
      <AnimatePresence>
        {reactions.map((reaction, i) => {
          const hasReacted = reaction.users.some(u => u === currentUserId || u._id === currentUserId);
          
          return (
            <motion.button
              key={reaction.emoji}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => onReact(reaction.emoji)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors border ${hasReacted ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-muted/50 border-transparent hover:border-border text-muted-foreground'}`}
            >
              <span>{reaction.emoji}</span>
              <span className="font-medium">{reaction.users.length}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
