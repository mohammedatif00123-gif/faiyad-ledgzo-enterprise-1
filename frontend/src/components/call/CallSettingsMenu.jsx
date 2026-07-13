import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, MonitorUp, Camera } from 'lucide-react';
import { createPortal } from 'react-dom';

export function CallSettingsMenu({ 
  onClose,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isSpeaker,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSpeaker,
  onFlipCamera
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 w-full sm:w-80 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-semibold text-white">Call Settings</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2 flex flex-col">
          <button 
            onClick={() => { onToggleVideo(); onClose(); }}
            className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors text-left"
          >
            <div className={`p-2 rounded-full ${!isVideoEnabled ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white'}`}>
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-medium text-white">{isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}</div>
              <div className="text-xs text-white/50">Enable or disable your video</div>
            </div>
          </button>

          <button 
            onClick={() => { onToggleMute(); onClose(); }}
            className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors text-left"
          >
            <div className={`p-2 rounded-full ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white'}`}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-medium text-white">{isMuted ? 'Unmute Microphone' : 'Mute Microphone'}</div>
              <div className="text-xs text-white/50">Enable or disable your audio</div>
            </div>
          </button>

          <button 
            onClick={() => { onToggleSpeaker?.(); onClose(); }}
            className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors text-left"
          >
            <div className={`p-2 rounded-full ${!isSpeaker ? 'bg-white/10 text-white' : 'bg-primary/20 text-primary'}`}>
              {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-medium text-white">{isSpeaker ? 'Speaker On' : 'Speaker Off'}</div>
              <div className="text-xs text-white/50">Toggle loud speaker</div>
            </div>
          </button>

          <button 
            onClick={() => { onFlipCamera?.(); onClose(); }}
            className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors text-left"
          >
            <div className="p-2 rounded-full bg-white/10 text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-white">Flip Camera</div>
              <div className="text-xs text-white/50">Switch front/back camera</div>
            </div>
          </button>

          <button 
            onClick={() => { onToggleScreenShare(); onClose(); }}
            className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-xl transition-colors text-left"
          >
            <div className={`p-2 rounded-full ${isScreenSharing ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}`}>
              <MonitorUp className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-white">{isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}</div>
              <div className="text-xs text-white/50">Share your screen with others</div>
            </div>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
