import React from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, MonitorUp, Settings, Users, MessageSquare, Hand, Maximize } from 'lucide-react';

export function CallToolbar({ 
  isMuted, 
  isVideoEnabled, 
  isScreenSharing, 
  isHandRaised,
  onToggleMute, 
  onToggleVideo, 
  onToggleScreenShare, 
  onToggleHandRaise,
  onOpenSettings,
  onToggleParticipants,
  onToggleChat,
  onToggleFullscreen,
  onEndCall 
}) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 p-4 shrink-0 bg-black/40 backdrop-blur-md border-t border-white/10 w-full z-50">
      
      {/* Media Controls */}
      <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
        <button 
          onClick={onToggleMute}
          className={`p-3 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isMuted ? "Unmute (M)" : "Mute (M)"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        
        <button 
          onClick={onToggleVideo}
          className={`p-3 rounded-full transition-all ${!isVideoEnabled ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isVideoEnabled ? "Stop Video (V)" : "Start Video (V)"}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button 
          onClick={onToggleScreenShare}
          className={`p-3 rounded-full transition-all ${isScreenSharing ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          <MonitorUp className="w-5 h-5" />
        </button>
      </div>

      {/* End Call (Center Prominent) */}
      <button 
        onClick={onEndCall}
        className="mx-2 p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
        title="End Call (Esc)"
      >
        <Phone className="w-6 h-6 rotate-[135deg]" />
      </button>

      {/* Feature Controls */}
      <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 hidden sm:flex">
        <button 
          onClick={onToggleHandRaise}
          className={`p-3 rounded-full transition-all ${isHandRaised ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
          title={isHandRaised ? "Lower Hand" : "Raise Hand"}
        >
          <Hand className="w-5 h-5" />
        </button>

        <button 
          onClick={onToggleParticipants}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Participants"
        >
          <Users className="w-5 h-5" />
        </button>

        <button 
          onClick={onToggleChat}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-white/20 mx-1"></div>

        <button 
          onClick={onToggleFullscreen}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Fullscreen"
        >
          <Maximize className="w-5 h-5" />
        </button>

        <button 
          onClick={onOpenSettings}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
