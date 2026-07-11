import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, VideoOff } from 'lucide-react';

export function FloatingLocalPreview({ stream, isVideoEnabled }) {
  const videoRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div 
      className={`absolute bottom-24 right-6 z-40 transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/20 bg-black cursor-move ${
        isMinimized ? 'w-48 h-32' : 'w-64 h-48 lg:w-80 lg:h-60'
      }`}
    >
      {isVideoEnabled ? (
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
          <VideoOff className="w-8 h-8 text-white/30 mb-2" />
          <span className="text-white/50 text-xs">Camera Off</span>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1.5 bg-black/50 backdrop-blur-sm rounded-lg hover:bg-black/80 text-white transition-colors"
        >
          {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-medium">
        You
      </div>
    </div>
  );
}
