import React, { useEffect, useRef } from 'react';
import { MicOff, User, Hand } from 'lucide-react';
import { getAvatarUrl } from '../../utils/avatar';

const VideoTile = ({ stream, isLocal, userDetails, state, label }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some(track => track.enabled);

  return (
    <div className={`relative w-full h-full bg-black/50 rounded-2xl overflow-hidden border ${state?.speaking ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/10'}`}>
      
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent echo
        className={`w-full h-full object-cover transition-opacity duration-300 ${hasVideo ? 'opacity-100' : 'opacity-0'} ${isLocal ? 'scale-x-[-1]' : ''}`}
      />

      {/* Avatar Fallback (when video is off) */}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border-4 border-white/10">
            {userDetails?.avatar ? (
              <img src={getAvatarUrl(userDetails.avatar)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-white/50 font-medium">{userDetails?.firstName?.[0] || '?'}</span>
            )}
          </div>
        </div>
      )}

      {/* Status Overlays */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-[80%]">
          <span className="text-white text-sm font-medium truncate">
            {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : label} {isLocal && '(You)'}
          </span>
          {state?.connectionState === 'connecting' && (
            <span className="text-white/50 text-xs italic">Connecting...</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {state?.handRaised && (
            <div className="bg-yellow-500/90 backdrop-blur-sm p-1.5 rounded-lg shadow-lg">
              <Hand className="w-4 h-4 text-white fill-white" />
            </div>
          )}
          {state?.muted && (
            <div className="bg-red-500/90 backdrop-blur-sm p-1.5 rounded-lg shadow-lg">
              <MicOff className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function ParticipantGrid({ participants, localStream, remoteStreams, participantStates, participantDetails, localUserId }) {
  
  // Calculate grid layout based on number of participants
  const count = participants.length;
  let gridClass = 'grid-cols-1'; // Default

  if (count === 2) gridClass = 'grid-cols-1 sm:grid-cols-2';
  else if (count === 3 || count === 4) gridClass = 'grid-cols-2';
  else if (count >= 5 && count <= 6) gridClass = 'grid-cols-2 sm:grid-cols-3';
  else if (count >= 7) gridClass = 'grid-cols-3 sm:grid-cols-4';

  return (
    <div className="flex-1 w-full p-4 flex items-center justify-center min-h-0">
      <div className={`w-full h-full max-w-[1400px] grid gap-4 ${gridClass} auto-rows-fr`}>
        {participants.map(id => {
          const isLocal = id === localUserId;
          const stream = isLocal ? localStream : remoteStreams[id];
          const state = participantStates[id] || {};
          const details = participantDetails[id];

          return (
            <VideoTile 
              key={id}
              stream={stream}
              isLocal={isLocal}
              userDetails={details}
              state={state}
              label={isLocal ? "You" : "Connecting..."}
            />
          );
        })}
      </div>
    </div>
  );
}
