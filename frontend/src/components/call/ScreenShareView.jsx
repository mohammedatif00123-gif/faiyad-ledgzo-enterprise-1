import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Maximize, Minimize } from 'lucide-react';
import { getAvatarUrl } from '../../utils/avatar';

export function ScreenShareView({ 
  screenStream, 
  presenterId, 
  participantDetails, 
  participantStates,
  participants,
  remoteStreams,
  localStream,
  localUserId,
  isPreparing
}) {
  const mainVideoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainVideoRef.current.parentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    if (mainVideoRef.current && screenStream) {
      // Force a re-bind to ensure track replacements are caught
      mainVideoRef.current.srcObject = null;
      mainVideoRef.current.srcObject = screenStream;
      mainVideoRef.current.play().catch(e => console.error('[ScreenShareView] Autoplay failed:', e));
    }
  }, [screenStream]);

  const presenterDetails = participantDetails[presenterId] || (presenterId === localUserId ? { firstName: 'You' } : null);
  const presenterName = presenterDetails ? `${presenterDetails.firstName} ${presenterDetails.lastName || ''}`.trim() : 'Someone';

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row gap-4 p-4 min-h-0">
      
      {/* Main Screen Share Area */}
      <div className="flex-1 relative bg-black rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center group">
        {isPreparing ? (
          <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900/50">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-medium text-white">Preparing Screen Share...</h2>
            <p className="text-gray-400 mt-2">Waiting for screen selection</p>
          </div>
        ) : (
          <>
            <video 
              ref={mainVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full ${isFullscreen ? 'object-cover' : 'object-contain'}`}
            />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-lg">
              <p className="text-white font-medium text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {presenterName} is sharing their screen
              </p>
            </div>
            <button 
              onClick={toggleFullscreen}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </>
        )}
      </div>

      {/* Side Strip for Participants */}
      <div className="w-full lg:w-64 shrink-0 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto min-h-[120px]">
        {participants.filter(id => id !== presenterId).map(id => {
          const isLocal = id === localUserId;
          const stream = isLocal ? localStream : remoteStreams[id];
          const state = participantStates[id] || {};
          const details = participantDetails[id];
          const hasVideo = stream?.getVideoTracks().some(track => track.enabled);

          return (
            <div key={id} className={`relative w-40 lg:w-full h-28 lg:h-40 shrink-0 bg-gray-900 rounded-xl overflow-hidden border ${state?.speaking ? 'border-green-500' : 'border-white/10'}`}>
              <VideoRenderer stream={stream} isLocal={isLocal} hasVideo={hasVideo} details={details} />
              
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-white text-xs truncate max-w-[80%]">
                  {details ? details.firstName : (isLocal ? 'You' : 'Connecting')}
                </span>
                {state.muted && <MicOff className="w-3 h-3 text-red-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VideoRenderer = ({ stream, isLocal, hasVideo, details }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

  if (!hasVideo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
         {details?.avatar ? (
            <img src={getAvatarUrl(details.avatar)} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg text-white/50">
              {details?.firstName?.[0] || '?'}
            </div>
          )}
      </div>
    );
  }

  return (
    <video 
      ref={ref}
      autoPlay
      playsInline
      muted={isLocal}
      className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
    />
  );
};
