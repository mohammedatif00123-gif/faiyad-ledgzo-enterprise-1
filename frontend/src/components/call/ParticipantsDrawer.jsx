import React, { useState } from 'react';
import { X, UserPlus, Mic, MicOff, Video, VideoOff, Hand } from 'lucide-react';
import { getAvatarUrl } from '../../utils/avatar';
import { AddParticipantModal } from './AddParticipantModal';
import { useSelector } from 'react-redux';

export function ParticipantsDrawer({ isOpen, onClose, activeCall, participantDetails }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const { participantStates } = useSelector(state => state.call);

  if (!isOpen) return null;

  const targetUserIds = activeCall?.participants || [];

  return (
    <>
      <div className="w-80 bg-gray-900 border-l border-white/10 flex flex-col h-full animate-in slide-in-from-right shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Participants</h3>
            <p className="text-xs text-white/60">{targetUserIds.length} people in call</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <div className="p-2 bg-primary/20 rounded-full">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Add Participant</span>
          </button>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">In Meeting</h4>
            {targetUserIds.map(id => {
              const details = participantDetails[id];
              const state = participantStates[id] || {};
              const isInitiator = id === activeCall?.initiatedBy;

              return (
                <div key={id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0 relative">
                      {details?.avatar ? (
                        <img src={getAvatarUrl(details.avatar)} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50 font-medium">
                          {details?.firstName?.[0] || '?'}
                        </div>
                      )}
                      {state.speaking && <div className="absolute inset-0 border-2 border-green-500 rounded-full animate-pulse" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        {details ? `${details.firstName} ${details.lastName}` : 'Connecting...'}
                        {isInitiator && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold">Host</span>}
                      </span>
                      <span className="text-xs text-white/50">{details?.department || state.connectionState}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-white/40">
                    {state.handRaised && <Hand className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    {state.videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                    {state.muted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddParticipantModal 
          activeCall={activeCall} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </>
  );
}
