import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Forward, X, Search, Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Avatar } from '../ui/Avatar';

export function ForwardModal({ isOpen, onClose, onForward, count }) {
  const { conversations } = useSelector(state => state.chat);
  const [search, setSearch] = useState('');
  const [selectedConvs, setSelectedConvs] = useState([]);

  if (!isOpen) return null;

  const filteredConvs = conversations.filter(c => 
    c.type === 'direct' && 
    (
      (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.members || c.participants || [])?.some(m => (m.user?.firstName || m.firstName || '')?.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const handleToggle = (id) => {
    setSelectedConvs(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const getConvName = (c) => {
    if (c.type === 'direct') {
      const parts = c.members || c.participants || [];
      if (!parts.length) return c.name || 'Direct Message';
      const other = parts.find(m => (m.user?._id || m._id) !== (parts[0].user?._id || parts[0]._id)) || parts[0];
      return (other?.user?.firstName || other?.firstName || '') + ' ' + (other?.user?.lastName || other?.lastName || '');
    }
    return c.name;
  };

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
          className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Forward className="w-5 h-5 text-primary" /> Forward {count} message{count !== 1 ? 's' : ''}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b relative">
            <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
            {filteredConvs.map(conv => (
              <div 
                key={conv._id} 
                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                onClick={() => handleToggle(conv._id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar src={conv.avatar} alt={getConvName(conv)} fallback={getConvName(conv)?.[0]} className="w-10 h-10" />
                  <span className="font-medium text-sm">{getConvName(conv)}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedConvs.includes(conv._id) ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                  {selectedConvs.includes(conv._id) && <Check className="w-3 h-3" />}
                </div>
              </div>
            ))}
            {filteredConvs.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">No chats found</div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/20">
            <button 
              onClick={() => onForward(selectedConvs)}
              disabled={selectedConvs.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Forward className="w-4 h-4" /> 
              Forward to {selectedConvs.length} chat{selectedConvs.length !== 1 ? 's' : ''}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
