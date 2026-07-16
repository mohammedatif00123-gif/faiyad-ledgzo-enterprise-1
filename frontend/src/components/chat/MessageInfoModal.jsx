import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CheckCheck, Clock } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import api from '../../services/api';

export function MessageInfoModal({ isOpen, onClose, message, isGroup }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('read'); // 'read' or 'delivered'

  useEffect(() => {
    if (isOpen && message) {
      fetchInfo();
    }
  }, [isOpen, message]);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/messages/${message._id}/info`);
      setInfo(res.data.data);
    } catch (err) {
      console.error('Failed to fetch message info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !message) return null;

  const readBy = info?.readBy || [];
  const deliveredTo = info?.deliveredTo || [];
  // Exclude users who read it from the delivered list to avoid duplicates in UI
  const deliveredOnly = deliveredTo.filter(d => !readBy.find(r => r._id === d._id));

  const renderUser = (user) => (
    <div key={user._id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg">
      <Avatar src={user.avatar} alt={user.firstName} fallback={user.firstName?.[0]} className="w-10 h-10" />
      <div>
        <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );

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
          onClick={e => e.stopPropagation()}
          className="bg-background rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="flex items-center justify-between p-4 border-b bg-muted/20">
            <h3 className="font-semibold">Message Info</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b">
            <div className="text-sm bg-muted/50 p-3 rounded-lg break-words line-clamp-3">
              {message.isEncrypted ? '🔒 Encrypted message' : message.content}
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex justify-center items-center p-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isGroup ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex border-b">
                <button
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex justify-center items-center gap-2 ${activeTab === 'read' ? 'border-blue-500 text-blue-500' : 'border-transparent text-muted-foreground'}`}
                  onClick={() => setActiveTab('read')}
                >
                  <CheckCheck className="w-4 h-4" />
                  Read ({readBy.length})
                </button>
                <button
                  className={`flex-1 py-2.5 text-sm font-medium border-b-2 flex justify-center items-center gap-2 ${activeTab === 'delivered' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                  onClick={() => setActiveTab('delivered')}
                >
                  <Check className="w-4 h-4" />
                  Delivered ({deliveredOnly.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {activeTab === 'read' && (
                  readBy.length > 0 ? readBy.map(renderUser) : (
                    <div className="text-center p-4 text-sm text-muted-foreground">No one has read this yet</div>
                  )
                )}
                {activeTab === 'delivered' && (
                  deliveredOnly.length > 0 ? deliveredOnly.map(renderUser) : (
                    <div className="text-center p-4 text-sm text-muted-foreground">No pending deliveries</div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 p-4 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                {info?.status === 'read' ? (
                  <CheckCheck className="w-5 h-5 text-blue-500" />
                ) : (
                  <CheckCheck className="w-5 h-5 text-muted-foreground opacity-50" />
                )}
                <span className="font-medium">Read</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {['delivered', 'read'].includes(info?.status) ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Check className="w-5 h-5 text-muted-foreground opacity-50" />
                )}
                <span className="font-medium">Delivered</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
